import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

dotenv.config();

import { db } from "./src/db/index.ts";
import { users, portfolios, storageFiles } from "./src/db/schema.ts";
import { getOrCreateUser } from "./src/db/users.ts";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { eq, desc, and } from "drizzle-orm";

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "agriscan_jwt_secret_key_2026_secure";

// High limit to support uploading images
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

// Initialize GenAI Client if key exists
let ai: GoogleGenAI | null = null;
const API_KEY = process.env.GEMINI_API_KEY;

if (API_KEY && API_KEY !== "MY_GEMINI_API_KEY") {
  try {
    ai = new GoogleGenAI({
      apiKey: API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    console.log("Gemini API initialized successfully!");
  } catch (error) {
    console.error("Failed to initialize Gemini API Client:", error);
  }
} else {
  console.warn("No valid GEMINI_API_KEY found in environment. Using fallback mode for mock-diagnostics.");
}

// REST route for testing
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", apiInitialized: ai !== null });
});

// Auto-run migration to add auth columns if not present
async function runMigration() {
  try {
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name text DEFAULT ''`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text`);
    try {
      await db.execute(sql`ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email)`);
    } catch (_) { /* constraint already exists */ }
    console.log("DB migration: auth columns ready.");
  } catch (err: any) {
    console.error("DB migration failed:", err.message);
  }
}
runMigration();



// ─── Custom Auth Endpoints (Postgres-backed, no Firebase) ────────────────────

// POST /api/auth/register — create a new account
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, fullName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    // Check if email already exists
    const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    if (existing.length > 0) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const uid = crypto.randomUUID();

    await db.insert(users).values({
      uid,
      email: email.toLowerCase(),
      fullName: fullName || email.split("@")[0],
      passwordHash,
    });

    const token = jwt.sign({ uid, email: email.toLowerCase(), fullName: fullName || email.split("@")[0] }, JWT_SECRET, { expiresIn: "30d" });
    return res.json({ token, uid, email: email.toLowerCase(), fullName: fullName || email.split("@")[0] });
  } catch (err: any) {
    console.error("Register error:", err);
    return res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

// POST /api/auth/login — sign in with email + password
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const result = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    if (result.length === 0) {
      return res.status(401).json({ error: "No account found with this email. Please register first." });
    }

    const user = result[0];
    if (!user.passwordHash) {
      return res.status(401).json({ error: "This account uses a different login method." });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Incorrect password. Please try again." });
    }

    const token = jwt.sign({ uid: user.uid, email: user.email, fullName: user.fullName }, JWT_SECRET, { expiresIn: "30d" });
    return res.json({ token, uid: user.uid, email: user.email, fullName: user.fullName });
  } catch (err: any) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// POST /api/auth/social - sign in or register with social provider
