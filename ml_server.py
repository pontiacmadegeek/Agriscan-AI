"""
AgriScan AI - Plant Disease Classification Server
FastAPI server that runs the PyTorch model locally.
Exposes POST /predict endpoint for the Express backend to call.
"""

import io
import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# ─────────────────────────────────────────────────────────────────────────────
# CLASS NAMES (27 classes from PlantDoc dataset)
# Order MUST match the order used during training
# ─────────────────────────────────────────────────────────────────────────────
CLASS_NAMES = [
    "Apple_Scab_Leaf",
    "Apple_leaf",
    "Apple_rust_leaf",
    "Bell_pepper_leaf",
    "Bell_pepper_leaf_spot",
    "Blueberry_leaf",
    "Cherry_leaf",
    "Corn_Gray_leaf_spot",
    "Corn_leaf_blight",
    "Peach_leaf",
    "Potato_leaf_early_blight",
    "Potato_leaf_late_blight",
    "Raspberry_leaf",
    "Soyabean_leaf",
    "Squash_Powdery_mildew_leaf",
    "Strawberry_leaf",
    "Tomato_Early_blight_leaf",
    "Tomato_Septoria_leaf_spot",
    "Tomato_leaf",
    "Tomato_leaf_bacterial_spot",
    "Tomato_leaf_late_blight",
    "Tomato_leaf_mosaic_virus",
    "Tomato_leaf_yellow_virus",
    "Tomato_mold_leaf",
    "Tomato_two_spotted_spider_mites_leaf",
    "grape_leaf",
    "grape_leaf_black_rot",
]

NUM_CLASSES = len(CLASS_NAMES)
MODEL_PATH = "model.pth"
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ─────────────────────────────────────────────────────────────────────────────
# IMAGE PREPROCESSING
# Must match the transforms used during training
# ─────────────────────────────────────────────────────────────────────────────
preprocess = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],   # ImageNet means
        std=[0.229, 0.224, 0.225]     # ImageNet stds
    ),
])

# ─────────────────────────────────────────────────────────────────────────────
# LOAD MODEL
# ─────────────────────────────────────────────────────────────────────────────
def load_model():
    print(f"[ML Server] Loading MobileNetV2 model on {DEVICE}...")
    try:
        checkpoint = torch.load(MODEL_PATH, map_location=DEVICE)

        if isinstance(checkpoint, dict):
            # It's a state_dict checkpoint
            if "model_state_dict" in checkpoint:
                state_dict = checkpoint["model_state_dict"]
            elif "state_dict" in checkpoint:
                state_dict = checkpoint["state_dict"]
            else:
                state_dict = checkpoint

            # Detect number of output classes from the classifier layer
            detected_classes = None
            for k in reversed(list(state_dict.keys())):
                if "weight" in k and ("classifier" in k or "fc" in k):
                    detected_classes = state_dict[k].shape[0]
                    break

            num_out = detected_classes if detected_classes else NUM_CLASSES
            print(f"[ML Server] Detected {num_out} output classes in model.")

            # Build MobileNetV2 architecture
            model = models.mobilenet_v2(weights=None)
            # Replace classifier head to match trained output size
            model.classifier[1] = nn.Linear(model.last_channel, num_out)
            model.load_state_dict(state_dict, strict=False)
        else:
            # Fully saved model object
            model = checkpoint
            print("[ML Server] Loaded full model object.")

        model.to(DEVICE)
        model.eval()
        print("[ML Server] MobileNetV2 model loaded and ready!")
        return model

    except Exception as e:
        print(f"[ML Server] ERROR loading model: {e}")
        raise RuntimeError(f"Failed to load model: {e}")



model = load_model()

# ─────────────────────────────────────────────────────────────────────────────
# FASTAPI APP
# ─────────────────────────────────────────────────────────────────────────────
app = FastAPI(title="AgriScan ML Server", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "status": "running",
        "message": "AgriScan ML Server is live",
        "classes": NUM_CLASSES,
        "device": str(DEVICE)
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    """
    Accepts a leaf image and returns:
    - predicted_class: human-readable class name
    - confidence: confidence score (0.0 - 1.0)
    - top3: top 3 predictions with scores
    """
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    try:
        # Read and preprocess the image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        input_tensor = preprocess(image).unsqueeze(0).to(DEVICE)

        # Run inference
        with torch.no_grad():
            outputs = model(input_tensor)
            probabilities = torch.softmax(outputs, dim=1)[0]

        # Get top prediction
        confidence, predicted_idx = torch.max(probabilities, 0)
        predicted_idx = predicted_idx.item()
        confidence = confidence.item()

        # Get class name safely
        if predicted_idx < len(CLASS_NAMES):
            predicted_class = CLASS_NAMES[predicted_idx]
        else:
            predicted_class = f"Unknown_Class_{predicted_idx}"

        # Get top 3 predictions
        top3_values, top3_indices = torch.topk(probabilities, min(3, len(CLASS_NAMES)))
        top3 = [
            {
                "class": CLASS_NAMES[idx.item()] if idx.item() < len(CLASS_NAMES) else f"Class_{idx.item()}",
                "confidence": round(val.item() * 100, 2)
            }
            for val, idx in zip(top3_values, top3_indices)
        ]

        # Format the class name nicely for display
        display_name = predicted_class.replace("_", " ").strip()

        return {
            "predicted_class": predicted_class,
            "display_name": display_name,
            "confidence": round(confidence * 100, 2),
            "top3": top3,
            "status": "success"
        }

    except Exception as e:
        print(f"[ML Server] Prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("[ML Server] Starting AgriScan ML Server on port 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