app.post("/api/auth/social", async (req, res) => {
  try {
    const { uid, email, fullName } = req.body;
    if (!uid) {
      return res.status(400).json({ error: "Missing user ID." });
    }
    
    // Ensure the user exists in the local database
    await getOrCreateUser(uid, email || "");
    
    // Generate our backend JWT for the session
    const token = jwt.sign({ uid, email, fullName }, JWT_SECRET, { expiresIn: "30d" });
    return res.json({ token, uid, email, fullName });
  } catch (err: any) {
    console.error("Social login error:", err);
    return res.status(500).json({ error: "Social login failed." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────


// Sync User from Firebase Login State to Cloud SQL users table
app.post("/api/users/sync", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userUid = req.user!.uid;
    const email = req.user!.email || "";
    const syncedUser = await getOrCreateUser(userUid, email);
    res.json({ status: "success", user: syncedUser });
  } catch (error: any) {
    console.error("Error in /api/users/sync:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/change-password — update password for logged-in user
app.post("/api/auth/change-password", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.update(users).set({ passwordHash }).where(eq(users.uid, req.user!.uid));
    return res.json({ success: true });
  } catch (err: any) {
    console.error("Change password error:", err);
    return res.status(500).json({ error: "Failed to update password." });
  }
});

// Retrieve all portfolios for the logged-in user
app.get("/api/portfolios", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userUid = req.user!.uid;
    const results = await db.select()
      .from(portfolios)
      .where(eq(portfolios.ownerId, userUid))
      .orderBy(desc(portfolios.createdAt));
    res.json(results);
  } catch (error: any) {
    console.error("Error in GET /api/portfolios:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new crop portfolio
app.post("/api/portfolios", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userUid = req.user!.uid;
    const { id, name, lastScan, status, image, healthScore, moisture, estYield, scienceName, growthStage, statsHistory, activities, scanHistory, growthLogs } = req.body;
    
    if (!id || !name) {
       return res.status(400).json({ error: "Missing required portfolio fields (id and name are mandatory)" });
    }

    const result = await db.insert(portfolios)
      .values({
        id,
        ownerId: userUid,
        name,
        lastScan: lastScan || "",
        status: status || "Healthy",
        image: image || "",
        healthScore: healthScore !== undefined ? healthScore : 100,
        moisture: moisture !== undefined ? moisture : 50,
        estYield: estYield || "",
        scienceName: scienceName || "",
        growthStage: growthStage || "Seedling",
        statsHistory: statsHistory || [],
        activities: activities || [],
        scanHistory: scanHistory || [],
        growthLogs: growthLogs || []
      })
      .returning();

    res.json(result[0]);
  } catch (error: any) {
    console.error("Error in POST /api/portfolios:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update a specific crop portfolio
app.put("/api/portfolios/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userUid = req.user!.uid;
    const portfolioId = req.params.id;
    const { name, lastScan, status, image, healthScore, moisture, estYield, scienceName, growthStage, statsHistory, activities, scanHistory, growthLogs } = req.body;

    const result = await db.update(portfolios)
      .set({
        name,
        lastScan,
        status,
        image,
        healthScore,
        moisture,
        estYield,
        scienceName,
        growthStage,
        statsHistory,
        activities,
        scanHistory,
        growthLogs
      })
      .where(and(eq(portfolios.id, portfolioId), eq(portfolios.ownerId, userUid)))
      .returning();

    if (!result.length) {
      return res.status(404).json({ error: "Portfolio not found or unauthorized to update" });
    }

    res.json(result[0]);
  } catch (error: any) {
    console.error("Error in PUT /api/portfolios/:id:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a specific crop portfolio
app.delete("/api/portfolios/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userUid = req.user!.uid;
    const portfolioId = req.params.id;

    const result = await db.delete(portfolios)
      .where(and(eq(portfolios.id, portfolioId), eq(portfolios.ownerId, userUid)))
      .returning();

    if (!result.length) {
      return res.status(404).json({ error: "Portfolio not found or unauthorized to delete" });
    }

    res.json({ success: true, deleted: result[0] });
  } catch (error: any) {
    console.error("Error in DELETE /api/portfolios/:id:", error);
    res.status(500).json({ error: error.message });
  }
});

// Upload media file to Supabase Cloud SQL storage bucket
app.post("/api/storage/upload", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userUid = req.user!.uid;
    const { fileName, mimeType, fileData } = req.body;

    if (!fileName || !mimeType || !fileData) {
      return res.status(400).json({ error: "Missing uploaded file components (fileName, mimeType, and fileData are required)" });
    }

    const fileId = "file_" + Math.random().toString(36).substring(2, 15);
    
    await db.insert(storageFiles)
      .values({
        id: fileId,
        fileName,
        mimeType,
        fileData,
        ownerId: userUid
      })
      .execute();

    res.json({ url: `/api/storage/file/${fileId}`, fileId });
  } catch (error: any) {
    console.error("Error in POST /api/storage/upload:", error);
    res.status(500).json({ error: error.message });
  }
});

// Retrieve public media photo from storage bucket
app.get("/api/storage/file/:id", async (req, res) => {
  try {
    const fileId = req.params.id;
    const results = await db.select()
      .from(storageFiles)
      .where(eq(storageFiles.id, fileId))
      .execute();

    if (!results.length) {
      return res.status(404).send("File not found in storage bucket");
    }

    const file = results[0];
    let cleanBase64 = file.fileData;
    if (cleanBase64.startsWith("data:")) {
      cleanBase64 = cleanBase64.split(",")[1];
    }
    
    const imageBuffer = Buffer.from(cleanBase64, "base64");
    res.setHeader("Content-Type", file.mimeType);
    res.send(imageBuffer);
  } catch (error: any) {
    console.error("Error in GET /api/storage/file/:id:", error);
    res.status(500).send("Storage retrieval failed: " + error.message);
  }
});

// Helper for high-fidelity offline agronomy heuristics simulation
function runOfflineSimulation(cropType: string | undefined, language: string | undefined) {
  const crop = (cropType || "Crop").trim();
  const lowerCrop = crop.toLowerCase();
  const lang = language || "English (US)";

  let healthStatus = "Warning";
  let pestOrDisease = "Common Leaf Spot";
  let severity = "Medium";
  let description = `A clear visual assessment of the ${crop} specimen reveals minor diagnostic changes. The lower leaves are exhibiting slight yellowing (chlorosis) along the margins, likely indicating localized nutrient competition or transient moisture stress. No severe pathogenic spread is currently observed.`;
  let solutions = [
    `Adjust the irrigation schedule of the ${crop} plot to ensure deep water delivery during cool early morning hours.`,
    "Apply well-composted organic mulch around the root base to boost organic matter and improve moisture retention.",
    "Monitor carefully over the next 48-72 hours for any leaf margin necrosis or expanding visual symptoms."
  ];
  let cropName = crop;

  // New fields matching the high-fidelity pathology mock
  let botanicalName = "Specimen Plantae";
  let plantFamily = "General Flora";
  let confidence = "80%";
  let healthScore = 70;
  let aboutPlant = "An agricultural or ornamental crop specimen undergoing active leaf pathology scanning and diagnostics.";
  let pruningTips = [
    "Trim withered or chlorotic leaves promptly to optimize plant energy.",
    "Prune crowding branches to maintain high airflow and clear canopy illumination.",
    "Cut back dead flower stalks to encourage new vegetative flushes."
  ];
  let careTips = [
    "Ensure the soil drains fully between watering intervals to guard roots.",
    "Position in a location with ample natural indirect sunlight for high rates of photosynthesis.",
    "Apply a slow-release organic compound fertilizer seasonally."
  ];

  if (lang === "Español (ES)") {
    pestOrDisease = "Mancha Foliar Común";
    description = `Un análisis visual claro muestra cambios de diagnóstico menores en la hoja de ${crop}. Las hojas inferiores exhiben un ligero amarillamiento (clorosis) en los bordes, lo que indica competencia de nutrientes o estrés por riego temporal.`;
    solutions = [
      `Ajuste el riego del lote de ${crop} para proporcionar agua profunda en las primeras horas de la mañana.`,
      "Aplique mantillo orgánico compostado para retener la humedad.",
      "Monitoree los bordes de las hojas para detectar síntomas que se expandan."
    ];
    plantFamily = "Flora General";
    aboutPlant = "Un espécimen de cultivo agrícola u ornamental sometido a análisis y diagnóstico de patología foliar.";
    pruningTips = [
      "Retire las hojas marchitas o amarillentas rápidamente para conservar energía.",
      "Pode las ramas apiñadas para mejorar la circulación de aire.",
      "Corte los tallos de flores secas para incentivar brotes nuevos."
    ];
    careTips = [
      "Asegúrese de que el suelo drene completamente entre riegos.",
      "Ubique la planta en un lugar con abundante luz solar indirecta.",
      "Aplique fertilizante orgánico equilibrado por temporadas."
    ];
  } else if (lang === "Français (FR)") {
    pestOrDisease = "Tache Foliaire Commune";
    description = `Une évaluation visuelle claire montre des changements diagnostiques mineurs sur la feuille de ${crop}. Les feuilles inférieures présentent un léger jaunissement (chlorose) le long des marges, indiquant probablement une compétition nutritionnelle ou un stress hydrique.`;
    solutions = [
      `Ajustez l'irrigation de la parcelle de ${crop} pour un arrosage en profondeur tôt le matin.`,
      "Appliquez du paillis organique de compost pour retenir l'humidité.",
      "Surveillez les marges des feuilles pour repérer les symptômes en expansion."
    ];
    plantFamily = "Flore Générale";
    aboutPlant = "Un spécimen de culture agricole ou ornementale soumis à une analyse et à un diagnostic de pathologie de feuillage.";
    pruningTips = [
      "Taillez rapidement les feuilles flétries ou chlorotiques.",
      "Pincez les branches surchargées pour favoriser la circulation de l'air.",
      "Coupez les tiges de fleurs mortes pour encourager de nouvelles pousses."
    ];
    careTips = [
      "Veillez à ce que le sol draine complètement entre les arrosages.",
      "Placez à un endroit bénéficiant d'une lumière solaire indirecte abondante.",
      "Appliquez de l'engrais organique équilibré de façon saisonnière."
    ];
  }
  
  if (lowerCrop.includes("tomato")) {
    healthStatus = "Infected";
    severity = "High";
    cropName = "Tomato";
    botanicalName = "Solanum lycopersicum";
    plantFamily = "Solanaceae";
    confidence = "85%";
    healthScore = 40;

    if (lang === "Español (ES)") {
      pestOrDisease = "Tizón Temprano de la Tomatera";
      cropName = "Tomate";
      description = "El examen visual de las hojas de tomate muestra las clásicas lesiones de anillos concéntricos de color marrón con halos amarillos. Esto indica una infección por tizón temprano (Alternaria solani), que afecta principalmente al follaje inferior en condiciones de humedad.";
      solutions = [
        "Pode las hojas inferiores muy infectadas para aumentar la ventilación del dosel.",
        "Aplique fungicida orgánico a base de cobre según las instrucciones correspondientes.",
        "Riegue la planta estrictamente al nivel del suelo en lugar de mojar el follaje."
      ];
      aboutPlant = "El tomate es una planta anual muy popular de la familia Solanaceae cultivada por su delicioso fruto. Generalmente produce un follaje verde denso y pequeñas flores amarillas.";
      pruningTips = [
        "Retire los brotes de chupones ubicados entre el tallo principal y las hojas.",
        "Limite las ramas del follaje inferior para descartar hongos salpicados por la lluvia.",
        "Sujete con tutores o estacas para resistir el peso de los frutos de tomate."
      ];
      careTips = [
        "Riegue profundamente con 3 a 5 cm de agua a la semana directamente en la base.",
        "Mantenga la humedad del suelo constante para evitar la podredumbre apical.",
        "Agregue abono orgánico rico en fósforo durante el cuajado del fruto."
      ];
    } else if (lang === "Français (FR)") {
      pestOrDisease = "Alternariose de la Tomate";
      cropName = "Tomate";
      description = "L'examen visuel du tissu de tomate montre des lésions brunes concentriques avec des halos jaunes. Ceci indique une infection par l'alternariose (Alternaria solani), affectant principalement le feuillage inférieur pendant les périodes humides.";
      solutions = [
        "Taillez les feuilles inférieures fortement infectées pour améliorer l'aération.",
        "Appliquez un fongicide organique à base de cuivre ou de savon de cuivre.",
        "Arrosez professionnellement au pied de la plante plutôt que sur le feuillage."
      ];
      aboutPlant = "Les tomates sont des plantes annuelles populaires de la famille des Solanacées. Elles produisent un feuillage vert riche et de petites fleurs jaunes, suivies des fruits rouges caractéristiques.";
      pruningTips = [
        "Pincez les bourgeons gourmands latéraux qui poussent à l'intersection des tiges.",
        "Supprimez les grappes de feuilles du bas pour éviter l'éclaboussure de la terre contaminée.",
        "Fixez la tige principale sur un tuteur ou un treillis solide."
      ];
      careTips = [
        "Arrosez copieusement et directement au pied avec 2,5 à 5 cm d'eau par semaine.",
        "Maintenez une humidité du sol constante pour éviter la pourriture apicale.",
        "Fournissez de l'engrais organique riche en phosphore lors du développement des fruits."
      ];
    } else {
      pestOrDisease = "Solanum Lycopersici Blight (Early Blight)";
      description = "Visual examination of the Tomato tissue shows classic concentrated brown ring lesions with yellow halos. This indicates early blight infection (Alternaria solani), which primarily affects lower foliage during humid growing stages.";
      solutions = [
        "Prune the lower, heavily infected leaves to increase air circulation within the Tomato canopy.",
        "Apply copper-based organic fungicide or liquid copper soap according to instruction guidelines.",
        "Water the plants strictly at the soil level rather than over-the-top foliage to keep leaves dry."
      ];
      aboutPlant = "Tomatoes are popular annual plants from the Solanaceae family grown for their edible fruit. They typically produce rich green foliage and small yellow flowers, followed by the characteristic red fruits.";
      pruningTips = [
        "Pinch off suckers (shoots growing between main stem and branches) to improve plant architecture and fruit size.",
        "Prune bottom leaf clusters to prevent soil-borne pathogen splashback.",
        "Ensure main stalk is anchored to an elegant trellis or stake system."
      ];
      careTips = [
        "Provide 1-2 inches of deep water per week, watering the base directly.",
        "Maintain consistent soil moisture to prevent blossom end rot.",
        "Apply balanced organic fertilizer high in phosphorus during fruit set."
      ];
    }
  } else if (lowerCrop.includes("maize")) {
    healthStatus = "Healthy";
    severity = "None";
    cropName = "Maize";
    botanicalName = "Zea mays";
    plantFamily = "Poaceae";
    confidence = "96%";
    healthScore = 95;

    if (lang === "Español (ES)") {
      pestOrDisease = "Ninguna (Condición Óptima)";
      cropName = "Maíz";
      description = "El espécimen de hoja de Maíz muestra una distribución de clorofila verde brillante y uniforme en todos los niveles. La estructura celular es óptima, demostrando excelente turgencia celular y cero signos de hongos u orugas.";
      solutions = [
        "Continúe con el ciclo actual de fertilización de NPK durante el espigado.",
        "Asegure un drenaje robusto en el campo durante la época de lluvias intensas.",
        "Inspeccione semanalmente las hojas inferiores para detectar plagas a tiempo."
      ];
      aboutPlant = "El maíz es un grano de cereal básico de la familia de las gramíneas Poaceae, domesticado por primera vez por los pueblos indígenas en el sur de México.";
      pruningTips = [
        "Retire los hijuelos o brotes del nivel del suelo si la densidad de siembra es alta.",
        "Pode las hojas inferiores secas después de que se complete el espigado.",
        "Elimine las malas hierbas invasoras en un radio de 30 cm de la base."
      ];
      careTips = [
        "Riegue abundantemente durante las fases de floración y formación de la mazorca.",
        "Suministre abono rico en nitrógeno en las etapas de desarrollo inicial.",
        "Mantenga un suelo franco limoso, suelto y con excelente exposición solar."
      ];
    } else if (lang === "Français (FR)") {
      pestOrDisease = "Aucun (Condition optimale)";
      cropName = "Maïs";
      description = "L'échantillon de feuille de Maïs montre une répartition de chlorophylle vert vif et uniforme. La structure est optimale, montrant une excellente turgescence et aucun signe de rouille, de foreur ou de chenille.";
      solutions = [
        "Poursuivez le cycle de fertilisation d'engrais NPK pendant la floraison.",
        "Assurez un drainage efficace pendant la saison des pluies pour éviter l'asphyxie des racines.",
        "Inspectez les feuilles inférieures chaque semaine pour détecter tôt les risques de rouille."
      ];
      aboutPlant = "Le maïs, également appelé blé de Turquie, est une céréale de la famille des Poacées, domestiquée à l'origine au Mexique il y a environ 10 000 ans.";
      pruningTips = [
        "Retirez les drageons (pousses latérales au sol) uniquement si la culture est trop dense.",
        "Éliminez les feuilles sèches de la base une fois la phase de fructification démarrée.",
        "Désherbez soigneusement dans un rayon de 30 cm autour du pied."
      ];
      careTips = [
        "Arrosez abondamment pendant la phase d'apparition des épis.",
        "Appliquez un engrais azoté (ex. urée) aux stades clés de croissance.",
        "Privilégiez un sol limoneux bien drainé exposé en plein soleil."
      ];
    } else {
      pestOrDisease = "None (Optimal condition)";
      description = "The Maize leaf specimen shows bright green, uniform chlorophyll distribution at all vegetative levels. The venation structure is optimal, showing healthy cell turgor and zero signs of active fungal rusts, corn borers, or caterpillar lesions.";
      solutions = [
        "Continue with your current fertilizer split-application cycle (NPK 15-15-15) during early tasseling.",
        "Ensure robust field drainage during the active rainy season to avoid root waterlogging.",
        "Inspect lower leaves weekly to maintain early detection of rust insects or stalk rots."
      ];
      aboutPlant = "Maize, also known as corn, is a staple cereal grain from the grass family Poaceae, first domesticated by indigenous peoples in southern Mexico about 10,000 years ago.";
      pruningTips = [
        "Remove tillers (excess side shoots at soil level) only if fields are highly dense.",
        "Prune dried or senesced lower foliage after silking stages are completed.",
        "Clear any invasive weeds within 30cm of the stalks base."
      ];
      careTips = [
        "Supply water heavily during early silking and tasseling phases.",
        "Provide plenty of nitrogen-rich top dressing (e.g., urea) at V4-V6 stages.",
        "Maintain well-draining, loose sandy loam soil with full sun exposure."
      ];
    }
  } else if (lowerCrop.includes("cassava") || lowerCrop.includes("manioc")) {
    healthStatus = "Infected";
    severity = "Medium";
    cropName = "Cassava";
    botanicalName = "Manihot esculenta";
    plantFamily = "Euphorbiaceae";
    confidence = "90%";
    healthScore = 65;

    if (lang === "Español (ES)") {
      pestOrDisease = "Virus del Mosaico de la Yuca";
      cropName = "Yuca";
      description = "La hoja de Yuca exhibe distorsión de mosaico, parches cloróticos de color verde claro y amarillo, y enrollamiento del borde foliar. Esta afección es transmitida frecuentemente por moscas blancas (Bemisia tabaci).";
      solutions = [
        "Seleccione esquejes de yuca certificados y resistentes a enfermedades para su cultivo.",
        "Controle las moscas blancas con extractos de nim o trampas cromáticas amarillas.",
        "Arranque y queme con cuidado las plantas jóvenes muy infectadas para evitar brotes."
      ];
      aboutPlant = "La yuca es un arbusto de la familia Euphorbiaceae, originario de Sudamérica, apreciado por sus raíces tuberosas ricas en almidón para millones de personas.";
      pruningTips = [
        "Pode las puntas de las ramas a los 4 o 6 meses para estimular el engrosamiento del tubérculo.",
        "Limite los tallos a 2 o 3 por planta para maximizar la entrada de luz solar.",
        "Limpie las ramas inferiores muertas para evitar refugio de moscas blancas."
      ];
      careTips = [
        "Evite el encharcamiento; la yuca tolera la sequía pero es propensa a pudrición radicular.",
        "Asegure niveles altos de potasio en el suelo para fomentar la acumulación de almidón.",
        "Haga caballones o surcos limpios para facilitar el desarrollo subterráneo de los tubérculos."
      ];
    } else if (lang === "Français (FR)") {
      pestOrDisease = "Mosaïque de la Manioc";
      cropName = "Manioc";
      description = "Le feuillage du manioc présente des distorsions en mosaïque, des taches chlorotiques vert-jaune et un plissement du limbe. Cette maladie est transmise par l'aleurode (Bemisia tabaci).";
      solutions = [
        "Sélectionnez des boutures de manioc certifiées résistantes pour le prochain cycle.",
        "Contrôlez les populations d'aleurodes avec des extraits de neem ou des pièges englués.",
        "Déterrez et brûlez les plants de manioc fortement atteints pour stopper la propagation."
      ];
      aboutPlant = "Le manioc est un arbuste ligneux de la famille des Euphorbiacées, originaire d'Amérique du Sud, cultivé pour ses racines tubéreuses comestibles.";
      pruningTips = [
        "Taillez l'extrémité des pousses supérieures à 4-6 mois pour stimuler les tubercules.",
        "Limitez les tiges à 2 ou 3 par plant pour maximiser l'ensoleillement des feuilles.",
        "Débarrassez les branches sèches du bas pour supprimer tout abri aux aleurodes."
      ];
      careTips = [
        "Évitez l'eau stagnante; le manioc est résistant à la sécheresse mais craint la pourriture.",
        "Amendez le sol en potassium pour favoriser l'accumulation d'amidon.",
        "Maintenez des buttes propres pour favoriser un développement optimal des tubercules."
      ];
    } else {
      pestOrDisease = "Cassava Mosaic Virus (CMD)";
      description = "The Cassava foliage exhibits mosaic distortion, pale green yellow chlorotic patches, and leaf margin crinkling. This leaf distortion is frequently spread by whitefly vectors (Bemisia tabaci) and is a common threat in Sub-Saharan systems.";
      solutions = [
        "Select only validated disease-resistant Cassava cuttings (e.g., UCC agricultural varieties) for your next planting cycle.",
        "Control whitefly populations on the plot borders using natural neem leaf extracts or yellow sticky card traps.",
        "Uproot and safely bury or burn heavily distorted young Cassava plants to prevent further farm spread."
      ];
      aboutPlant = "Cassava is a woody shrub of the Euphorbiaceae family, native to South America, prized for its starchy tuberous roots which feed over 500 million people.";
      pruningTips = [
        "Prune top branch tips at 4-6 months to encourage heavier tuber root bulking.",
        "Limit stems to 2 or 3 per plant cut to maximize light interception.",
        "Clear dead or yellowed bottom branches to avoid harboring whitefly colonies."
      ];
      careTips = [
        "Avoid waterlogged conditions; cassava is highly drought-tolerant but sensitive to root rot.",
        "Ensure high potassium levels in early soil preparation for high starch accumulation.",
        "Keep clean soil mounds or ridges to promote unrestricted tuber growth."
      ];
    }
  } else if (lowerCrop.includes("pepper") || lowerCrop.includes("chili")) {
    healthStatus = "Pest Risk";
    severity = "Medium";
    cropName = "Chili Pepper";
    botanicalName = "Capsicum annuum";
    plantFamily = "Solanaceae";
    confidence = "88%";
    healthScore = 50;

    if (lang === "Español (ES)") {
      pestOrDisease = "Ácaro Blanco de los Pimientos";
      cropName = "Chile / Pimiento";
      description = "Las hojas jóvenes de chile muestran enrollamiento hacia abajo, estrechamiento y bronceado en la parte inferior. Esto se debe a la alimentación del ácaro blanco en temporadas húmedas o calurosas.";
      solutions = [
        "Aplique aceites de horticultura orgánicos o azufre mojable en el envés de las hojas.",
        "Aísle los cultivos de pimientos y lávese bien las manos tras manipularlos.",
        "Introduzca ácaros depredadores (Amblyseius swirskii) para el control biológico natural."
      ];
      aboutPlant = "Los pimientos pertenecen a la familia de las Solanáceas y producen frutos deliciosos, picantes y dulces, ideales para climas tropicales y cálidos.";
      pruningTips = [
        "Pellizque las primeras flores o yemas terminales para lograr un ramaje denso.",
        "Despeje las hojas situadas por debajo de la primera ramificación en 'Y'.",
        "Corte cualquier rama baja que toque la tierra para impedir el acceso de plagas terrestres."
      ];
      careTips = [
        "Mantenga una humedad homogénea en el suelo para evitar el estrés del pimiento.",
        "Coloque una capa protectora de mantillo para retener agua y repeler ácaros de tierra.",
        "Agregue calcio y magnesio para evitar la necrosis apical del fruto."
      ];
    } else if (lang === "Français (FR)") {
      pestOrDisease = "Tarsonème commun du Piment";
      cropName = "Piment";
      description = "Les jeunes feuilles de piment montrent un enroulement vers le bas, un rétrécissement et un bronzage au revers. Ceci est causé par les attaques d'acariens de tarsonème.";
      solutions = [
        "Appliquez de l'huile horticole ou une préparation à base de soufre sous les feuilles.",
        "Isolez les plants de piment touchés et lavez-vous les mains après les soins.",
        "Introduisez des acariens prédateurs naturels (Amblyseius swirskii) en lutte biologique."
      ];
      aboutPlant = "Les plants de piment appartiennent à la famille des Solanacées. Ils produisent des fruits poivrés ou piquants riches en nutriments.";
      pruningTips = [
        "Pincez le bourgeon terminal des plants pour les rendre plus touffus.",
        "Dégagez les feuilles qui se trouvent sous la première fourche principale.",
        "Podez les branches tombantes qui touchent le sol pour bloquer l'accès aux insectes."
      ];
      careTips = [
        "Maintenez une humidité uniforme du sol; les piments n'aiment pas la sécheresse soudaine.",
        "Mettez un paillage épais sous le feuillage pour isoler et réguler l'humidité.",
        "Faites des apports réguliers de calcium pour éviter la pourriture noire du piment."
      ];
    } else {
      pestOrDisease = "Broad Mites (Polyphagotarsonemus latus)";
      description = "The young pepper leaves show characteristic downwards leaf curling, narrow strap-like leaf elongation, and bronzing on the underfaces. This is caused by micro-arthropod broad mite feeding which thrives in hot greenhouses or early dry spells.";
      solutions = [
        "Apply organic horticultural mineral oils or sulfur-based spray covering all bottom surfaces of leaves.",
        "Isolate the affected pepper beds and wash hands frequently to stop physical transmission of mites.",
        "Introduce predatory mites (Amblyseius swirskii) to naturally limit broad mite numbers."
      ];
      aboutPlant = "Pepper plants belong to the Solanaceae family and produce popular, nutrient-rich chili spikes and bell fruits that thrive in warm tropical environments.";
      pruningTips = [
        "Pinch early terminal buds to encourage a bushier structure with more fruit nodes.",
        "Clear leaves below the first major Y-junction of the stem.",
        "Prune any branches that are dragging on the ground to prevent pest trails."
      ];
      careTips = [
        "Maintain uniform soil dampness; peppers stress quickly under wild moisture swings.",
        "Mulch heavily under the canopy to control moisture and limit soil mites.",
        "Provide calcium supplementation (cal-mag) to guard against blossom rot."
      ];
    }
  }

  return {
    healthStatus,
    pestOrDisease,
    severity,
    description,
    solutions,
    cropName,
    botanicalName,
    plantFamily,
    confidence,
    healthScore,
    aboutPlant,
    pruningTips,
    careTips,
    isLocalFallback: true,
    diagnosedVia: lang === "Español (ES)" ? "Diagnóstico Local Heurístico (API sin conexión)" : lang === "Français (FR)" ? "Diagnostic Local Heuristique (API hors ligne)" : "UCC Agronomy Local Heuristics Simulator (API Offline Fallback)"
  };
}

// ML Model Proxy — forwards image to external PlantDoc disease classifier (avoids CORS)
app.post("/api/ml-predict", async (req, res) => {
  const { image, language } = req.body;
  if (!image) {
    return res.status(400).json({ error: "Missing image data" });
  }

  try {
    // ── Step 1: Extract base64 and build multipart for ML server ──────────────
    let mimeType = "image/jpeg";
    let base64Data = image;
    if (image.startsWith("data:")) {
      const match = image.match(/^data:([^;]+);base64,(.*)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }
    }
    const imageBuffer = Buffer.from(base64Data, "base64");
    const boundary = "----AgriScanBoundary" + Date.now();
    const fileName = "leaf_scan.jpg";
    const header = Buffer.from([
      `--${boundary}\r\n`,
      `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`,
      `Content-Type: ${mimeType}\r\n\r\n`,
    ].join(""));
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
    const multipartBody = Buffer.concat([header, imageBuffer, footer]);

    // ── Step 2: Call local MobileNetV2 ML server ──────────────────────────────
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const ML_BASE_URL = process.env.ML_SERVER_URL || "http://localhost:8000";
    const mlResponse = await fetch(`${ML_BASE_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
      body: multipartBody,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!mlResponse.ok) {
      throw new Error(`ML server returned status ${mlResponse.status}`);
    }

    const mlResult = await mlResponse.json();
    const predictedClass: string = mlResult.predicted_class || "Unknown";
    const displayName: string = mlResult.display_name || predictedClass.replace(/_/g, " ");
    const confidenceRaw: number = mlResult.confidence || 0; // already as percentage (0-100)
    const top3: any[] = mlResult.top3 || [];

    console.log(`[ML] MobileNetV2 predicted: ${displayName} (${confidenceRaw.toFixed(1)}%)`);

    // ── Step 3: Parse class name into crop + disease parts ────────────────────
    // Class format examples: "Tomato_leaf_late_blight", "Apple_Scab_Leaf", "grape_leaf"
    const parts = predictedClass.split("_");
    
    // Identify the crop from the first word(s) and disease from the rest
    const knownCrops = ["Apple", "Bell", "Blueberry", "Cherry", "Corn", "Grape", "Peach", "Potato", "Raspberry", "Soyabean", "Squash", "Strawberry", "Tomato", "grape"];
    let cropName = parts[0];
    let diseaseParts = parts.slice(1);

    // Multi-word crops
    if (parts[0].toLowerCase() === "bell" && parts[1]?.toLowerCase() === "pepper") {
      cropName = "Bell Pepper";
      diseaseParts = parts.slice(2);
    }

    const diseaseName = diseaseParts.join(" ").replace(/leaf/gi, "").trim() || "Healthy";
    const isHealthy = predictedClass.toLowerCase().includes("_leaf") && diseaseParts.every(p => p.toLowerCase() === "leaf") 
      || diseaseName.toLowerCase() === "healthy" 
      || diseaseName.trim() === "";

    const confidencePercent = Math.round(confidenceRaw);
    
    // Severity based on confidence
    let severity = "Low";
    if (isHealthy) severity = "None";
    else if (confidenceRaw > 85) severity = "High";
    else if (confidenceRaw > 65) severity = "Moderate";

    const healthScore = isHealthy
      ? Math.min(98, 75 + Math.round(confidenceRaw * 0.23))
      : Math.max(15, Math.round((100 - confidenceRaw) * 0.7));

    // ── Step 4: Use Gemini to generate a rich diagnostic report ───────────────
    let targetLanguage = "English";
    if (language === "Español (ES)") targetLanguage = "Spanish";
    else if (language === "Français (FR)") targetLanguage = "French";

    if (ai) {
      try {
        const geminiPrompt = `You are an expert plant pathologist. 
A MobileNetV2 CNN model trained on the PlantDoc dataset has classified a leaf image as:
- Predicted Class: "${displayName}"
- Crop: ${cropName}
- Condition/Disease: ${isHealthy ? "Healthy (no disease detected)" : diseaseName}
- Model Confidence: ${confidencePercent}%

Based on this classification, generate a detailed expert diagnostic report in ${targetLanguage}. 
Return ONLY valid JSON with these exact fields:
{
  "description": "A detailed 2-3 sentence expert description of this condition and what it means for the plant",
  "solutions": ["solution 1", "solution 2", "solution 3"],
  "botanicalName": "Latin botanical name of the crop",
  "plantFamily": "Plant family name",
  "aboutPlant": "2 sentence educational description of this plant species",
  "pruningTips": ["tip 1", "tip 2", "tip 3"],
  "careTips": ["tip 1", "tip 2", "tip 3"]
}`;

        const geminiResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: { parts: [{ text: geminiPrompt }] },
          config: { responseMimeType: "application/json", temperature: 0.4 },
        });

        if (geminiResponse.text) {
          const geminiData = JSON.parse(geminiResponse.text.trim());
          return res.json({
            predicted_class: predictedClass,
            display_name: displayName,
            confidence: confidencePercent / 100,  // as decimal for frontend compatibility
            top5: top3.map((t: any) => ({ label: t.class, confidence: t.confidence / 100 })),
            // Gemini-enriched fields
            cropName,
            pestOrDisease: isHealthy ? "No disease detected — Healthy" : diseaseName,
            healthStatus: isHealthy ? "Healthy" : (severity === "High" ? "Sick" : "Normal"),
            severity,
            healthScore,
            description: geminiData.description || "",
            solutions: geminiData.solutions || [],
            botanicalName: geminiData.botanicalName || cropName,
            plantFamily: geminiData.plantFamily || "",
            aboutPlant: geminiData.aboutPlant || "",
            pruningTips: geminiData.pruningTips || [],
            careTips: geminiData.careTips || [],
            diagnosedVia: `MobileNetV2 (PlantDoc) + Gemini Report`,
            status: "success"
          });
        }
      } catch (geminiErr: any) {
        console.warn("[ML] Gemini enrichment failed, returning model-only result:", geminiErr.message);
      }
    }

    // ── Step 5: Fallback — return model-only result without Gemini ────────────
    return res.json({
      predicted_class: predictedClass,
      display_name: displayName,
      confidence: confidencePercent / 100,
      top5: top3.map((t: any) => ({ label: t.class, confidence: t.confidence / 100 })),
      cropName,
      pestOrDisease: isHealthy ? "No disease detected — Healthy" : diseaseName,
      healthStatus: isHealthy ? "Healthy" : (severity === "High" ? "Infected" : "Warning"),
      severity,
      healthScore,
      description: isHealthy
        ? `${cropName} appears healthy with ${confidencePercent}% confidence. No visible signs of disease detected.`
        : `${diseaseName} detected on ${cropName} with ${confidencePercent}% model confidence. Severity assessed as ${severity.toLowerCase()}.`,
      solutions: ["Consult a local agricultural extension officer.", "Apply a broad-spectrum preventive fungicide.", "Monitor the plant closely for the next 7 days."],
      botanicalName: cropName,
      plantFamily: "",
      aboutPlant: `Diagnosed using MobileNetV2 deep learning model trained on the PlantDoc dataset (27 disease classes).`,
      pruningTips: ["Remove dead or yellowing leaves regularly.", "Sterilize pruning tools between uses.", "Avoid cutting during humid conditions."],
      careTips: ["Maintain consistent watering schedule.", "Ensure adequate sunlight exposure.", "Monitor soil pH and nutrient levels."],
      diagnosedVia: "MobileNetV2 (PlantDoc) — Local Model",
      status: "success"
    });

  } catch (error: any) {
    console.error("ML Proxy error:", error.message);
    return res.status(502).json({ error: "ML model unavailable", detail: error.message });
  }
});

// Crop analysis route
app.post("/api/analyze-crop", async (req, res) => {
  const { image, cropType, model, language } = req.body;

  if (!image) {
    return res.status(400).json({ error: "Missing crop image source for analysis" });
  }

  // If Gemini client is not initialized, use specialized heuristic fallback to simulate high-fidelity offline agronomy
  if (!ai) {
    console.log("No Gemini API key available, using high-fidelity offline UCC agronomy simulation");
    const simulationResult = runOfflineSimulation(cropType, language);
    await new Promise(resolve => setTimeout(resolve, 100));
    return res.json(simulationResult);
  }

  try {
    // Extract base64 details
    let mimeType = "image/png";
    let base64Data = image;

    if (image.startsWith("data:")) {
      const match = image.match(/^data:([^;]+);base64,(.*)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }
    } else if (image.startsWith("http://") || image.startsWith("https://")) {
      try {
        const fetchRes = await fetch(image);
        if (!fetchRes.ok) {
          throw new Error(`Failed to fetch image from URL: ${image} (status: ${fetchRes.status})`);
        }
        const arrayBuffer = await fetchRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        base64Data = buffer.toString("base64");
        const contentType = fetchRes.headers.get("content-type");
        if (contentType) {
          mimeType = contentType;
        }
      } catch (e: any) {
        console.error("Error fetching or converting image URL to base64:", e);
        throw new Error(`Failed to process input URL: ${e.message}`);
      }
    } else {
      throw new Error("Invalid image format or URL provided. Supported formats: base64 data URLs or standard HTTP/HTTPS links.");
    }

    let targetLanguageName = "English";
    if (language === "Español (ES)") {
      targetLanguageName = "Spanish";
    } else if (language === "Français (FR)") {
      targetLanguageName = "French";
    }

    const prompt = `You are an expert plant pathologist and digital agronomist. 
Analyze this plant photo (which might represent ${cropType || "a crop species"}). 
Diagnose the health status, identify pests, plant diseases, nutrient deficiencies or environmental stress.
Return your expert structured analysis in complete, strict JSON format. Specify the main problem or if the crop is completely healthy.

CRITICAL REQUIREMENT: Show your analysis in ${targetLanguageName} language.
All text fields MUST be in ${targetLanguageName}, including:
- \`pestOrDisease\`
- \`description\`
- \`solutions\` (translate each element to ${targetLanguageName})
- \`cropName\`
- \`aboutPlant\`
- \`pruningTips\` (translate each element to ${targetLanguageName})
- \`careTips\` (translate each element to ${targetLanguageName})

Note: Keep 'healthStatus' as one of the exact English enum values ('Healthy', 'Normal', 'Sick') so the UI state works properly, but translate all other human-readable details into ${targetLanguageName}.
- 'Healthy' = no disease detected, plant looks good
- 'Normal' = mild issue, plant can recover with treatment
- 'Sick' = serious disease or infection detected, needs urgent attention`;

    const preferredModel = model || "gemini-3.1-pro-preview";
    const backupModels = ["gemini-3.1-pro-preview", "gemini-3.5-flash"];
    
    // Construct prioritized list of models to try
    const modelOrder = [preferredModel, ...backupModels].filter((m, idx, self) => self.indexOf(m) === idx);

    let lastError: any = null;
    let selectedSuccessModel = "";
    let responseText = "";

    // Sequential retry cascade over supported models
    for (const targetModel of modelOrder) {
      try {
        console.log(`Attempting diagnostics using model: ${targetModel}...`);
        const response = await ai.models.generateContent({
          model: targetModel,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
              {
                text: prompt,
              },
            ],
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                healthStatus: {
                  type: Type.STRING,
                  description: "Must be exactly one of: 'Healthy', 'Normal', 'Sick'. Healthy=no disease, Normal=mild issue, Sick=serious disease",
                },
                pestOrDisease: {
                  type: Type.STRING,
                  description: "The name of the pest, disease, nutrient deficiency, or 'None' if perfectly healthy.",
                },
                severity: {
                  type: Type.STRING,
                  description: "Degree of impact: 'None', 'Low', 'Medium', 'High', 'Critical'",
                },
                description: {
                  type: Type.STRING,
                  description: "A summary of identified symptoms and overall analysis of the plant status.",
                },
                solutions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "An array of 3 distinct, practical, step-by-step solutions or recommended practices.",
                },
                cropName: {
                  type: Type.STRING,
                  description: "Name of the crop identified, e.g. 'Crop Leaf', 'Maize', 'Tomato'.",
                },
                botanicalName: {
                  type: Type.STRING,
                  description: "Botanical scientific name in Latin, e.g. 'Solanum lycopersicum' or 'Zea mays'.",
                },
                plantFamily: {
                  type: Type.STRING,
                  description: "Biological taxonomic family of the crop, e.g. 'Solanaceae' or 'Poaceae'.",
                },
                confidence: {
                  type: Type.STRING,
                  description: "Percentage string estimating identification confidence, e.g. '88%' or '92%'.",
                },
                healthScore: {
                  type: Type.NUMBER,
                  description: "Calculated numeric health marker scoring from 0 to 100 based on status.",
                },
                aboutPlant: {
                  type: Type.STRING,
                  description: "A short, engaging historical or educational text block describing this species.",
                },
                pruningTips: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "An array of 3 professional, species-specific pruning or trimming tips.",
                },
                careTips: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "An array of 3 long-term environmental care, watering or fertilizing recommendations.",
                },
              },
              required: [
                "healthStatus", 
                "pestOrDisease", 
                "severity", 
                "description", 
                "solutions", 
                "cropName",
                "botanicalName",
                "plantFamily",
                "confidence",
                "healthScore",
                "aboutPlant",
                "pruningTips",
                "careTips"
              ],
            },
          },
        });

        if (response.text) {
          responseText = response.text;
          selectedSuccessModel = targetModel;
          console.log(`Diagnostics succeeded with model: ${targetModel}!`);
          break;
        }
      } catch (err: any) {
        // Log cascade retry events safely to console.log (stdout) to keep standard-error trace clean
        console.log(`Cascade: Model ${targetModel} is temporarily occupied or returned a status update. Checking next diagnostic model option...`);
        lastError = err;
      }
    }

    // If all neural model API options failed/timed out/503'd, activate our beautiful offline fallback model smoothly!
    if (!responseText) {
      console.warn("All configured models returned temporary busy signals or quota limits. Activating high-fidelity fallback diagnostics.");
      const fallbackResult = runOfflineSimulation(cropType, language);
      // Append information about fallback due to high demand
      fallbackResult.diagnosedVia = `Temporary offline fallback (due to busy API services: ${lastError?.message || "Unavailable 503"})`;
      return res.json(fallbackResult);
    }

    const result = JSON.parse(responseText.trim());
    result.diagnosedVia = `Gemini Network Diagnostics (${selectedSuccessModel})`;
    return res.json(result);
  } catch (error: any) {
    console.error("Critical Gemini processing error, activating local simulations:", error);
    const extremeBackup = runOfflineSimulation(cropType, language);
    return res.json(extremeBackup);
  }
});

// Helper for support-chat local heuristic fallback
function getHeuristicSupportReply(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("portfolio") || lower.includes("crop") || lower.includes("add") || lower.includes("delete") || lower.includes("create")) {
    return "To manage Crop Portfolios in AgriScan AI, you can click the floating '+' button on the main tab to register a new crop. To delete one, simply click the red trashcan icon at the top of any portfolio card. Live soil metrics are updated via growth logs inside the portfolio details.";
  } else if (lower.includes("scan") || lower.includes("photo") || lower.includes("diagn") || lower.includes("disease") || lower.includes("leaf")) {
    return "To run plant disease diagnostics, use the 'Quick Scan' center button or open a specific Crop Portfolio and choose 'Analyze Plant Health'. Take or upload a clear leaf micrograph of the diseased tissue. Our high-fidelity neural system will automatically yield identification keys and treatments.";
  } else if (lower.includes("language") || lower.includes("translate") || lower.includes("theme") || lower.includes("color") || lower.includes("spanish") || lower.includes("french") || lower.includes("english")) {
    return "Preferences are controlled directly on the Settings screen. For Theme selection, click matching badge nodes (Forest, Charcoal, Sepia, Ocean). For system language, click the Language row to cycle instantly through English, Español, and Français.";
  } else if (lower.includes("reset") || lower.includes("logout") || lower.includes("cache")) {
    return "The 'Log Out & Reset Cache' action at the bottom of the Settings panel wipes stored portfolio changes and resets the system to default factory state safely.";
  } else {
    return "I apologize, but I am not certain on how to resolve that specific inquiry. If you need custom support or if I wasn't able to help, you can contact our specialized team at pontiacmadegeek@gmail.com or ky383201@gmail.com, or email our lead developer Daniel Frimpong directly at daniel.frimpong003@stu.ucc.edu.gh.";
  }
}

// Support Chatbot Endpoint
app.post("/api/support-chat", async (req, res) => {
  const { message, history, type } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Missing message parameter" });
  }

  // If Gemini client is not initialized, we run local heuristics logic
  if (!ai) {
    const reply = getHeuristicSupportReply(message);
    return res.json({ reply });
  }

  try {
    let supportSystemInstruction = "";
    if (type === "pathologist") {
      supportSystemInstruction = `You are an expert Plant Pathologist and Agronomist. Your goal is to answer any questions related to plants, crops, diseases, farming best practices, soil management, pest control, and agricultural science. Provide clear, accurate, and scientifically backed advice.`;
    } else {
      supportSystemInstruction = `You are a helpful, expert Support Assistant for "AgriScan AI", an advanced agricultural diagnostic and crop portfolio tracking mobile-first application.
Your goal is to answer any operational, features, or setup questions about AgriScan AI.

Key Features of AgriScan AI to know:
1. Crop Portfolios: Users can create and manage portfolios for specific crops (such as Tomato, Maize, Cassava, Chili Pepper). Within each crop portfolio, they can see live metrics (soil moisture, growth stage, estimated yield), track scans history, examine health indexes, log custom agronomic activities, and delete portfolios they don't need.
2. Quick Scan: Front-page quick diagnostics tool accessible via the 'Scan' tab or back-arrows. Allows users to upload/take a photo on the fly to diagnose health defects (like blight, rust, mosaic viruses, or broad mites) and get instant step-by-step soil or watering treatments. No portfolio is needed for Quick Scan.
3. Preferences & Theme Configurations: Dark theme variants (Forest green, Charcoal dark, Sepia warm, Ocean blue), system-wide instant translation (English, Español, Français), preferred neural models selection (Gemini 3.5 Flash, Gemini 3.1 Pro etc), caching, and logs database management.
4. Support Center and team contacts:
   - Lead Developer (Academic & Pathology): Daniel Frimpong (daniel.frimpong003@stu.ucc.edu.gh)
   - Operations & Configuration Specialist: pontiacmadegeek@gmail.com
   - Database & Scale Infrastructure Systems Advisor: ky383201@gmail.com

CRITICAL DIRECTIVE:
If the user asks a question that you cannot fully resolve or answer, or if they express frustration, or explicitly ask for human support, you MUST guide them clearly to use one of our active direct support email addresses: Daniel Frimpong (daniel.frimpong003@stu.ucc.edu.gh), Operations (pontiacmadegeek@gmail.com), or Database Advisor (ky383201@gmail.com).
Keep your answers professional, concise, encouraging, and clear. Do not speak about external applications; stay focused purely on AgriScan AI.`;
    }

    // Map history to Gemini API representation if present
    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      history.slice(-8).forEach((h: any) => {
        contents.push({
          role: h.sender === "user" ? "user" : "model",
          parts: [{ text: h.text }],
        });
      });
    }
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction: supportSystemInstruction,
        temperature: 0.7,
      },
    });

    return res.json({ reply: response.text });
  } catch (error: any) {
    console.error("Support chat error:", error?.message || error);
    return res.status(503).json({ error: "AI service temporarily unavailable. Please try again in a moment." });
  }
});


async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server fully running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
