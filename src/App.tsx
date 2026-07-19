import React, { useState, useEffect, useRef } from "react";
import LoginPage from "./components/LoginPage";
import { initialCropPortfolios } from "./data";
import { auth } from "./firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { CropPortfolio, StatusType, Activity } from "./types";


function deduplicatePortfolios(arr: CropPortfolio[]): CropPortfolio[] {
  if (!arr || !Array.isArray(arr)) return [];
  const seen = new Set<string>();
  return arr.filter((item) => {
    if (!item || !item.id) return false;
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function getDeterministicString(arr: CropPortfolio[]): string {
  const deDupped = deduplicatePortfolios(arr);
  const sorted = [...deDupped].sort((a, b) => a.id.localeCompare(b.id));
  return JSON.stringify(sorted);
}

const translations = {
  "English (US)": {
    searchPlaceholder: "Search crop portfolios...",
    cropPortfolios: "Crop Portfolios",
    noMatching: "No matching portfolios discovered.",
    settings: "Settings",
    language: "Language",
    helpSupport: "Help & Support",
    theme: "Application Theme",
    quickScan: "Quick Scan",
    activeModel: "Active Neural Model",
    logout: "Log Out & Reset Cache",
    crops: "Crops",
    scan: "Scan",
    personalInfo: "Personal Information",
    securityPassword: "Security & Password",
    accountSettings: "Account Settings",
    preferences: "Preferences",
    cancel: "Cancel",
    save: "Save",
    clear: "Clear",
    analyzeTitle: "Analyze Plant Health",
    // Stats & Info
    healthScore: "Health Score",
    moisture: "Moisture",
    estYield: "Est. Yield",
    growthStage: "Growth Stage",
    lastScanPrefix: "Last scan",
    // Details tab actions
    scanSpecimen: "Scan Specimen",
    viewHistory: "View History",
    growthLogs: "Growth Logs",
    pestGuide: "Pest Guide",
    recentActivity: "Recent Activity",
    chatWithPathologist: "Chat with Pathologist",
    // Headers
    diagnosticHistory: "Diagnostic History",
    growthLogsHeading: "Growth & Development Logs",
    pestGuideHeading: "Pathology & Pest Guide",
    // Quick Scan Upload
    gallery: "Gallery",
    camera: "Camera",
    presets: "Presets",
    takeOrUploadPhoto: "Take or upload a clear photo of any plant leaf or crop to get an instant analysis.",
    supportsHighFidelity: "Supports high-fidelity computer vision diagnostics.",
    scanningMatrix: "Scanning Matrix...",
    aiDiagnosing: "AI Diagnosing...",
    lensFocusEngaged: "Lens Focus Engaged",
    agronomyAiLogs: "AGRONOMY AI LOGS",
    loadingPathology: "▶ Loading Pathology Cloud Analysis...",
    backToPortfolios: "Portfolios",
    // Result
    pathologyScanned: "Pathology Scanned",
    identify: "Identify",
    diseases: "Diseases",
    solutions: "Solutions",
    diagnosis: "Diagnosis",
    specialist: "Specialist",
    saveReport: "Save Diagnostic to Portfolio Folder",
    discard: "Discard Decision",
    diagnosticPathologyReport: "Diagnostic Pathology Report",
    confirmDelete: "Confirm Permanent Delete!",
    deletePortfolioLabel: "Delete Portfolio",
    items: "items",
    // Model selection
    diagnosticAiEngine: "Diagnostic AI Engine",
    chooseModel: "Choose which Gemini model drives diagnostics",
    tapToSwitchTheme: "Tap here to switch between Light and Dark",
    personalInformation: "Personal Information",
    securityAndPassword: "Security & Password",
    noPortfoliosYet: "No portfolios yet. Click '+' to register your first crop!",
    registerNewCropTitle: "Register New Portfolio",
    registerNewCropSub: "Establish localized growth records and real-time medical logs.",
    cropNameLabel: "Crop Name",
    scienceNameLabel: "Scientific Name (Optional)",
    selectStageLabel: "Select Current Growth Stage",
    startingMoistureLabel: "Starting Soil Moisture (%)",
    estimatedYieldTextLabel: "Estimated Target Yield (e.g. 3.2t)",
    establishedLabel: "Establish Crop Portfolio",
    back: "Back",
  },
  "Español (ES)": {
    searchPlaceholder: "Buscar portafolios de cultivos...",
    cropPortfolios: "Portafolios de Cultivos",
    noMatching: "No se descubrieron portafolios coincidentes.",
    settings: "Configuración",
    language: "Idioma",
    helpSupport: "Ayuda y Soporte",
    theme: "Tema de la Aplicación",
    quickScan: "Escaneo Rápido",
    activeModel: "Modelo Neural Activo",
    logout: "Cerrar sesión y restaurar caché",
    crops: "Cultivos",
    scan: "Escanear",
    personalInfo: "Información Personal",
    securityPassword: "Seguridad y Contraseña",
    accountSettings: "Configuración de Cuenta",
    preferences: "Preferencias",
    cancel: "Cancelar",
    save: "Guardar",
    clear: "Limpiar",
    analyzeTitle: "Analizar salud de planta",
    // Stats & Info
    healthScore: "Puntuación de Salud",
    moisture: "Humedad",
    estYield: "Rendimiento Est.",
    growthStage: "Etapa de Crecimiento",
    lastScanPrefix: "Último escaneo",
    // Details tab actions
    scanSpecimen: "Escanear Muestra",
    viewHistory: "Ver Historial",
    growthLogs: "Registros de Crecimiento",
    pestGuide: "Guía de Plagas",
    recentActivity: "Actividad Reciente",
    chatWithPathologist: "Chatear con Patólogo",
    // Headers
    diagnosticHistory: "Historial de Diagnóstico",
    growthLogsHeading: "Registros de Crecimiento y Desarrollo",
    pestGuideHeading: "Guía de Patología y Plagas",
    // Quick Scan Upload
    gallery: "Galería",
    camera: "Cámara",
    presets: "Preajustes",
    takeOrUploadPhoto: "Tome o suba una foto clara de cualquier hoja de planta o cultivo para obtener un análisis instantáneo.",
    supportsHighFidelity: "Soporta diagnósticos por visión artificial de alta fidelidad.",
    scanningMatrix: "Escaneando matriz...",
    aiDiagnosing: "IA diagnosticando...",
    lensFocusEngaged: "Enfoque de lente activado",
    agronomyAiLogs: "REGISTROS DE IA DE AGRONOMÍA",
    loadingPathology: "▶ Cargando análisis de patología en la nube...",
    backToPortfolios: "Portafolios",
    // Result
    pathologyScanned: "Muestra Escaneada",
    identify: "Identificar",
    diseases: "Enfermedades",
    solutions: "Soluciones",
    diagnosis: "Diagnóstico",
    specialist: "Especialista",
    saveReport: "Guardar informe en portafolio",
    discard: "Descartar decisión",
    diagnosticPathologyReport: "Informe de Patología Diagnóstica",
    confirmDelete: "¡Confirmar eliminación permanente!",
    deletePortfolioLabel: "Eliminar Portafolio",
    items: "artículos",
    // Model selection
    diagnosticAiEngine: "Motor de IA de diagnóstico",
    chooseModel: "Elija qué modelo Gemini impulsa el diagnóstico",
    tapToSwitchTheme: "Presione aquí para cambiar entre Claro y Oscuro",
    personalInformation: "Información Personal",
    securityAndPassword: "Seguridad y Contraseña",
    noPortfoliosYet: "Aún no hay portafolios. ¡Presione '+' para registrar su primer cultivo!",
    registerNewCropTitle: "Registrar Nuevo Portafolio",
    registerNewCropSub: "Establezca registros de crecimiento y bitácoras médicas en tiempo real.",
    cropNameLabel: "Nombre del Cultivo",
    scienceNameLabel: "Nombre Científico (Opcional)",
    selectStageLabel: "Seleccione etapa de crecimiento",
    startingMoistureLabel: "Humedad inicial del suelo (%)",
    estimatedYieldTextLabel: "Rendimiento objetivo estimado (ej. 3.2t)",
    establishedLabel: "Establecer portafolio de cultivo",
    back: "Atrás",
  },
  "Français (FR)": {
    searchPlaceholder: "Rechercher des portefeuilles...",
    cropPortfolios: "Portefeuilles de cultures",
    noMatching: "Aucun portefeuille correspondant trouvé.",
    settings: "Paramètres",
    language: "Langue",
    helpSupport: "Aide & Support",
    theme: "Thème de l'application",
    quickScan: "Analyse Rapide",
    activeModel: "Modèle neuronal actif",
    logout: "Se déconnecter & réinitialiser le cache",
    crops: "Cultures",
    scan: "Analyser",
    personalInfo: "Informations personnelles",
    securityPassword: "Sécurité & Mot de passe",
    accountSettings: "Paramètres du compte",
    preferences: "Préférences",
    cancel: "Annuler",
    save: "Enregistrer",
    clear: "Effacer",
    analyzeTitle: "Analyser la santé des plantes",
    // Stats & Info
    healthScore: "Score de Santé",
    moisture: "Humidité",
    estYield: "Rendement Est.",
    growthStage: "Stade de Croissance",
    lastScanPrefix: "Dernière analyse",
    // Details tab actions
    scanSpecimen: "Scanner l'échantillon",
    viewHistory: "Voir l'Historique",
    growthLogs: "Journaux",
    pestGuide: "Guide de Ravageurs",
    recentActivity: "Activité Récente",
    chatWithPathologist: "Discuter avec le pathologiste",
    // Headers
    diagnosticHistory: "Historique Diagnostique",
    growthLogsHeading: "Journaux de Croissance & Développement",
    pestGuideHeading: "Guide de Pathologie et Ravageurs",
    // Quick Scan Upload
    gallery: "Galerie",
    camera: "Appareil Photo",
    presets: "Préréglages",
    takeOrUploadPhoto: "Prenez ou téléchargez une photo claire de n'importe quelle feuille de plante ou culture pour obtenir une analyse instantanée.",
    supportsHighFidelity: "Prend en charge les diagnostics de vision par ordinateur haute fidélité.",
    scanningMatrix: "Numérisation de la matrice...",
    aiDiagnosing: "Diagnostic IA...",
    lensFocusEngaged: "Mise au point de l'objectif engagée",
    agronomyAiLogs: "COMPTE RENDU D'IA EN AGRONOMIE",
    loadingPathology: "▶ Chargement de l'analyse pathologique dans le cloud...",
    backToPortfolios: "Portefeuilles",
    // Result
    pathologyScanned: "Échantillon Analysé",
    identify: "Identifier",
    diseases: "Maladies",
    solutions: "Solutions",
    diagnosis: "Diagnostic",
    specialist: "Spécialiste",
    saveReport: "Enregistrer le rapport dans le dossier",
    discard: "Rejeter la décision",
    diagnosticPathologyReport: "Rapport de Pathologie Diagnostique",
    confirmDelete: "Confirmer la suppression définitive !",
    deletePortfolioLabel: "Supprimer le Portefeuille",
    items: "articles",
    // Model selection
    diagnosticAiEngine: "Moteur d'IA Diagnostique",
    chooseModel: "Choisissez quel modèle Gemini pilote les diagnostics",
    tapToSwitchTheme: "Appuyer pour basculer entre Clair et Sombre",
    personalInformation: "Informations personnelles",
    securityAndPassword: "Sécurité & Mot de passe",
    noPortfoliosYet: "Aucun portefeuille pour le moment. Cliquez sur '+' pour enregistrer votre première culture !",
    registerNewCropTitle: "Enregistrer un nouveau portefeuille",
    registerNewCropSub: "Établir des registres de croissance et des journaux médicaux en temps réel.",
    cropNameLabel: "Nom de la culture",
    scienceNameLabel: "Nom scientifique (Optionnel)",
    selectStageLabel: "Sélectionnez le stade de croissance",
    startingMoistureLabel: "Humidité initiale du sol (%)",
    estimatedYieldTextLabel: "Rendement cible estimé (ex. 3.2t)",
    establishedLabel: "Établir le portefeuille de culture",
    back: "Retour",
  }
};

export default function App() {
  const [user, setUser] = useState<{ uid: string; email: string; fullName?: string } | null>(() => {
    // Restore session from localStorage on startup
    const uid = localStorage.getItem("agriscan_cached_uid");
    const email = localStorage.getItem("agriscan_cached_email");
    const fullName = localStorage.getItem("agriscan_cached_name") || "";
    const sessionRestored = localStorage.getItem("agriscan_session_restored") === "true";
    if (uid && email && sessionRestored) return { uid, email, fullName };
    return null;
  });
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState<boolean>(() => {
    return localStorage.getItem("agriscan_guest_allowed") === "true";
  });

  // Helper fetch method with transparent JWT auth token insertion
  async function apiFetch(path: string, options: RequestInit = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    } as Record<string, string>;

    const token = localStorage.getItem("agriscan_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(path, { ...options, headers });
    if (!res.ok) {
      const errText = await res.text();
      let errJSON;
      try { errJSON = JSON.parse(errText); } catch (e) {}
      throw new Error(errJSON?.error || errText || `HTTP error ${res.status}`);
    }
    return res.json();
  }


  // Helper to parse file and upload it to Supabase Cloud SQL storage bucket
  const uploadFileToStorage = async (file: File): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        try {
          const payload = {
            fileName: file.name,
            mimeType: file.type || "image/jpeg",
            fileData: base64Data,
          };
          const res = await apiFetch("/api/storage/upload", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          resolve(res.url); // Returns the "/api/storage/file/:fileId" endpoint
        } catch (err) {
          console.error("Storage upload failed, falling back to local base64:", err);
          resolve(base64Data); // Fallback to base64 if upload fails
        }
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  };

  // Authenticate with Google popup
  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      const result = await signInWithPopup(auth, provider);
      const userObj = result.user;
      
      // Get our backend JWT token
      const res = await fetch("/api/auth/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: userObj.uid,
          email: userObj.email || "",
          fullName: userObj.displayName || ""
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Social auth failed on backend");

      // Store token and user info
      localStorage.setItem("agriscan_token", data.token);
      localStorage.setItem("agriscan_cached_uid", data.uid);
      localStorage.setItem("agriscan_cached_email", data.email || "");
      localStorage.setItem("agriscan_cached_name", data.fullName || "");
      localStorage.setItem("agriscan_session_restored", "true");
      localStorage.removeItem("agriscan_explicit_logout");

      setUser(userObj);
      showToast(`Welcome back, ${userObj.displayName || "Farmer"}!`, "success");
    } catch (error) {
      console.error("Google Sign-in failed:", error);
      showToast("Google Sign-In failed or was cancelled.", "error");
    }
  };

  // Listen for login events dispatched from LoginPage
  useEffect(() => {
    const handleLogin = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.uid) {
        setUser({ uid: detail.uid, email: detail.email, fullName: detail.fullName || detail.email.split("@")[0] });
        setIsGuestMode(false);
        const displayName = detail.fullName || detail.email.split("@")[0] || "Farmer";
        const email = detail.email || "";
        setUserName(displayName);
        setUserEmail(email);
        setTempName(displayName);
        setTempEmail(email);
        localStorage.setItem("agriscan_profile_name", displayName);
        localStorage.setItem("agriscan_profile_email", email);
        setPersonalInfo(prev => {
          const updated = { ...prev, fullName: displayName };
          localStorage.setItem("agriscan_personal_info", JSON.stringify(updated));
          return updated;
        });
      }
    };

    window.addEventListener("agriscan_login", handleLogin);
    return () => window.removeEventListener("agriscan_login", handleLogin);
  }, []);

  const [activeTab, setActiveTab] = useState<"crops" | "scan" | "settings">("crops");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCropId, setSelectedCropId] = useState<string | null>(null);
  const [portfolioViewMode, setPortfolioViewMode] = useState<"index" | "history" | "logs" | "pest_guide">("index");

  // Support Chatbot states
  const [isSupportChatOpen, setIsSupportChatOpen] = useState(false);
  const [supportMessages, setSupportMessages] = useState<{ sender: "user" | "bot"; text: string; time: string; showEmailBtn?: boolean }[]>([]);
  const [newSupportMessage, setNewSupportMessage] = useState("");
  const [supportBotLoading, setSupportBotLoading] = useState(false);

  useEffect(() => {
    setPortfolioViewMode("index");
  }, [selectedCropId]);

  // Touch gesture swipe navigation
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('input[type="range"]') || 
      target.closest('.no-swipe') ||
      isSupportChatOpen
    ) {
      return;
    }
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    
    const minDistance = 60; // minimum touch distance
    
    if (Math.abs(deltaX) > minDistance && Math.abs(deltaX) > Math.abs(deltaY) * 1.8) {
      if (deltaX < 0) {
        // Swipe Left (crops -> scan -> settings)
        if (activeTab === "crops" && !selectedCropId) {
          setActiveTab("scan");
        } else if (activeTab === "scan") {
          setActiveTab("settings");
        }
      } else {
        // Swipe Right (settings -> scan -> crops)
        if (activeTab === "settings") {
          setActiveTab("scan");
        } else if (activeTab === "scan") {
          setActiveTab("crops");
        }
      }
    }
    
    setTouchStartX(null);
    setTouchStartY(null);
  };

  const t = (key: keyof typeof translations["English (US)"]): string => {
    const dict = translations[appLanguage as keyof typeof translations] || translations["English (US)"];
    return dict[key] || translations["English (US)"][key];
  };

  useEffect(() => {
    if (isSupportChatOpen && supportMessages.length === 0) {
      setSupportMessages([
        {
          sender: "bot",
          text: "Hello! I am your AgriScan Support Assistant. I know everything about this app. Ask me about crop portfolios, leaf scans, or application preferences! If I can't help, I will offer you choices to contact our specialized support team directly.",
          time: "Just now"
        }
      ]);
    }
  }, [isSupportChatOpen]);

  const handleSendSupportMsg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupportMessage.trim() || supportBotLoading) return;

    const userText = newSupportMessage.trim();
    setNewSupportMessage("");
    setSupportMessages((prev) => [...prev, { sender: "user", text: userText, time: "Just now" }]);
    setSupportBotLoading(true);

    try {
      const response = await fetch("/api/support-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "support", message: userText, history: supportMessages.map(m => ({ sender: m.sender, text: m.text })) }),
      });

      if (response.ok) {
        const data = await response.json();
        setSupportMessages((prev) => [...prev, { sender: "bot", text: data.reply, time: "Just now" }]);
      } else {
        throw new Error("API failed");
      }
    } catch (err) {
      // Fallback local heuristics chatbot logic in case of network issue or no key configured
      setTimeout(() => {
        const lower = userText.toLowerCase();
        let reply = "";
        
        if (lower.includes("portfolio") || lower.includes("crop") || lower.includes("add") || lower.includes("delete") || lower.includes("create")) {
          reply = "To manage Crop Portfolios in AgriScan AI, you can click the floating '+' button on the main tab to register a new crop. To delete one, simply click the red trashcan icon at the top of any portfolio card. Live soil metrics are updated via growth logs inside the portfolio details.";
        } else if (lower.includes("scan") || lower.includes("photo") || lower.includes("diagn") || lower.includes("disease") || lower.includes("leaf")) {
          reply = "To run plant disease diagnostics, use the 'Quick Scan' center button or open a specific Crop Portfolio and choose 'Analyze Plant Health'. Take or upload a clear leaf micrograph of the diseased tissue. Our high-fidelity neural system will automatically yield identification keys and treatments.";
        } else if (lower.includes("language") || lower.includes("translate") || lower.includes("theme") || lower.includes("color") || lower.includes("spanish") || lower.includes("french") || lower.includes("english")) {
          reply = "Preferences are controlled directly on the Settings screen. For Theme selection, click matching badge nodes (Forest, Charcoal, Sepia, Ocean). For system language, click the Language row to cycle instantly through English, Español, and Français.";
        } else if (lower.includes("reset") || lower.includes("logout") || lower.includes("cache")) {
          reply = "The 'Log Out & Reset Cache' action at the bottom of the Settings panel wipes stored portfolio changes and resets the system to default factory state safely.";
        } else {
          reply = "I apologize, but I am not certain on how to resolve that specific inquiry. If you need custom support or if I wasn't able to help, you can contact our specialized team at pontiacmadegeek@gmail.com or ky383201@gmail.com, or email our lead developer Daniel Frimpong directly at daniel.frimpong003@stu.ucc.edu.gh.";
        }

        setSupportMessages((prev) => [...prev, { sender: "bot", text: reply, time: "Just now", showEmailBtn: true }]);
      }, 800);
    } finally {
      setSupportBotLoading(false);
    }
  };

  const [cropPortfolios, setCropPortfolios] = useState<CropPortfolio[]>([]);

  // System Sync Engine: Real-time Cloud database binding with secure local-offline fallback
  useEffect(() => {
    const loadLocalStoragePortfolios = () => {
      try {
        const saved = localStorage.getItem("agriscan_portfolios");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setCropPortfolios(deduplicatePortfolios(parsed));
            return;
          }
        }
      } catch (e) {
        console.error("Error loading portfolios from localStorage:", e);
      }
      setCropPortfolios([]);
    };

    if (user) {
      const syncAndLoad = async () => {
        try {
          // Sync User info on Login
          await apiFetch("/api/users/sync", { method: "POST" });
          
          // Get portfolios from Cloud SQL Database
          const cloudList = await apiFetch("/api/portfolios");
          setCropPortfolios(deduplicatePortfolios(cloudList));
          
          showToast("Cloud portfolios synchronized completely!", "success");
        } catch (err: any) {
          console.error("Cloud SQL synchronisation failed:", err);
          showToast("Offline mode. Loading local cache.", "info");
          loadLocalStoragePortfolios();
        }
      };
      
      syncAndLoad();
    } else {
      loadLocalStoragePortfolios();
    }
  }, [user]);

  // Save changes to localstorage if offline guest mode
  useEffect(() => {
    if (!user && cropPortfolios.length > 0) {
      localStorage.setItem("agriscan_portfolios", JSON.stringify(cropPortfolios));
    }
  }, [cropPortfolios, user]);

  const lastSyncedPortfoliosRef = useRef<string>("");
  
  // Camera & Diagnostics state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadedBase64, setUploadedBase64] = useState<string | null>(null);
  const [selectedPresetImage, setSelectedPresetImage] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<{
    healthStatus: StatusType;
    pestOrDisease: string;
    severity: string;
    description: string;
    solutions: string[];
    cropName: string;
    botanicalName?: string;
    plantFamily?: string;
    confidence?: string;
    healthScore?: number;
    aboutPlant?: string;
    pruningTips?: string[];
    careTips?: string[];
    imageUrl: string;
    diagnosedVia?: string;
  } | null>(null);

  const [activeResultTab, setActiveResultTab] = useState<"identify" | "diseases" | "solutions" | "pruning" | "care">("identify");

  // Active Portfolio ID being target of a scan session (initiated from inside a portfolio)
  const [activeScanningPortfolioId, setActiveScanningPortfolioId] = useState<string | null>(null);

  // Selection of saving destination: "NEW" or a portfolio ID
  const [saveTargetPortfolioId, setSaveTargetPortfolioId] = useState<string>("NEW");

  // Expert Chat Drawer mock state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatTopic, setChatTopic] = useState("");
  const [chatMessages, setChatMessages] = useState<{ sender: "user" | "expert"; text: string; time: string }[]>([]);
  const [newMessageText, setNewMessageText] = useState("");

  // Gemini AI Chatbot State
  const [isGeminiChatOpen, setIsGeminiChatOpen] = useState(false);
  const [geminiMessages, setGeminiMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([
    { role: "assistant", text: "Hello! I'm AgriScan AI Assistant powered by Gemini. Ask me anything about crop diseases, plant care, pest management, or farming best practices." }
  ]);
  const [geminiInput, setGeminiInput] = useState("");
  const [geminiLoading, setGeminiLoading] = useState(false);
  const geminiChatEndRef = useRef<HTMLDivElement>(null);

  // Create New Portfolio State
  const [isCreatePortfolioOpen, setIsCreatePortfolioOpen] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState("");
  const [newPortfolioLocation, setNewPortfolioLocation] = useState("");
  const [newPortfolioStage, setNewPortfolioStage] = useState("Seedling");
  const [newPortfolioMoisture, setNewPortfolioMoisture] = useState(60);
  const [newPortfolioEstYield, setNewPortfolioEstYield] = useState("2.5t");
  const [newPortfolioImage, setNewPortfolioImage] = useState("https://lh3.googleusercontent.com/aida-public/AB6AXuCJPM5FUbYJekt9TD8bqwPtsgDl_47MJIPWtWApw_1qB3pq9jeQ1w781H-deTvEheM4wV_wtKx3Rn6KZc8qxc3wlFEvW7ifTUrZyQ21kLNSJQsuXXt7YOOj4e1grbOkl3kwXdOXfVJYSoWX9W4L4CFaTJDDjB0eCNzjmN50TjnQsIuHKI3Yh8IGIN4LR9cKaJ8KebLuvm-A5ruAsRwtAOPgtyHaub62hio7o-zz6RlMqXPx-tg47s4CKs4negX65IJ-xe0ZWoA1F-Ze");

  // Add Growth Log Form State
  const [newLogStage, setNewLogStage] = useState<string>("Vegetative");
  const [newLogHeight, setNewLogHeight] = useState<number>(30);
  const [newLogNotes, setNewLogNotes] = useState<string>("Observed physical development parameters look normal and stable.");
  const [isAddingGrowthLog, setIsAddingGrowthLog] = useState<boolean>(false);

  const handleCreatePortfolioSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPortfolioName.trim()) {
      showToast("Please enter a crop name", "error");
      return;
    }

    const newID = "portfolio-" + Date.now();
    const newPortfolio: CropPortfolio = {
      id: newID,
      name: newPortfolioName,
      location: newPortfolioLocation.trim() || "",
      lastScan: "Just now",
      status: "Healthy",
      image: newPortfolioImage,
      healthScore: 100,
      moisture: Number(newPortfolioMoisture) || 60,
      estYield: newPortfolioEstYield || "2.5t",
      growthStage: newPortfolioStage,
      statsHistory: [
        { date: "Current", health: 100, moisture: Number(newPortfolioMoisture) || 60 }
      ],
      activities: [
        {
          id: "act-init-" + Date.now(),
          type: "success",
          title: "Portfolio initialized",
          time: "Just now",
          description: `Custom crop portfolio successfully established for ${newPortfolioName}${newPortfolioLocation ? " at " + newPortfolioLocation : ""} at the ${newPortfolioStage} stage.`
        }
      ]
    };

    if (user) {
      newPortfolio.ownerId = user.uid;
      try {
        await apiFetch("/api/portfolios", {
          method: "POST",
          body: JSON.stringify(newPortfolio)
        });
        setCropPortfolios((prev) => [newPortfolio, ...prev]);
        showToast(`Portfolio "${newPortfolioName}" synced to Cloud SQL!`, "success");
      } catch (err: any) {
        showToast(`Syncing to cloud failed: ${err.message}`, "error");
      }
    } else {
      setCropPortfolios((prev) => [newPortfolio, ...prev]);
      showToast(`Portfolio "${newPortfolioName}" created!`, "success");
    }

    // Reset fields
    setNewPortfolioName("");
    setNewPortfolioLocation("");
    setNewPortfolioStage("Seedling");
    setNewPortfolioMoisture(60);
    setNewPortfolioEstYield("2.5t");
    setNewPortfolioImage("https://lh3.googleusercontent.com/aida-public/AB6AXuCJPM5FUbYJekt9TD8bqwPtsgDl_47MJIPWtWApw_1qB3pq9jeQ1w781H-deTvEheM4wV_wtKx3Rn6KZc8qxc3wlFEvW7ifTUrZyQ21kLNSJQsuXXt7YOOj4e1grbOkl3kwXdOXfVJYSoWX9W4L4CFaTJDDjB0eCNzjmN50TjnQsIuHKI3Yh8IGIN4LR9cKaJ8KebLuvm-A5ruAsRwtAOPgtyHaub62hio7o-zz6RlMqXPx-tg47s4CKs4negX65IJ-xe0ZWoA1F-Ze");
    setIsCreatePortfolioOpen(false);
  };

  const [flashOn, setFlashOn] = useState(false);
  const [diagnosticsLog, setDiagnosticsLog] = useState<string[]>([]);
  const [apiState, setApiState] = useState<{ initialized: boolean; loading: boolean }>({
    initialized: false,
    loading: true
  });

  // Settings customizable state variables
  const [pestAlerts, setPestAlerts] = useState(true);
  const [weatherUpdates, setWeatherUpdates] = useState(false);
  const [appLanguage, setAppLanguage] = useState("English (US)");
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem("agriscan_profile_name") || "Thomas Miller";
  });
  const [userEmail, setUserEmail] = useState(() => {
    return localStorage.getItem("agriscan_profile_email") || "t.miller@greenfield.farm";
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempName, setTempName] = useState(() => {
    return localStorage.getItem("agriscan_profile_name") || "Thomas Miller";
  });
  const [tempEmail, setTempEmail] = useState(() => {
    return localStorage.getItem("agriscan_profile_email") || "t.miller@greenfield.farm";
  });

  // Personal Info and Security Drawers State
  const [isPersonalInfoOpen, setIsPersonalInfoOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);

  // Loaded personal information state with default fallback values
  const [personalInfo, setPersonalInfo] = useState(() => {
    const saved = localStorage.getItem("agriscan_personal_info");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return {
      fullName: "Thomas Miller",
      phone: "+1 555-019-2834",
      region: "Midwest Grasslands",
      farmingFocus: "Maize & Soybeans",
      acreage: "120 acres"
    };
  });

  const [tempPersonalInfo, setTempPersonalInfo] = useState({ ...personalInfo });

  // Security elements
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSecurityLoading, setIsSecurityLoading] = useState(false);

  // Passcode Lock Settings
  const [isPinEnabled, setIsPinEnabled] = useState(() => {
    return localStorage.getItem("agriscan_pin_enabled") === "true";
  });
  const [pinCode, setPinCode] = useState(() => {
    return localStorage.getItem("agriscan_pin_code") || "";
  });
  const [tempPin, setTempPin] = useState(() => {
    return localStorage.getItem("agriscan_pin_code") || "";
  });

  // Is App Locked?
  const [isAppLocked, setIsAppLocked] = useState(() => {
    return localStorage.getItem("agriscan_pin_enabled") === "true" && !!localStorage.getItem("agriscan_pin_code");
  });
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState(false);

  // PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  const currentUserName = userName;
  const currentUserEmail = userEmail;
  const currentUserPhoto = "https://lh3.googleusercontent.com/aida-public/AB6AXuDfG1pC4cpXndz7muzlznPJE5uRod58oavdFKhU5Dtx9DA3c5Z5wtF_qJpoU3DvpI7oL6FZtEGI21vk7YlSOans4JtTFN1lwFFfTUNZg8R8X_3OZFo30lVWCEKvh4LwKZAoLTc2K9gFuLXBpZIBd4m-S3bab7x66qOV5seMVbuKH011cXeC2xwhmarowVss6ant2wFyQ-7xIwxI22t7_oOg7_BFiQOUlnQ1iwqPGEgkgbwu1Gbpg23KQWimG9fIvROzDc3A_XlFY9QJ";
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "error" } | null>(null);
  const [pendingDeletePortfolioId, setPendingDeletePortfolioId] = useState<string | null>(null);
  const [pendingDeleteScanId, setPendingDeleteScanId] = useState<string | null>(null);
  const [pendingDeleteLogId, setPendingDeleteLogId] = useState<string | null>(null);
  const [pendingReset, setPendingReset] = useState(false);

  // Helper translations for dynamically switching inline values
  const translateGrowthStage = (stage: string) => {
    if (appLanguage === "Español (ES)") {
      const map: Record<string, string> = {
        "Seedling": "Plántula",
        "Vegetative": "Vegetativo",
        "Tasseling": "Floración",
        "Grain Fill": "Llenado de grano",
        "Maturity": "Madurez"
      };
      return map[stage] || stage;
    }
    if (appLanguage === "Français (FR)") {
      const map: Record<string, string> = {
        "Seedling": "Semis",
        "Vegetative": "Végétatif",
        "Tasseling": "Floraison",
        "Grain Fill": "Remplissage",
        "Maturity": "Maturité"
      };
      return map[stage] || stage;
    }
    return stage;
  };

  // PWA Install Prompt Listener
  useEffect(() => {
    const dismissed = localStorage.getItem('agriscan_pwa_dismissed');
    const installed = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (installed) {
      setIsAppInstalled(true);
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!dismissed) {
        setTimeout(() => setShowInstallBanner(true), 3000);
      }
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setShowInstallBanner(false);
      setDeferredPrompt(null);
      showToast('AgriScan AI installed successfully!', 'success');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      showToast('Installing AgriScan AI...', 'success');
    }
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem('agriscan_pwa_dismissed', 'true');
  };

  // Auto-reset confirmation state after 4 seconds of inactivity
  useEffect(() => {
    if (pendingDeletePortfolioId) {
      const timer = setTimeout(() => setPendingDeletePortfolioId(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [pendingDeletePortfolioId]);

  useEffect(() => {
    if (pendingDeleteScanId) {
      const timer = setTimeout(() => setPendingDeleteScanId(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [pendingDeleteScanId]);

  useEffect(() => {
    if (pendingDeleteLogId) {
      const timer = setTimeout(() => setPendingDeleteLogId(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [pendingDeleteLogId]);

  useEffect(() => {
    if (pendingReset) {
      const timer = setTimeout(() => setPendingReset(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [pendingReset]);

  const [appTheme, setAppTheme] = useState<string>(() => {
    const saved = localStorage.getItem("agriscan_app_theme") || "light";
    if (saved === "charcoal" || saved === "dark") return "dark";
    return "light";
  });

  useEffect(() => {
    localStorage.setItem("agriscan_app_theme", appTheme);
    if (appTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [appTheme]);

  const themes: Record<string, React.CSSProperties> = {
    light: {},
    dark: {
      "--color-background": "#121212",
      "--color-on-background": "#EFF2EF",
      "--color-surface": "#1A1D1A",
      "--color-on-surface": "#EFF2EF",
      "--color-surface-dim": "#151715",
      "--color-surface-bright": "#1E221E",
      "--color-surface-variant": "#282E29",
      "--color-on-surface-variant": "#B0B8B1",
      "--color-surface-container-lowest": "#111311",
      "--color-surface-container-low": "#161916",
      "--color-surface-container": "#1C201D",
      "--color-surface-container-high": "#232824",
      "--color-surface-container-highest": "#2A302B",
      "--color-outline": "#8A928C",
      "--color-outline-variant": "#3F4841",
      "--color-primary": "#4EA876",
      "--color-on-primary": "#121212",
      "--color-primary-container": "#1B3E2D",
      "--color-on-primary-container": "#9FDDBA",
      "--color-secondary": "#99A98F",
      "--color-on-secondary": "#1E241E",
      "--color-secondary-container": "#2E3D2A",
      "--color-on-secondary-container": "#D0E1C9",
      "--color-tertiary": "#DDA15E",
      "--color-on-tertiary": "#221100"
    }
  };

  const [preferredModel, setPreferredModel] = useState<string>(() => {
    return localStorage.getItem("agriscan_preferred_model") || "gemini-3.5-flash";
  });

  useEffect(() => {
    localStorage.setItem("agriscan_preferred_model", preferredModel);
  }, [preferredModel]);

  const showToast = (message: string, type: "success" | "info" | "error" = "success") => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Save changes to localStorage only if in guest/offline mode
  useEffect(() => {
    if (!user) {
      localStorage.setItem("agriscan_portfolios", JSON.stringify(cropPortfolios));
    }
  }, [cropPortfolios, user]);



  // Check API health on load
  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        setApiState({ initialized: data.apiInitialized, loading: false });
      })
      .catch(() => {
        setApiState({ initialized: false, loading: false });
      });
  }, []);
  // Returns a short educational summary for the identified plant species
  const getPlantSummary = (crop: string): string => {
    const c = crop.toLowerCase();
    if (c.includes("tomato")) {
      return "Tomatoes (Solanum lycopersicum) are one of the world's most widely cultivated vegetables, native to South America. They thrive in warm climates and are rich in lycopene, vitamins C and K, making them a staple in global diets.";
    } else if (c.includes("apple")) {
      return "Apple trees (Malus domestica) are deciduous fruit trees from the Rosaceae family, originating in Central Asia. They require cold winters for dormancy and produce sweet to tart fruits rich in dietary fibre and antioxidants.";
    } else if (c.includes("grape")) {
      return "Grapevines (Vitis vinifera) are woody climbing plants cultivated for thousands of years across Mediterranean regions. Their fruit is used for fresh eating, wine production, and raisins, making them one of the most economically important crops worldwide.";
    } else if (c.includes("corn") || c.includes("maize")) {
      return "Maize (Zea mays) is a cereal grain first domesticated in southern Mexico over 10,000 years ago. It is the world's largest produced grain crop, used for food, animal feed, and biofuel across more than 160 countries.";
    } else if (c.includes("potato")) {
      return "Potatoes (Solanum tuberosum) are starchy tubers native to the Andes of South America and the world's fourth-largest food crop. They are a rich source of carbohydrates, potassium, and vitamin C, grown in over 100 countries.";
    } else if (c.includes("bell pepper") || c.includes("pepper")) {
      return "Bell peppers (Capsicum annuum) are colourful fruit vegetables from the nightshade family, native to Central and South America. They are rich in vitamins A and C, with flavours ranging from sweet when ripe to mildly bitter when green.";
    } else if (c.includes("peach")) {
      return "Peach trees (Prunus persica) originated in Northwest China and have been cultivated for over 8,000 years. They produce sweet, juicy stone fruits rich in vitamins A and C, thriving in temperate regions with cold winters and warm summers.";
    } else if (c.includes("strawberry")) {
      return "Strawberries (Fragaria × ananassa) are a widely grown hybrid species cultivated worldwide for their distinctive aroma and bright red fruit. They are excellent sources of vitamin C, manganese, and heart-protective antioxidants.";
    } else if (c.includes("blueberry")) {
      return "Blueberries (Vaccinium corymbosum) are flowering shrubs native to North America that produce small, deep-blue berries packed with antioxidants. Their high anthocyanin content supports heart and brain health, earning them superfood status.";
    } else if (c.includes("cherry")) {
      return "Cherry trees (Prunus avium) are deciduous trees prized for both their ornamental blossoms and sweet fruits. Native to Europe and Western Asia, cherries are rich in antioxidants and anti-inflammatory compounds.";
    } else if (c.includes("raspberry")) {
      return "Raspberries (Rubus idaeus) are perennial shrubs in the rose family, native to Europe and northern Asia. Their aggregate berries are highly nutritious, containing fibre, vitamin C, and potent antioxidants.";
    } else if (c.includes("soyabean") || c.includes("soybean")) {
      return "Soybeans (Glycine max) are a legume native to East Asia and among the most important crops globally for food and industry. They are exceptionally high in protein and oil, forming a key ingredient in tofu, soy milk, and animal feed.";
    } else if (c.includes("squash")) {
      return "Squash (Cucurbita spp.) encompasses a diverse group of gourd vegetables native to the Americas, cultivated for thousands of years. They are rich in vitamins A and C, potassium, and fibre, with wide culinary uses across summer and winter varieties.";
    } else {
      return `${crop} is a significant agricultural crop cultivated across various regions for its nutritional and economic value. Proper disease monitoring and care are essential for maintaining optimal yield and plant health throughout the growing season.`;
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {

    setSearchQuery(e.target.value);
  };

  const filteredPortfolios = cropPortfolios.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.scienceName && p.scienceName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const selectedCrop = cropPortfolios.find(p => p.id === selectedCropId);

  // Triggering diagnosis
  const startDiagnostics = async (imageSrc: string, cropNameHint: string) => {
    setIsScanning(true);
    setAnalyzing(false);

    // Dynamic localization for real-time telemetry logs
    let initialLogs: string[] = [];
    let stage1Logs: string[] = [];
    let stage2Logs: string[] = [];

    if (appLanguage === "Español (ES)") {
      initialLogs = [
        "Inicializando módulo de telemetría...",
        "Activando sensores multiespectrales...",
        "Capturando definición foliar de alto contraste..."
      ];
      stage1Logs = [
        "Compilando matriz visual bruta...",
        "Transmitiendo carga al servidor de patología..."
      ];
      stage2Logs = [
        "Conectando a redes de patología de IA...",
        "Evaluando márgenes celulares y de pigmento de la hoja..."
      ];
    } else if (appLanguage === "Français (FR)") {
      initialLogs = [
        "Initialisation du module de télémétrie...",
        "Activation des capteurs multispectraux...",
        "Capture de la définition des feuilles à haut contraste..."
      ];
      stage1Logs = [
        "Compilation de la matrice visuelle brute...",
        "Transmission de la charge utile au cloud de pathologie..."
      ];
      stage2Logs = [
        "Connexion aux réseaux de pathologie IA...",
        "Évaluation des marges cellulaires et pigmentaires des feuilles..."
      ];
    } else {
      initialLogs = [
        "Initializing telemetry module...",
        "Activating multispectral sensors...",
        "Capturing high-contrast leaf definition..."
      ];
      stage1Logs = [
        "Compiling raw visual matrix...",
        "Transmitting payload to pathology cloud..."
      ];
      stage2Logs = [
        "Connecting to AI Pathology networks...",
        "Evaluating leaf cellular & pigment margins..."
      ];
    }

    setDiagnosticsLog(initialLogs);

    // Helper: convert base64 data URL to a File/Blob for multipart upload
    const base64ToFile = (base64: string, filename: string): File => {
      const arr = base64.split(",");
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) u8arr[n] = bstr.charCodeAt(n);
      return new File([u8arr], filename, { type: mime });
    };

    // Build multipart FormData for the disease classifier API
    const formData = new FormData();
    formData.append("file", base64ToFile(imageSrc, "leaf_scan.jpg"));

    const ML_PROXY_URL = "/api/ml-predict";

    // Fire the network call immediately
    const fetchPromise = fetch(ML_PROXY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ image: imageSrc, language: appLanguage }),
    });

    // Run parallel high-speed localized step updates
    const runFastVisualSequence = async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      setDiagnosticsLog((prev) => [...prev, ...stage1Logs]);
      setAnalyzing(true);
      setIsScanning(false);

      await new Promise((resolve) => setTimeout(resolve, 200));
      setDiagnosticsLog((prev) => [...prev, ...stage2Logs]);
    };

    try {
      // Execute the network request and the rapid visual logs concurrently
      const [response] = await Promise.all([
        fetchPromise,
        runFastVisualSequence()
      ]);

      if (!response.ok) {
        throw new Error("Diagnosis server-side failure");
      }

      const apiResult = await response.json();

      // --- Transform the PlantDoc API response into app's result shape ---
      // predicted_class format: "Plant___Disease" e.g. "Tomato___Early_blight"
      const rawLabel = apiResult.predicted_class || "Unknown";
      const labelParts = rawLabel.replace(/___/g, " — ").replace(/_/g, " ");
      const plantParts = rawLabel.split("___");
      const cropName = plantParts[0] ? plantParts[0].replace(/_/g, " ") : cropNameHint;
      const diseaseName = plantParts[1] ? plantParts[1].replace(/_/g, " ") : "Unknown";
      
      const isHealthy = diseaseName.toLowerCase().includes("healthy");
      const apiConfidence = apiResult.confidence || 0;
      const confidencePercent = Math.round(apiConfidence * 100);
      
      // Derive severity from confidence
      let severity: string;
      if (isHealthy) {
        severity = "None";
      } else if (apiConfidence > 0.85) {
        severity = "High";
      } else if (apiConfidence > 0.6) {
        severity = "Moderate";
      } else {
        severity = "Low";
      }

      // Derive health score
      const healthScore = isHealthy 
        ? Math.min(98, 80 + Math.round(apiConfidence * 20)) 
        : Math.max(15, Math.round((1 - apiConfidence) * 70));

      // Build top-5 readable predictions
      const top5 = (apiResult.top5 || []).map((p: { label: string; confidence: number }) => ({
        label: p.label.replace(/___/g, " — ").replace(/_/g, " "),
        confidence: Math.round(p.confidence * 100)
      }));

      // Generate contextual solutions based on disease
      const generateSolutions = (disease: string): string[] => {
        if (isHealthy) return [
          "Continue regular watering and fertilization schedule.",
          "Monitor for any emerging pest or disease symptoms.",
          "Maintain proper spacing for adequate air circulation."
        ];
        const diseaseL = disease.toLowerCase();
        const solutions: string[] = [];
        if (diseaseL.includes("blight")) {
          solutions.push("Apply copper-based fungicide as preventive treatment.");
          solutions.push("Remove and destroy affected plant parts immediately.");
          solutions.push("Ensure proper spacing for air circulation to reduce humidity.");
          solutions.push("Avoid overhead watering — use drip irrigation instead.");
        } else if (diseaseL.includes("rust")) {
          solutions.push("Apply sulfur-based or triazole fungicide.");
          solutions.push("Remove infected leaves and dispose of them away from the field.");
          solutions.push("Improve air circulation by proper plant spacing.");
        } else if (diseaseL.includes("spot") || diseaseL.includes("scab")) {
          solutions.push("Apply appropriate fungicide (mancozeb or chlorothalonil).");
          solutions.push("Practice crop rotation to reduce pathogen buildup.");
          solutions.push("Remove and destroy infected plant debris after harvest.");
        } else if (diseaseL.includes("mold") || diseaseL.includes("mildew")) {
          solutions.push("Apply neem oil or potassium bicarbonate spray.");
          solutions.push("Increase air circulation and reduce plant density.");
          solutions.push("Avoid excessive nitrogen fertilization.");
        } else if (diseaseL.includes("virus") || diseaseL.includes("mosaic") || diseaseL.includes("curl")) {
          solutions.push("Remove and destroy infected plants to prevent spread.");
          solutions.push("Control aphid and whitefly vectors using insecticidal soap.");
          solutions.push("Use resistant varieties for future planting.");
        } else {
          solutions.push("Consult a local agricultural extension officer for diagnosis confirmation.");
          solutions.push("Apply a broad-spectrum fungicide as a preventive measure.");
          solutions.push("Improve field sanitation and remove affected plant material.");
          solutions.push("Monitor surrounding plants for symptom spread.");
        }
        return solutions;
      };

      const finalResult = {
        cropName: cropName,
        pestOrDisease: isHealthy ? "No disease detected — Healthy" : diseaseName,
        healthStatus: isHealthy ? "Healthy" : (severity === "High" ? "Sick" : "Normal"),
        severity: severity,
        confidence: confidencePercent,
        healthScore: healthScore,
        description: isHealthy
          ? `The ${cropName} specimen appears healthy with ${confidencePercent}% confidence. No visible signs of disease or pest damage detected by the MobileNetV2 pathology engine.`
          : `${diseaseName} detected on ${cropName} with ${confidencePercent}% confidence. Severity assessed as ${severity.toLowerCase()}. Immediate attention recommended.`,
        solutions: generateSolutions(diseaseName),
        botanicalName: cropName,
        plantFamily: cropName,
        aboutPlant: getPlantSummary(cropName),
        pruningTips: isHealthy 
          ? [
              "Regular pruning of dead or yellowing leaves promotes healthy growth and airflow.",
              "Trim crossing branches to improve canopy structure and light penetration.",
              "Remove spent flower heads to redirect energy toward fruit or foliage development."
            ]
          : [
              "Remove all visibly infected branches and leaves immediately.",
              "Sterilize pruning tools with 70% alcohol between cuts to prevent pathogen spread.",
              "Dispose of infected plant material away from the field — do not compost."
            ],
        careTips: isHealthy
          ? [
              "Maintain consistent watering, ensure adequate sunlight exposure daily.",
              "Apply balanced NPK fertilizer as needed based on growth stage.",
              "Monitor soil pH and moisture levels regularly for optimal conditions."
            ]
          : [
              `Isolate affected plants if possible to prevent ${diseaseName.toLowerCase()} spread.`,
              "Apply recommended treatment promptly and follow up within 7-10 days.",
              `Monitor surrounding plants daily for early signs of ${diseaseName.toLowerCase()}.`
            ],
        diagnosedVia: "MobileNetV2 (PlantDoc)",
        top5Predictions: top5,
        imageUrl: imageSrc
      };

      setScanResult(finalResult);
      setActiveResultTab("identify");
      
      // Auto-configure destination portfolio
      if (activeScanningPortfolioId) {
        setSaveTargetPortfolioId(activeScanningPortfolioId);
      } else if (selectedCropId) {
        setSaveTargetPortfolioId(selectedCropId);
      } else {
        setSaveTargetPortfolioId("NEW");
      }

    } catch (error) {
      console.error(error);
      const isSpanish = appLanguage === "Español (ES)";
      const isFrench = appLanguage === "Français (FR)";
      const errorMsg = isSpanish 
        ? "El portal de patología está procesando muchas solicitudes. Activando motor agrícola heurístico local..."
        : isFrench 
        ? "La passerelle de pathologie est occupée. Activation du moteur heuristique agronomique local..."
        : "Pathology gateway is busy. Activating local agronomic heuristic engine...";
      
      showToast(errorMsg, "info");

      // Execute fallback local offline heuristic
      try {
        const fallbackRes = await fetch("/api/analyze-crop", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            image: imageSrc,
            cropType: cropNameHint,
            language: appLanguage
          })
        });
        
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          fallbackData.imageUrl = imageSrc;
          setScanResult(fallbackData);
          setActiveResultTab("identify");
          
          if (activeScanningPortfolioId) {
            setSaveTargetPortfolioId(activeScanningPortfolioId);
          } else if (selectedCropId) {
            setSaveTargetPortfolioId(selectedCropId);
          } else {
            setSaveTargetPortfolioId("NEW");
          }
        } else {
          const errText = await fallbackRes.text();
          console.error("Fallback response failed:", fallbackRes.status, errText);
          showToast(`Local diagnostics failed: ${fallbackRes.status}`, "error");
        }
      } catch (fallbackErr) {
        console.error("Fallback engine network error:", fallbackErr);
        showToast("Diagnostics completely failed.", "error");
      }
    } finally {
      setIsScanning(false);
      setAnalyzing(false);
    }
  };

  const resetAllPortfolios = async () => {
    if (pendingReset) {
      if (user) {
        try {
          localStorage.removeItem("agriscan_token");
          localStorage.removeItem("agriscan_cached_uid");
          localStorage.removeItem("agriscan_cached_email");
          localStorage.removeItem("agriscan_cached_name");
          localStorage.removeItem("agriscan_session_restored");
          localStorage.setItem("agriscan_explicit_logout", "true");
          setUser(null);
          setIsGuestMode(false);
          localStorage.removeItem("agriscan_guest_allowed");
          setPendingReset(false);
          showToast("Signed out successfully.", "success");
        } catch (err) {
          console.error("Sign out fail:", err);
          showToast("Sign out failed", "error");
        }
      } else {
        setCropPortfolios(initialCropPortfolios);
        localStorage.removeItem("agriscan_portfolios");
        setIsGuestMode(false);
        localStorage.removeItem("agriscan_guest_allowed");
        setSelectedCropId(null);
        setScanResult(null);
        setPendingReset(false);
        showToast("App data reset to factory defaults", "info");
      }
    } else {
      setPendingReset(true);
      if (user) {
        showToast("Tap again to Sign Out from your Google Cloud Sync profile", "info");
      } else {
        showToast("Tap button again to reset to factory defaults", "info");
      }
    }
  };

  // Preset Leaf samples for easy testing without file upload
  const PRESET_PATHOLOGY_SAMPLES = [
    {
      name: "Aphids Infested Leaf",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAMa03Q0LMil4u3dcb4qv_froOWyJEf50P7UaB3JVnesfJ_MCMF7iFnA2abNNnShARcI_MYw3BqTlytLFEfNmzSaPkhUHhibkEebkuUCQ_ZcxjFrChtSyvpQ5k3cGbguK4PT6C4xp26J2EDaAXkN04k_wbVIUKpICOnMi5sx5mZ2Q3NlowYIqqD5bdOch90wG65OzpcpQYZqBWtrkg34Jm_FqCi8iVWDqrf2gZblyNz-KKLjErM0biBVEB7iix_j_aUU0s4tphHfQRP",
      cropHint: "Grapes / Plants"
    },
    {
      name: "Healthy Maize Crop",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCJPM5FUbYJekt9TD8bqwPtsgDl_47MJIPWtWApw_1qB3pq9jeQ1w781H-deTvEheM4wV_wtKx3Rn6KZc8qxc3wlFEvW7ifTUrZyQ21kLNSJQsuXXt7YOOj4e1grbOkl3kwXdOXfVJYSoWX9W4L4CFaTJDDjB0eCNzjmN50TjnQsIuHKI3Yh8IGIN4LR9cKaJ8KebLuvm-A5ruAsRwtAOPgtyHaub62hio7o-zz6RlMqXPx-tg47s4CKs4negX65IJ-xe0ZWoA1F-Ze",
      cropHint: "Maize"
    },
    {
      name: "Blight Infected Russet Potatoes",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAI3McbJA_Jxbm0KNH9c0_OHWkzVZwAbela8eV3yKjBAl9gQ4_91h7i3GReL9nbIJxaqlkDZfqd_x5iEnt6Lx1r_SnMbVLx9Ckdla8rvzHmEz0-guGI8Iuy7k9m3TYaNO-BEbWxMbDUl7bTGDxjHEvuTJYCrqyzjBDDGX-_P5BRDnlTXKCjw6IuHELOprc0lBKmFtYbcfc99F-0DEvtUWsK__1yJFVKvQVfZVkOhv138G2AiemSEoJ2xOKA-G8zDwLrmjuP16uV66I1",
      cropHint: "Russet potato foliage"
    }
  ];

  // Helper to handle local custom file uploads
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedBase64(reader.result as string);
      setSelectedPresetImage(null);
    };
    reader.readAsDataURL(file);
  };

  // Open Chat with Expert dialog
  const openExpertChat = (subject: string) => {
    setChatTopic(subject);
    setChatMessages([
      {
        sender: "expert",
        text: `Hello! I am Dr. Julian Vance, AgriScan Crop Pathology Consultant. I saw the telemetry for "${subject}". How is the density of this condition in your fields?`,
        time: "Just now"
      }
    ]);
    setIsChatOpen(true);
  };

  const sendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim()) return;

    const userMsg = newMessageText;
    setNewMessageText("");

    setChatMessages((prev) => [
      ...prev,
      { sender: "user", text: userMsg, time: "Just now" }
    ]);

    // Simulate expert response based on keywords
    setTimeout(() => {
      let responseText = "Understood. I advise applying organic treatments and isolating symptomatic plots immediately to shield nearby healthy plants.";
      if (userMsg.toLowerCase().includes("neem") || userMsg.toLowerCase().includes("apply")) {
        responseText = "Spot on. Direct pressure spraying on the leaf undersides at dusk is highly effective as pests shelter there.";
      } else if (userMsg.toLowerCase().includes("spread") || userMsg.toLowerCase().includes("scale")) {
        responseText = "Given the density, please ensure you sanitize all pruning tools after handling the infected plants to block spores transmission.";
      }
      setChatMessages((prev) => [
        ...prev,
        { sender: "expert", text: responseText, time: "Just now" }
      ]);
    }, 1500);
  };

  // Gemini AI Chatbot - send message handler
  const sendGeminiMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!geminiInput.trim() || geminiLoading) return;

    const userText = geminiInput.trim();
    setGeminiInput("");
    setGeminiMessages(prev => [...prev, { role: "user", text: userText }]);
    setGeminiLoading(true);

    // Build conversation history for Gemini
    const conversationHistory = geminiMessages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.text }]
    }));
    conversationHistory.push({ role: "user", parts: [{ text: userText }] });

    try {
      // Direct all chatbot traffic to our secure proxy backend which handles heuristics and API keys safely
      const res = await fetch("/api/support-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "pathologist",
          message: userText,
          history: geminiMessages.map(m => ({ sender: m.role, text: m.text }))
        })
      });

      if (!res.ok) throw new Error("Backend API error");
      const data = await res.json();
      const reply = data.reply || "I'm having trouble responding right now. Please try again.";
      setGeminiMessages(prev => [...prev, { role: "assistant", text: reply }]);
    } catch (err) {
      console.error("Gemini chat error:", err);
      setGeminiMessages(prev => [...prev, { role: "assistant", text: "Sorry, I couldn't get a response right now. Please try again in a moment." }]);
    } finally {
      setGeminiLoading(false);
      setTimeout(() => geminiChatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  };

  // Helper to handle custom cover page uploading for portfolios
  const handlePortfolioCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setNewPortfolioImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Helper to delete a crop portfolio
  const deletePortfolio = async (id: string, isBigButton: boolean = false) => {
    if (pendingDeletePortfolioId === id) {
      if (user) {
        try {
          await apiFetch(`/api/portfolios/${id}`, { method: "DELETE" });
          setCropPortfolios((prev) => prev.filter((p) => p.id !== id));
          setSelectedCropId(null);
          setPendingDeletePortfolioId(null);
          showToast("Portfolio deleted successfully from Cloud SQL", "info");
        } catch (err: any) {
          showToast(`Failed to delete: ${err.message}`, "error");
        }
      } else {
        setCropPortfolios((prev) => prev.filter((p) => p.id !== id));
        setSelectedCropId(null);
        setPendingDeletePortfolioId(null);
        showToast("Portfolio deleted successfully", "info");
      }
    } else {
      setPendingDeletePortfolioId(id);
      showToast(isBigButton ? "Tap button once more to confirm permanent portfolio deletion" : "Tap again to confirm delete", "info");
    }
  };

  // Helper to delete an individual scan history record
  const deleteScanRecord = async (portfolioId: string, scanId: string) => {
    if (pendingDeleteScanId === scanId) {
      const targetCrop = cropPortfolios.find((p) => p.id === portfolioId);
      if (targetCrop) {
        const updatedCrop = {
          ...targetCrop,
          scanHistory: (targetCrop.scanHistory || []).filter((h: any) => h.id !== scanId)
        };
        if (user) {
          try {
            await apiFetch(`/api/portfolios/${portfolioId}`, {
              method: "PUT",
              body: JSON.stringify(updatedCrop)
            });
            setCropPortfolios((prev) =>
              prev.map((p) => (p.id === portfolioId ? updatedCrop : p))
            );
            setPendingDeleteScanId(null);
            showToast("Diagnostic scan record deleted from Cloud SQL", "info");
          } catch (err: any) {
            showToast(`Delete failed: ${err.message}`, "error");
          }
        } else {
          setCropPortfolios((prev) =>
            prev.map((p) => (p.id === portfolioId ? updatedCrop : p))
          );
          setPendingDeleteScanId(null);
          showToast("Diagnostic scan record deleted", "info");
        }
      }
    } else {
      setPendingDeleteScanId(scanId);
      showToast("Tap again to delete scan history item", "info");
    }
  };

  // Helper to append a manual growth log record to a portfolio
  const addGrowthLog = async (portfolioId: string) => {
    if (newLogHeight <= 0) {
      showToast("Please enter a valid height count", "error");
      return;
    }

    const stageNames: Record<string, string> = {
      Seedling: "Seedling Stage",
      Vegetative: "Vegetative Growth",
      Tasseling: "Tasseling/Flowering",
      "Grain Fill": "Grain-Filling Stage",
      Maturity: "Ready/Maturity Stage"
    };

    const newLog = {
      id: "log-" + Date.now(),
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit" }) + " " + new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
      stage: stageNames[newLogStage] || newLogStage,
      height: Number(newLogHeight),
      notes: newLogNotes.trim() || "Observed physical parameters look normal and stable."
    };

    const targetCrop = cropPortfolios.find((p) => p.id === portfolioId);
    if (targetCrop) {
      const currentLogs = targetCrop.growthLogs !== undefined ? targetCrop.growthLogs : getDefaultLogsForCrop(targetCrop.id);
      const updatedCrop = {
        ...targetCrop,
        growthStage: newLogStage, // Keep portfolio stage synchronized in card
        growthLogs: [newLog, ...currentLogs]
      };

      if (user) {
        try {
          await apiFetch(`/api/portfolios/${portfolioId}`, {
            method: "PUT",
            body: JSON.stringify(updatedCrop)
          });
          setCropPortfolios((prev) =>
            prev.map((p) => (p.id === portfolioId ? updatedCrop : p))
          );
          setNewLogNotes("Observed physical development parameters look normal and stable.");
          setIsAddingGrowthLog(false);
          showToast("Growth log entry recorded in Cloud SQL!", "success");
        } catch (err: any) {
          showToast(`Add growth log failed: ${err.message}`, "error");
        }
      } else {
        setCropPortfolios((prev) =>
          prev.map((p) => (p.id === portfolioId ? updatedCrop : p))
        );
        setNewLogNotes("Observed physical development parameters look normal and stable.");
        setIsAddingGrowthLog(false);
        showToast("Growth log entry recorded successfully!", "success");
      }
    }
  };

  // Helper to resolve logs properly preserving initial data
  const getCropLogs = (crop: CropPortfolio | undefined) => {
    if (!crop) return [];
    if (crop.growthLogs !== undefined) {
      return crop.growthLogs;
    }
    return getDefaultLogsForCrop(crop.id);
  };

  // Helper to delete an individual growth log record
  const deleteGrowthLog = async (portfolioId: string, logId: string) => {
    if (pendingDeleteLogId === logId) {
      const targetCrop = cropPortfolios.find((p) => p.id === portfolioId);
      if (targetCrop) {
        const currentLogs = targetCrop.growthLogs !== undefined ? targetCrop.growthLogs : getDefaultLogsForCrop(targetCrop.id);
        const updatedCrop = {
          ...targetCrop,
          growthLogs: currentLogs.filter((l) => l.id !== logId)
        };
        if (user) {
          try {
            await apiFetch(`/api/portfolios/${portfolioId}`, {
              method: "PUT",
              body: JSON.stringify(updatedCrop)
            });
            setCropPortfolios((prev) =>
              prev.map((p) => (p.id === portfolioId ? updatedCrop : p))
            );
            setPendingDeleteLogId(null);
            showToast("Growth log entry removed from Cloud SQL", "info");
          } catch (err: any) {
            showToast(`Delete failed: ${err.message}`, "error");
          }
        } else {
          setCropPortfolios((prev) =>
            prev.map((p) => (p.id === portfolioId ? updatedCrop : p))
          );
          setPendingDeleteLogId(null);
          showToast("Growth log entry removed from records", "info");
        }
      }
    } else {
      setPendingDeleteLogId(logId);
      showToast("Tap again to delete this growth log", "info");
    }
  };

  // Dynamic pest lookup adapter based on name hint
  const getPestGuideForCrop = (cropName: string) => {
    const nameLower = cropName.toLowerCase();
    if (nameLower.includes("maize") || nameLower.includes("corn") || nameLower.includes("zea")) {
      return [
        {
          pest: "Fall Armyworm (Spodoptera frugiperda)",
          symptoms: "Ragged leaves with chew lesions, sawdust-like frass on stems and whorl canopies.",
          treatment: "Intercrop with silverleaf desmodium (repellent), spray neem oil, or run safe Bacillus thuringiensis application.",
          prevention: "Practice early planting, remove weeds, use push-pull cropping layouts or insect deterrent meshes."
        },
        {
          pest: "Maize Common Rust (Puccinia sorghi)",
          symptoms: "Powdery golden-orange pustules appearing on upper and lower surface leaf canvases.",
          treatment: "Formulate protective copper or sulphur botanical soaps. Prune and incinerate heavy infection clusters.",
          prevention: "Select rust-resistant hybrids, rotate fields with legumes, ensure spacious light penetration."
        },
        {
          pest: "Northern Corn Leaf Blight (Exserohilum turcicum)",
          symptoms: "Long, elliptical cigar-shaped lesions on leaves, grayish-green turning tan.",
          treatment: "Apply foliar bio-fungicides or copper hydroxide dusts at primary vegetative trigger stage.",
          prevention: "Destroy plant residues post-harvest, implement systematic crop rotations, select tolerant varieties."
        }
      ];
    } else if (nameLower.includes("tomato") || nameLower.includes("lycopersicum") || nameLower.includes("solanum")) {
      return [
        {
          pest: "Early Blight Blistering (Alternaria solani)",
          symptoms: "Target-board concentric dark leaf spot rings progressing upward from bottom foliage.",
          treatment: "Spray botanical copper soap solutions immediately. Strip yellowing lower branches.",
          prevention: "Water soil at base to avoid leaf splash, use organic mulch, practice three-year crop rotation."
        },
        {
          pest: "Two-Spotted Spider Mites (Tetranychidae)",
          symptoms: "Delicate silver webbing under petioles, light sand stippling on leaf surfaces.",
          treatment: "Administer high pressure cold water misting, release predatory phytoseiid mites, or spray diluted neem wash.",
          prevention: "Ensure high relative ambient humidity blocks, install cover crops, screen soil zones."
        },
        {
          pest: "Tomato Blossom End Rot",
          symptoms: "Dark, leathery water-soaked depressions at the blossom terminus of immature tomato shells.",
          treatment: "Foliar spray with calcium chloride solution, adjust soil water drainage parity.",
          prevention: "Maintain consistent soil irrigation, test soil calcium before planting, avoid high-nitrogen feeds."
        }
      ];
    } else if (nameLower.includes("wheat") || nameLower.includes("triticum")) {
      return [
        {
          pest: "Leaf Rust (Puccinia recondita)",
          symptoms: "Small, circular orange-brown pustules scattering on leaves, turning dark-brown as plant matures.",
          treatment: "Foliar treatment with sulfur dusting or neem extracts.",
          prevention: "Utilize resistant cultivars, eliminate volunteer wheat weeds, practice early seeding."
        },
        {
          pest: "Powdery Mildew (Blumeria graminis)",
          symptoms: "White to light-gray powdery fungal mats on leaves, stems, and heads, causing yellowing.",
          treatment: "Apply biological potassium bicarbonate foliar sprays.",
          prevention: "Avoid excessive nitrogen fertilizers, choose resistant crop seeds, optimize planting density."
        }
      ];
    } else if (nameLower.includes("soy") || nameLower.includes("max") || nameLower.includes("glycine")) {
      return [
        {
          pest: "Soybean Rust (Phakopsora pachyrhizi)",
          symptoms: "Pinpoint lesions turning tan-brown on lower leaf surfaces, leading to early defoliation.",
          treatment: "Spray early with neem oil blends or organic copper solutions.",
          prevention: "Plant early-maturing varieties, spacing rows wider to support leaf canopy drying."
        },
        {
          pest: "Bean Leaf Beetle (Cerotoma trifurcata)",
          symptoms: "Clean circular shot-holes chewed through leaf blade tissues, damaged pods.",
          treatment: "Introduce natural predators (such as ladybugs and parasitoid wasps), or apply pyrethrum soap spray.",
          prevention: "Postpone planting slightly to avoid overwintering beetles, maintain clean field borders."
        }
      ];
    } else {
      return [
        {
          pest: "Common Aphid Infestation (Aphididae)",
          symptoms: "Curled, sticky leaves with colonies of tiny yellow/green sap-sucking specimens.",
          treatment: "Wash away with sturdy spray hose jets, introduce ladybugs or spray organic neem soap formula.",
          prevention: "Introduce nectar-rich plants to attract hoverflies, skip premium nitrogen fertilizers."
        },
        {
          pest: "Leaf Spot Fungal Complex (Septoria spp.)",
          symptoms: "Scattered circular spots with dark margins and gray centers on leaves.",
          treatment: "Prune heavy low-hanging leaves, increase air circulation, dust with organic sulfur.",
          prevention: "Clean diagnostic tools regularly, buy certified disease-free seeds, rotate annual crops."
        }
      ];
    }
  };

  // Retrieve initial logs data for backward compatibility
  const getDefaultLogsForCrop = (id: string) => {
    if (id === "maize-alpha") {
      return [
        { id: "init-log-3", date: "Jun 06", stage: "Tasseling/Flowering", height: 115, notes: "Tassel spikes starting to emerge on upper stalks. Soil moisture matches baseline." },
        { id: "init-log-2", date: "May 25", stage: "Vegetative Growth", height: 45, notes: "Rapid vertical expansion. Stalk thickness is sturdy. Foliar nitrogen levels look excellent." },
        { id: "init-log-1", date: "May 10", stage: "Seedling Stage", height: 12, notes: "Foliage looks rich and healthy. Emergence counts are uniform across the sector." }
      ];
    } else if (id === "cherry-tomatoes") {
      return [
        { id: "init-log-5", date: "Jun 01", stage: "Vegetative Growth", height: 25, notes: "Sturdy main stems. Staking cages installed successfully to support weight." },
        { id: "init-log-4", date: "May 12", stage: "Seedling Stage", height: 8, notes: "First true leaves established. Transitioned successfully to nursery trays." }
      ];
    } else if (id === "russet-pot") {
      return [
        { id: "init-log-7", date: "Jun 01", stage: "Vegetative Growth", height: 35, notes: "Compound leaf canopy. Concentrated organic treatment begun for Early Blight prevention." },
        { id: "init-log-6", date: "May 15", stage: "Seedling Stage", height: 10, notes: "Strong green shoots emergence through soil beds." }
      ];
    } else {
      return [
        { id: "init-log-generic", date: "Jun 02", stage: "Seedling Stage", height: 15, notes: "Initial healthy vegetative development tracked cleanly in soil test logs." }
      ];
    }
  };

  const saveToPortfolio = async () => {
    if (!scanResult) return;
    
    if (saveTargetPortfolioId === "NEW") {
      // Create new crop portfolio item based on AI result
      const newId = "crop-" + Date.now();
      const newCrop: CropPortfolio = {
        id: newId,
        name: (scanResult.cropName || "Custom Crop") + " " + (scanResult.healthStatus === "Healthy" ? "Beta" : "Plot"),
        lastScan: "Just now",
        status: scanResult.healthStatus || "Healthy",
        image: scanResult.imageUrl || "https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=500&auto=format&fit=crop&q=60",
        healthScore: scanResult.healthScore || (scanResult.healthStatus === "Healthy" ? 95 : (scanResult.healthStatus === "Sick" ? 48 : 74)),
        moisture: 60,
        estYield: "3.5t",
        growthStage: "Vegetative",
        scienceName: scanResult.botanicalName || "Botanical diagnostic specimen",
        statsHistory: [
          { date: "Current Spot scan", health: scanResult.healthScore || (scanResult.healthStatus === "Healthy" ? 95 : 60), moisture: 60 }
        ],
        activities: [
          {
            id: "act-init",
            type: scanResult.healthStatus === "Healthy" ? "success" : "alert",
            title: scanResult.pestOrDisease || "Healthy Crop established",
            time: "Just now",
            description: scanResult.description || "Portfolio initialized via camera scan."
          }
        ],
        scanHistory: [
          {
            id: "hist-" + Date.now(),
            date: "Just now",
            cropName: scanResult.cropName || "Custom Specimen",
            pestOrDisease: scanResult.pestOrDisease || "Healthy",
            healthStatus: scanResult.healthStatus || "Healthy",
            severity: scanResult.severity || "Low",
            imageUrl: scanResult.imageUrl,
            description: scanResult.description,
            solutions: scanResult.solutions || [],
            botanicalName: scanResult.botanicalName,
            plantFamily: scanResult.plantFamily,
            confidence: scanResult.confidence,
            healthScore: scanResult.healthScore,
            aboutPlant: scanResult.aboutPlant,
            pruningTips: scanResult.pruningTips,
            careTips: scanResult.careTips,
            diagnosedVia: scanResult.diagnosedVia
          }
        ]
      };

      if (user) {
        newCrop.ownerId = user.uid;
        try {
          await apiFetch("/api/portfolios", {
            method: "POST",
            body: JSON.stringify(newCrop)
          });
          setCropPortfolios((prev) => [newCrop, ...prev]);
          showToast("Diagnostic analysis synced to new Cloud SQL Portfolio", "success");
        } catch (err: any) {
          showToast(`Cloud portfolio sync failed: ${err.message}`, "error");
        }
      } else {
        setCropPortfolios((prev) => [newCrop, ...prev]);
        showToast("Diagnostic analysis saved to local profile", "success");
      }
      setSelectedCropId(newId);
    } else {
      // Append scan history record directly to selected existing portfolio
      const targetCrop = cropPortfolios.find((p) => p.id === saveTargetPortfolioId);
      if (targetCrop) {
        const newScanHistoryItem = {
          id: "hist-" + Date.now(),
          date: "Just now",
          cropName: scanResult.cropName || targetCrop.name,
          pestOrDisease: scanResult.pestOrDisease || "Healthy",
          healthStatus: scanResult.healthStatus || "Healthy",
          severity: scanResult.severity || "Low",
          imageUrl: scanResult.imageUrl || targetCrop.image,
          description: scanResult.description,
          solutions: scanResult.solutions || [],
          botanicalName: scanResult.botanicalName || targetCrop.scienceName,
          plantFamily: scanResult.plantFamily,
          confidence: scanResult.confidence,
          healthScore: scanResult.healthScore || targetCrop.healthScore,
          aboutPlant: scanResult.aboutPlant,
          pruningTips: scanResult.pruningTips,
          careTips: scanResult.careTips,
          diagnosedVia: scanResult.diagnosedVia
        };

        const updatedActivities: Activity[] = [
          {
            id: "act-scan-" + Date.now(),
            type: (scanResult.healthStatus === "Healthy") ? "success" : "alert",
            title: `AI Scan: ${scanResult.pestOrDisease || "Healthy"}`,
            time: "Just now",
            description: scanResult.description || "Diagnostic medical analysis completed."
          },
          ...targetCrop.activities
        ];

        const currentScans = targetCrop.scanHistory || [];

        const updatedCrop = {
          ...targetCrop,
          lastScan: "Just now",
          status: scanResult.healthStatus || targetCrop.status,
          image: scanResult.imageUrl || targetCrop.image, // Overwrite portfolio cover page with the newly scanned leaf
          healthScore: scanResult.healthScore || (scanResult.healthStatus === "Healthy" ? 95 : (scanResult.healthStatus === "Sick" ? 48 : 72)),
          activities: updatedActivities,
          scanHistory: [newScanHistoryItem, ...currentScans],
          statsHistory: [
            ...targetCrop.statsHistory,
            { date: "Current scan", health: scanResult.healthScore || (scanResult.healthStatus === "Healthy" ? 95 : 60), moisture: targetCrop.moisture }
          ]
        };

        if (user) {
          try {
            await apiFetch(`/api/portfolios/${saveTargetPortfolioId}`, {
              method: "PUT",
              body: JSON.stringify(updatedCrop)
            });
            setCropPortfolios((prev) =>
              prev.map((p) => (p.id === saveTargetPortfolioId ? updatedCrop : p))
            );
            showToast("Diagnostic medical scan synced to Cloud SQL", "success");
          } catch (err: any) {
            showToast(`Saving to Cloud SQL failed: ${err.message}`, "error");
          }
        } else {
          setCropPortfolios((prev) =>
            prev.map((p) => (p.id === saveTargetPortfolioId ? updatedCrop : p))
          );
          showToast("Diagnostic medical scan saved to your guest profile", "success");
        }
      }
      setSelectedCropId(saveTargetPortfolioId);
    }

    setScanResult(null);
    setActiveScanningPortfolioId(null);
    setSaveTargetPortfolioId("NEW");
    setActiveTab("crops");
  };


  const renderSaveAndActions = () => {
    if (!scanResult) return null;
    return (
      <div className="w-full flex flex-col gap-4">
        {/* Destination Selector / Lock Notice */}
        {!activeScanningPortfolioId ? (
          <div className="bg-surface-container border border-outline-variant p-3.5 rounded-2xl text-xs flex flex-col gap-1.5 shadow-md text-left">
            <label className="text-[10px] font-extrabold text-on-surface-variant block uppercase tracking-wider">
              {appLanguage === "Español (ES)" ? "Guardar Análisis de Diagnóstico En:" : appLanguage === "Français (FR)" ? "Enregistrer l'Analyse Dans:" : "Save Diagnostic Scan To:"}
            </label>
            <select
              value={saveTargetPortfolioId}
              onChange={(e) => setSaveTargetPortfolioId(e.target.value)}
              className="w-full h-11 px-3 bg-surface-container-lowest border border-outline-variant rounded-xl text-on-surface font-semibold outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all cursor-pointer text-xs"
              id="select-save-destination"
            >
              <option value="NEW" className="bg-surface text-on-surface">✨ {appLanguage === "Español (ES)" ? "Establecer como nuevo portafolio" : appLanguage === "Français (FR)" ? "Créer un nouveau portfolio" : "Establish as a New Portfolio"}</option>
              {cropPortfolios.map((portfolio) => (
                <option key={portfolio.id} value={portfolio.id} className="bg-surface text-on-surface">
                  📂 {portfolio.name} ({appLanguage === "Español (ES)" ? "Historial" : appLanguage === "Français (FR)" ? "Historique" : "History Log"})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-2xl text-xs flex items-center justify-between shadow-md text-left">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-lg">folder_open</span>
              <div className="text-left">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block leading-none">
                  {appLanguage === "Español (ES)" ? "Portafolio de Destino Bloqueado" : appLanguage === "Français (FR)" ? "Portfolio Cible Verrouillé" : "Target Portfolio Locked"}
                </span>
                <p className="text-on-surface font-extrabold text-xs mt-1.5">
                  {cropPortfolios.find(p => p.id === activeScanningPortfolioId)?.name || "Current Portfolio"}
                </p>
              </div>
            </div>
            <span className="text-[9px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded font-black border border-emerald-500/20 uppercase tracking-widest shrink-0">
              {appLanguage === "Español (ES)" ? "Portafolio Enfocado" : appLanguage === "Français (FR)" ? "Portfolio Ciblé" : "Portfolio Focused"}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <button 
            onClick={saveToPortfolio}
            className="w-full h-11 bg-primary text-on-primary rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-primary-container transition-all active:scale-[0.98] shadow-sm cursor-pointer"
            id="btn-save-diagnostics"
          >
            <span className="material-symbols-outlined text-base">
              {activeScanningPortfolioId || saveTargetPortfolioId !== "NEW" ? "history" : "folder_special"}
            </span>
            {activeScanningPortfolioId 
              ? (appLanguage === "Español (ES)" 
                  ? `Guardar en Historial de ${cropPortfolios.find(p => p.id === activeScanningPortfolioId)?.name || ""}` 
                  : appLanguage === "Français (FR)" 
                    ? `Sauvegarder dans l'Historique de ${cropPortfolios.find(p => p.id === activeScanningPortfolioId)?.name || ""}` 
                    : `Save to ${cropPortfolios.find(p => p.id === activeScanningPortfolioId)?.name || ""} History`
                )
              : (saveTargetPortfolioId === "NEW" 
                  ? (appLanguage === "Español (ES)" ? "Guardar como Nuevo Portafolio" : appLanguage === "Français (FR)" ? "Créer Nouveau Portfolio" : "Save as New Portfolio")
                  : (appLanguage === "Español (ES)" 
                      ? `Actualizar Historial de ${cropPortfolios.find(p => p.id === saveTargetPortfolioId)?.name || ""}` 
                      : appLanguage === "Français (FR)" 
                        ? `Mettre à jour l'Historique de ${cropPortfolios.find(p => p.id === saveTargetPortfolioId)?.name || ""}` 
                        : `Update ${cropPortfolios.find(p => p.id === saveTargetPortfolioId)?.name || ""} History`
                    )
                )
            }
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => {
                setScanResult(null);
                setActiveScanningPortfolioId(null);
                setSaveTargetPortfolioId("NEW");
                showToast("Scan diagnosis aborted & discarded", "info");
                setActiveTab("crops");
              }}
              className="h-11 border border-red-500/20 text-red-650 dark:text-red-400 bg-red-550/10 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-red-550/20 transition-all active:scale-95 shadow-sm cursor-pointer"
              id="btn-abort-diagnostics"
            >
              <span className="material-symbols-outlined text-base">cancel</span>
              {appLanguage === "Español (ES)" ? "Abortar Diagnóstico" : appLanguage === "Français (FR)" ? "Abandonner l'Analyse" : "Abort Diagnosis"}
            </button>

            <button 
              onClick={() => openExpertChat(scanResult?.pestOrDisease || "Diseased Plant")}
              className="h-11 border border-outline-variant text-on-surface bg-surface-container rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-surface-container-high transition-all active:scale-95 shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">chat</span>
              {appLanguage === "Español (ES)" ? "Chat Agronómico" : appLanguage === "Français (FR)" ? "Chat Agronome" : "Agronomy Chat"}
            </button>
          </div>
        </div>
      </div>
    );
  };


  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#070e0a] flex flex-col items-center justify-center text-white font-sans select-none gap-4">
        <div className="w-16 h-16 rounded-3xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center shadow-2xl animate-spin text-emerald-400">
          <span className="material-symbols-outlined text-4xl font-bold">eco</span>
        </div>
        <div className="flex flex-col items-center text-center">
          <h2 className="font-extrabold tracking-tight text-lg text-emerald-50">AgriScan AI</h2>
          <p className="text-[11px] font-mono tracking-widest text-emerald-400 mt-1 uppercase font-semibold">Loading Diagnostics Profile...</p>
        </div>
      </div>
    );
  }

  const sessionRestored = localStorage.getItem("agriscan_session_restored") === "true";

  if (!user && !isGuestMode && !sessionRestored) {
    return (
      <LoginPage 
        onGoogleSignIn={handleGoogleSignIn}
        onLoginSuccess={() => {
          setIsGuestMode(false);
          localStorage.removeItem("agriscan_guest_allowed");
        }}
        onContinueAsGuest={() => {
          setIsGuestMode(true);
          localStorage.setItem("agriscan_guest_allowed", "true");
          showToast("Using offline Sandbox mode. Diagnostic sync will remain offline.", "info");
        }}
      />
    );
  }

  return (
    <div 
      style={themes[appTheme] || {}} 
      className="bg-background text-on-background min-h-screen font-sans w-full relative outline-none flex flex-col md:flex-row"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >

      {/* Desktop Sidebar Navigation - hidden on mobile */}
      <aside className="hidden md:flex flex-col w-60 lg:w-64 min-h-screen bg-surface border-r border-outline-variant fixed left-0 top-0 bottom-0 z-40" id="desktop-sidebar" style={themes[appTheme] || {}}>
        {/* Sidebar Header / Logo */}
        <div className="px-5 py-5 flex items-center gap-2.5 border-b border-outline-variant">
          <span className="material-symbols-outlined text-primary text-2xl font-bold">agriculture</span>
          <h1 className="font-sans text-lg font-bold text-primary tracking-tight">AgriScan AI</h1>
        </div>

        {/* User Profile Mini */}
        <div 
          onClick={() => {
            setActiveTab("settings");
            setTempName(currentUserName);
            setTempEmail(currentUserEmail);
            setIsEditingProfile(true);
          }}
          className="mx-4 mt-4 mb-2 p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all cursor-pointer flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-full overflow-hidden border border-outline-variant flex-shrink-0">
            <img alt="Profile" className="w-full h-full object-cover" src={currentUserPhoto} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-on-surface truncate">{currentUserName}</p>
            <p className="text-[10px] text-on-surface-variant truncate">{currentUserEmail}</p>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 px-3 mt-2 space-y-1">
          <button 
            onClick={() => {
              setSelectedCropId(null);
              setScanResult(null);
              setActiveScanningPortfolioId(null);
              setSaveTargetPortfolioId("NEW");
              setActiveTab("crops");
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${
              activeTab === "crops" 
                ? "bg-secondary-container text-on-secondary-container" 
                : "text-on-surface-variant hover:bg-surface-container-low"
            }`}
            id="sidebar-tab-crops"
          >
            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: activeTab === "crops" ? "'FILL' 1" : "'FILL' 0" }}>potted_plant</span>
            <span>{t("crops")}</span>
          </button>

          <button 
            onClick={() => {
              setScanResult(null);
              setActiveScanningPortfolioId(null);
              setSaveTargetPortfolioId("NEW");
              setActiveTab("scan");
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${
              activeTab === "scan" 
                ? "bg-secondary-container text-on-secondary-container" 
                : "text-on-surface-variant hover:bg-surface-container-low"
            }`}
            id="sidebar-tab-scan"
          >
            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: activeTab === "scan" ? "'FILL' 1" : "'FILL' 0" }}>add_circle</span>
            <span>{t("scan")}</span>
          </button>

          <button 
            onClick={() => {
              setScanResult(null);
              setActiveScanningPortfolioId(null);
              setSaveTargetPortfolioId("NEW");
              setActiveTab("settings");
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${
              activeTab === "settings" 
                ? "bg-secondary-container text-on-secondary-container" 
                : "text-on-surface-variant hover:bg-surface-container-low"
            }`}
            id="sidebar-tab-settings"
          >
            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: activeTab === "settings" ? "'FILL' 1" : "'FILL' 0" }}>settings</span>
            <span>{appLanguage === "Español (ES)" ? "Ajustes" : appLanguage === "Français (FR)" ? "Paramètres" : "Settings"}</span>
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="px-4 py-4 border-t border-outline-variant">
          <p className="text-[10px] text-outline font-mono font-semibold uppercase tracking-wider text-center">AgriScan AI v2.4.1</p>
        </div>
      </aside>

      {/* Main Content Wrapper - offset for sidebar on desktop */}
      <div className="flex-1 flex flex-col min-h-screen md:ml-60 lg:ml-64">

      {/* TopAppBar - always visible on desktop, conditional on mobile */}
      <header className={`bg-surface border-b border-outline-variant flex justify-between items-center w-full px-5 md:px-8 lg:px-10 h-16 sticky top-0 z-30 ${
        activeTab !== "crops" || selectedCropId ? "hidden md:flex" : "flex"
      }`}>
        {/* Mobile logo */}
        <div 
          onClick={() => {
            setSelectedCropId(null);
            setScanResult(null);
            setActiveScanningPortfolioId(null);
            setSaveTargetPortfolioId("NEW");
            setActiveTab("crops");
          }}
          className="flex items-center gap-2 cursor-pointer transition-transform active:scale-95 md:hidden"
          id="app-logo-container"
        >
          <span className="material-symbols-outlined text-primary text-2xl font-bold">agriculture</span>
          <h1 className="font-sans text-xl font-bold text-primary tracking-tight">AgriScan AI</h1>
        </div>
        
        {/* Desktop page title */}
        <div className="hidden md:flex items-center gap-2">
          <h2 className="font-sans text-lg font-bold text-on-surface tracking-tight">
            {activeTab === "crops" && !selectedCropId ? t("cropPortfolios") : 
             activeTab === "crops" && selectedCropId ? (cropPortfolios.find(c => c.id === selectedCropId)?.name || "Details") :
             activeTab === "scan" ? (appLanguage === "Español (ES)" ? "Diagnóstico Rápido" : appLanguage === "Français (FR)" ? "Diagnostic Rapide" : "Quick Scan") :
             (appLanguage === "Español (ES)" ? "Ajustes" : appLanguage === "Français (FR)" ? "Paramètres" : "Settings")}
          </h2>
        </div>

        <div className="flex items-center gap-3">

          <div 
            onClick={() => {
              setActiveTab("settings");
              setTempName(currentUserName);
              setTempEmail(currentUserEmail);
              setIsEditingProfile(true);
            }}
            className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant transition-transform cursor-pointer active:scale-95 flex-shrink-0 md:hidden"
            id="user-profile-toggle"
          >
            <img 
              alt="User Profile" 
              className="w-full h-full object-cover" 
              src={currentUserPhoto}
            />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow pb-28 md:pb-8 pt-4 overflow-y-auto no-scrollbar">

        {/* TAB 1: CROPS PORTFOLIOS */}
        {activeTab === "crops" && (
          <div className="px-5 md:px-8 lg:px-12">
            {!selectedCropId ? (
              // Portfolios List view (Screen 1)
              <div id="screen-crops-list" className="animate-fadeIn">
                {/* Search Bar */}
                <div className="relative mb-5" id="search-input-wrapper">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">search</span>
                  <input 
                    className="w-full h-12 pl-11 pr-4 bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-sm transition-all shadow-sm outline-none" 
                    placeholder={t("searchPlaceholder")} 
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    id="search-crop-input"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-sm"
                    >
                      {t("clear")}
                    </button>
                  )}
                </div>

                {/* Section Title */}
                <div className="flex justify-between items-baseline mb-4" id="section-portfolios-header">
                  <h2 className="text-lg font-bold text-primary font-sans">{t("cropPortfolios")}</h2>
                  <span className="text-xs font-semibold text-on-surface-variant tracking-wider">{filteredPortfolios.length} {t("items")}</span>
                </div>

                {/* Bento Grid layout */}
                {filteredPortfolios.length === 0 ? (
                  <div className="text-center py-10 bg-surface-container-low rounded-2xl border border-dashed border-outline-variant">
                    <span className="material-symbols-outlined text-4xl text-outline mb-2">potted_plant</span>
                    <p className="text-sm font-medium text-on-surface-variant">{t("noMatching")}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" id="crop-bento-grid">
                    {filteredPortfolios.map((crop) => {
                      // Map status to styling
                      let badgeBg = "bg-secondary-container text-on-secondary-container";
                      if (crop.status === "Sick") {
                        badgeBg = "bg-error-container text-on-error-container";
                      } else if (crop.status === "Normal") {
                        badgeBg = "bg-tertiary-fixed text-on-tertiary-fixed-variant";
                      }
                      
                      return (
                        <div 
                          key={crop.id}
                          onClick={() => {
                            setSelectedCropId(crop.id);
                            setPortfolioViewMode("index");
                          }}
                          className="bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden flex flex-col cursor-pointer hover:bg-surface-container-low active:scale-95 transition-all duration-200 shadow-sm"
                          id={`crop-card-${crop.id}`}
                        >
                          <div className="aspect-square w-full relative bg-surface-container">
                            <img 
                              className="w-full h-full object-cover" 
                              alt={crop.name}
                              src={crop.image}
                              loading="lazy"
                            />
                            <div className="absolute top-2 left-2 z-10">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deletePortfolio(crop.id);
                                }}
                                className={`w-7 h-7 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-90 border text-white ${
                                  pendingDeletePortfolioId === crop.id
                                    ? "bg-amber-500 border-amber-400 animate-pulse"
                                    : "bg-red-600 hover:bg-red-700 border-red-500/10"
                                }`}
                                title={pendingDeletePortfolioId === crop.id ? "Confirm Deletion" : "Delete Portfolio"}
                                id={`btn-delete-card-${crop.id}`}
                              >
                                <span className="material-symbols-outlined text-[15px] font-black">
                                  {pendingDeletePortfolioId === crop.id ? "done" : "delete"}
                                </span>
                              </button>
                            </div>
                            <div className="absolute top-2 right-2">
                              <span className={`${badgeBg} text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide shadow-sm`}>
                                {appLanguage === "Español (ES)" && crop.status === "Healthy" ? "Sano" :
                                 appLanguage === "Español (ES)" && crop.status === "Sick" ? "Enfermo" :
                                 appLanguage === "Español (ES)" && crop.status === "Normal" ? "Normal" :
                                 appLanguage === "Français (FR)" && crop.status === "Healthy" ? "Sain" :
                                 appLanguage === "Français (FR)" && crop.status === "Sick" ? "Malade" :
                                 appLanguage === "Français (FR)" && crop.status === "Normal" ? "Normal" :
                                 crop.status}
                              </span>
                            </div>
                          </div>
                          
                          <div className="p-3">
                            <h3 className="font-semibold text-primary text-sm truncate">{crop.name}</h3>
                            <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                              {t("lastScanPrefix")}: {crop.lastScan === "Just now" ? (appLanguage === "Español (ES)" ? "Justo ahora" : appLanguage === "Français (FR)" ? "À l'instant" : "Just now") : crop.lastScan}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              // Portfolio Detailed view (Screen 2)
              selectedCrop && (
                <div id="screen-crop-details" className="animate-fadeIn -mx-5 md:-mx-8 lg:-mx-12 -mt-4">
                  
                  {/* Portfolio Headers depending on current sub-page view mode */}
                  {portfolioViewMode === "index" ? (
                    <div className="relative w-full h-60 sm:h-72 md:h-80 lg:h-[380px] overflow-hidden md:rounded-b-2xl" id="details-hero">
                      <img 
                        className="w-full h-full object-cover" 
                        alt={selectedCrop.name}
                        src={selectedCrop.id === "maize-alpha" 
                          ? "https://lh3.googleusercontent.com/aida-public/AB6AXuB6CJ3gcbC183x511biA-hxdFyimqiYWLZMCE8-cMH4IRtZNRosIzWMSCUejgQllRSoA6094b6if32-wZDVioOMv_5jgRKAM7llAT0ZtfXHstFN9-ozB_BFJd6hqtvKYP5YPXpKxo9MJunnQe7yAaASBgjfpqi-WKcdTOGIVKwY4oQduhyZ4FC4i4_Hn5YwbzRZH4hWFuU7x9OfjwF4EIEF33KkGplLRBVcYAr9w153tGQ_svO2UFCQTOi6NHNfBBlCXmUzpRewa74D"
                          : selectedCrop.image
                        }
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-primary/20 to-transparent"></div>
                      
                      {/* Standalone circular floating back arrow at top-left, not a full bar */}
                      <button 
                        onClick={() => setSelectedCropId(null)}
                        className="absolute top-4 left-5 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white flex items-center justify-center transition-all active:scale-90 hover:bg-black/65 z-30 shadow-md cursor-pointer"
                        title={t("backToPortfolios")}
                      >
                        <span className="material-symbols-outlined text-lg">arrow_back</span>
                      </button>
                      
                      <div className="absolute bottom-4 left-5 right-5">
                        <h2 className="text-2xl font-bold text-white tracking-tight">{selectedCrop.name}</h2>
                        {selectedCrop.scienceName && (
                          <p className="text-xs text-secondary-container italic font-medium -mt-0.5">{selectedCrop.scienceName}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Slim Top Header Bar for Sub-Pages - clean transparent with no thick borders/strip */
                    <div className="sticky top-0 bg-background/95 backdrop-blur-md px-5 py-4 flex items-center gap-3 z-40 animate-fadeIn text-on-surface">
                      <button 
                        onClick={() => setPortfolioViewMode("index")}
                        className="w-10 h-10 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center transition-transform active:scale-95"
                        title="Back to portfolio overview"
                      >
                        <span className="material-symbols-outlined text-lg">arrow_back</span>
                      </button>
                      <div className="min-w-0 flex-1 text-left">
                        <h3 className="font-sans font-extrabold text-xs text-primary uppercase tracking-wider leading-none">
                          {portfolioViewMode === "history" 
                            ? t("diagnosticHistory") 
                            : portfolioViewMode === "logs" 
                              ? t("growthLogsHeading") 
                              : t("pestGuideHeading")
                          }
                        </h3>
                        <p className="text-[10px] text-on-surface-variant font-bold truncate mt-1">
                          {selectedCrop.name} • {selectedCrop.scienceName || "Specimen"}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="px-5 mt-5">
                    {/* Quick Actions Bento Grid */}
                    <section className="grid grid-cols-2 gap-2 mb-6" id="quick-actions-toolbar">
                      {/* Start Scan */}
                      <button 
                        onClick={() => {
                          setUploadedBase64(null);
                          setSelectedPresetImage(null);
                          setActiveScanningPortfolioId(selectedCrop.id);
                          setSaveTargetPortfolioId(selectedCrop.id);
                          setActiveTab("scan");
                        }}
                        className="flex flex-col items-center justify-center gap-1.5 p-3 bg-primary text-on-primary rounded-xl notepad-shadow active:scale-95 transition-transform"
                        id="action-start-scan"
                      >
                        <span className="material-symbols-outlined text-2xl font-bold">center_focus_strong</span>
                        <span className="text-[10px] font-bold tracking-tight">{t("scanSpecimen")}</span>
                      </button>

                      {/* View History */}
                      <button 
                        onClick={() => setPortfolioViewMode("history")}
                        className="flex flex-col items-center justify-center gap-1.5 p-3 bg-surface-container-lowest border border-outline-variant text-on-surface rounded-xl notepad-shadow active:scale-95 transition-transform hover:bg-surface-container-low"
                        id="action-view-history"
                      >
                        <span className="material-symbols-outlined text-2xl text-secondary">history</span>
                        <span className="text-[10px] font-bold tracking-tight text-on-surface-variant">{t("viewHistory")}</span>
                      </button>
                    </section>



                    {/* Portfolio Internal Diagnostic Scan History */}
                    {portfolioViewMode === "history" && (
                      <section className="animate-fadeIn mt-1 text-left" id="portfolio-scan-history-section">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-sm font-bold text-primary font-sans uppercase tracking-wider">{t("diagnosticHistory")}</h3>
                          <span className="bg-primary/10 text-primary text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                            {(selectedCrop.scanHistory || []).length} {appLanguage === "Español (ES)" ? "Registros" : appLanguage === "Français (FR)" ? "Rapports" : "Records"}
                          </span>
                        </div>

                        <div className="flex flex-col gap-3.5">
                          {(!selectedCrop.scanHistory || selectedCrop.scanHistory.length === 0) ? (
                            <div className="bg-surface-container-high/40 border border-dashed border-outline-variant rounded-2xl p-6 text-center text-on-surface-variant">
                              <span className="material-symbols-outlined text-4xl text-outline-variant">history_toggle_off</span>
                              <p className="text-xs font-bold mt-2">
                                {appLanguage === "Español (ES)" ? "Aún no hay análisis históricos guardados" :
                                 appLanguage === "Français (FR)" ? "Aucun rapport d'analyse enregistré" :
                                 "No historical scans saved to this folder yet"}
                              </p>
                              <p className="text-[10px] text-on-surface-variant/80 mt-0.5 max-w-[240px] mx-auto">
                                {appLanguage === "Español (ES)" ? "Diagnostique hojas usando el escáner o suba fotos para adjuntar bitácoras de patología." :
                                 appLanguage === "Français (FR)" ? "Diagnostiquez des feuilles via l'analyseur ou téléchargez des photos pour ajouter des journaux de pathologie." :
                                 "Diagnose leaf specimens via the live radar or upload a photo to append scientific pathology logs."}
                              </p>
                            </div>
                          ) : (
                            selectedCrop.scanHistory.map((hist: any, hIdx: number) => {
                              const isFine = hist.healthStatus === "Healthy";
                              return (
                                <div 
                                  key={hist.id || hIdx}
                                  onClick={() => {
                                    // Setup interactive analysis page review mode
                                    setScanResult({
                                      ...hist,
                                      imageUrl: hist.imageUrl || selectedCrop.image
                                    });
                                    setActiveTab("scan");
                                    setActiveResultTab("identify");
                                  }}
                                  className="bg-surface-container-lowest border border-outline-variant hover:border-emerald-500 rounded-2xl overflow-hidden p-3 shadow-sm hover:shadow transition-all cursor-pointer active:scale-[0.99] flex flex-col gap-3"
                                >
                                  <div className="flex gap-3">
                                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-surface-container border border-outline-variant shrink-0">
                                      <img 
                                        className="w-full h-full object-cover" 
                                        src={hist.imageUrl || selectedCrop.image} 
                                        alt={hist.cropName} 
                                        referrerPolicy="no-referrer"
                                      />
                                    </div>
                                    
                                    <div className="flex-grow min-w-0">
                                      <div className="flex justify-between items-start gap-1">
                                        <div className="min-w-0">
                                          <h4 className="font-bold text-primary text-sm truncate">{hist.cropName || selectedCrop.name}</h4>
                                          <span className="text-[10px] text-on-surface-variant font-extrabold font-mono tracking-tight">{hist.date}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider ${
                                            isFine ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/30" : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-100/30"
                                          }`}>
                                            {hist.healthStatus || "Sick"}
                                          </span>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              deleteScanRecord(selectedCrop.id, hist.id);
                                            }}
                                            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all border ${
                                              pendingDeleteScanId === hist.id
                                                ? "bg-amber-500 border-amber-400 text-white animate-pulse"
                                                : "bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-600 border border-red-200/30"
                                            }`}
                                            title="Delete Scan Record"
                                            id={`btn-delete-scan-${hist.id || hIdx}`}
                                          >
                                            <span className="material-symbols-outlined text-[13px] font-black">
                                              {pendingDeleteScanId === hist.id ? "done" : "delete"}
                                            </span>
                                          </button>
                                        </div>
                                      </div>
                                      
                                      <p className="text-xs text-on-surface-variant font-bold mt-1.5 truncate text-left">
                                        {t("diagnosis")}: <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">{hist.pestOrDisease || "Healthy"}</span>
                                      </p>
                                    </div>
                                  </div>

                                  <p className="text-xs text-on-surface-variant/85 font-medium line-clamp-2 -mt-1 leading-normal italic bg-surface-container/50 border border-outline-variant text-left p-2.5 rounded-xl">
                                    {hist.description}
                                  </p>

                                  {hist.solutions && hist.solutions.length > 0 && (
                                    <div className="pt-2 border-t border-dashed border-outline-variant/60 flex flex-wrap gap-1 items-center justify-between">
                                      <div className="flex gap-1 overflow-hidden max-w-[200px]">
                                        {hist.solutions.slice(0, 2).map((sol: string, sIdx: number) => (
                                          <span key={sIdx} className="bg-surface-container border border-outline-variant text-on-surface-variant text-[9px] px-1.5 py-0.5 rounded font-black truncate max-w-[90px]">
                                            {sol}
                                          </span>
                                        ))}
                                      </div>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openExpertChat(`${hist.cropName || selectedCrop.name} Treatment`);
                                        }}
                                        className="text-[10px] font-bold text-primary flex items-center shrink-0"
                                      >
                                        <span className="material-symbols-outlined text-xs mr-0.5">chat</span> {t("specialist")}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </section>
                    )}

                    {/* Delete Portfolio Action */}
                    {portfolioViewMode === "index" && (
                      <div className="mb-8 pt-2">
                        <button
                          onClick={() => deletePortfolio(selectedCrop.id, true)}
                          className={`w-full h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] shadow-sm ${
                            pendingDeletePortfolioId === selectedCrop.id
                              ? "bg-amber-600 hover:bg-amber-700 border border-amber-500 text-white animate-pulse"
                              : "bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 text-red-600"
                          }`}
                          id="btn-delete-portfolio"
                        >
                          <span className="material-symbols-outlined text-base">
                            {pendingDeletePortfolioId === selectedCrop.id ? "warning_amber" : "delete_forever"}
                          </span>
                          {pendingDeletePortfolioId === selectedCrop.id ? t("confirmDelete") : t("deletePortfolioLabel")}
                        </button>
                      </div>
                    )}

                  </div>
                </div>
              )
            )}
          </div>
        )}



        {/* TAB 3: SCANSpecimen (CAMERA DIAGNOSTICS & RESULTS) */}
        {activeTab === "scan" && (
          <div className="animate-fadeIn w-full relative" id="screen-scan">
            {!scanResult ? (
              <div className="-mt-4 flex flex-col items-center w-full">
                {/* 1. Universal Quick Scan Header (mockup 1 & 2 consistent) - Clean transparent header */}
                <div className="w-full flex items-center gap-3 px-5 md:px-8 lg:px-12 py-5">
                  <button 
                    onClick={() => setActiveTab("crops")}
                    className="text-on-surface-variant hover:text-on-surface transition-all p-1.5 rounded-full hover:bg-surface-container flex items-center justify-center active:scale-95 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg">arrow_back</span>
                  </button>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-amber-500 text-xl font-bold leading-none">bolt</span>
                    <h2 className="text-xl font-extrabold text-on-surface font-sans tracking-tight leading-none text-left">Quick Scan</h2>
                  </div>
                </div>

                {!uploadedBase64 ? (
                  <div className="w-full flex flex-col items-center pb-8 animate-fadeIn">
                    {/* Card container with dotted/dashed rounded border */}
                    <div className="w-full px-5 mt-2">
                       <div className="w-full border border-dashed border-emerald-500/25 bg-emerald-950/[0.08] rounded-3xl p-8 flex flex-col items-center justify-center shadow-lg animate-fadeIn">
                        {/* Circle avatar with image icon */}
                        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 dark:text-emerald-400 mb-4 shadow-[0_4px_25px_rgba(16,185,129,0.15)] animate-pulse">
                           <span className="material-symbols-outlined text-3.5xl">image</span>
                        </div>
                        
                        <p className="text-on-surface-variant dark:text-zinc-300 text-xs font-bold text-center max-w-[260px] mb-2 leading-relaxed font-sans">
                          {t("takeOrUploadPhoto")}
                        </p>
                        <p className="text-on-surface-variant/70 dark:text-zinc-500 text-[10px] font-semibold text-center max-w-[210px] mb-6 font-sans">
                          {t("supportsHighFidelity")}
                        </p>
                        
                        {/* Two buttons next to each other */}
                        <div className="flex items-center gap-3 w-full justify-center">
                          <button 
                            onClick={() => cameraInputRef.current?.click()}
                            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-sans text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
                          >
                            <span className="material-symbols-outlined text-sm">photo_camera</span>
                            <span>{t("camera")}</span>
                          </button>
                          
                          <button 
                            onClick={() => galleryInputRef.current?.click()}
                            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-surface-container border border-outline-variant text-on-surface hover:bg-surface-container-high font-sans text-xs font-semibold rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
                          >
                            <span className="material-symbols-outlined text-sm">file_upload</span>
                            <span>{t("gallery")}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Case B: Uploaded Image Card & Analyse Button matching mockup 2 */
                  <div className="w-full px-5 mt-2 animate-fadeIn flex flex-col items-center">
                    <div className="relative w-full max-w-md aspect-[4/5] bg-black rounded-3xl overflow-hidden border border-zinc-800 shadow-xl">
                      <img 
                        className="absolute inset-0 w-full h-full object-cover" 
                        src={uploadedBase64} 
                        alt="User uploaded crop" 
                      />

                      {/* Top-right "X" cancel/close button exactly matching mockup */}
                      <button 
                        onClick={() => {
                          setUploadedBase64(null);
                          setSelectedPresetImage(null);
                        }}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white cursor-pointer active:scale-95 transition-all z-10 border border-white/10 shadow-md"
                      >
                        <span className="material-symbols-outlined text-base">close</span>
                      </button>

                      {/* Moving laser sweep element and radar indicator while scanning or analyzing */}
                      <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none p-6">
                        <div className="relative w-64 h-64 border border-white/20 rounded-2xl flex flex-col justify-between p-2">
                          {/* target brackets */}
                          <div className="absolute -top-1 -left-1 w-6 h-6 border-t-[3px] border-l-[3px] border-emerald-500 rounded-tl-lg font-bold"></div>
                          <div className="absolute -top-1 -right-1 w-6 h-6 border-t-[3px] border-r-[3px] border-emerald-500 rounded-tr-lg font-bold"></div>
                          <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-[3px] border-l-[3px] border-emerald-500 rounded-bl-lg font-bold"></div>
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-[3px] border-r-[3px] border-emerald-500 rounded-br-lg font-bold"></div>

                          {/* scanner line animation */}
                          <div className="w-full scanning-line rounded animate-bounce opacity-80" />

                          {/* status chip */}
                          <div className="bg-emerald-950/90 text-emerald-400 px-3 py-1 rounded-full flex items-center gap-1.5 self-center shadow-lg border border-emerald-500/20 backdrop-blur-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                            <span className="text-[10px] font-extrabold leading-none tracking-wider text-emerald-300 uppercase font-sans">
                              {isScanning ? t("scanningMatrix") : (analyzing ? t("aiDiagnosing") : t("lensFocusEngaged"))}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* System log console only when action is processing */}
                      {(isScanning || analyzing) && (
                        <div className="absolute inset-x-4 bottom-4 z-30 bg-black/85 border border-emerald-500/30 rounded-xl p-3 font-mono text-[9px] text-emerald-400 flex flex-col gap-1 shadow-2xl animate-pulse">
                          <p className="text-white border-b border-white/10 pb-1 font-bold">{t("agronomyAiLogs")}</p>
                          {diagnosticsLog.slice(-3).map((logLine, idx) => (
                            <p key={idx} className="truncate">▶ {logLine}</p>
                          ))}
                          {analyzing && <p className="text-emerald-300 font-bold">{t("loadingPathology")}</p>}
                        </div>
                      )}
                    </div>

                    {/* Highly polished analyze button matching mockup 2 */}
                    <button
                      onClick={() => {
                        const activeImage = uploadedBase64;
                        if (!activeImage) {
                          galleryInputRef.current?.click();
                          return;
                        }
                        const activeHint = selectedCrop ? selectedCrop.name : "Specimen crop leaf";
                        startDiagnostics(activeImage, activeHint);
                      }}
                      disabled={isScanning || analyzing}
                      className="w-full text-white font-sans text-sm font-semibold h-12 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/20 mt-6 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-base">auto_awesome</span>
                      <span>{t("analyzeTitle")}</span>
                    </button>
                  </div>
                )}

                {/* Hidden Native File and Camera Captures */}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={galleryInputRef}
                  onChange={handleFileUpload} 
                />

                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  className="hidden" 
                  ref={cameraInputRef}
                  onChange={handleFileUpload} 
                />

              </div>
            ) : (
              <div className="px-5 mt-2 animate-fadeIn" id="screen-scan-result">
                {/* Header with back button - Clean transparent header */}
                <div className="w-full flex items-center gap-3 py-4 mb-4">
                  <button 
                    onClick={() => {
                      setScanResult(null);
                      setActiveScanningPortfolioId(null);
                      setSaveTargetPortfolioId("NEW");
                    }}
                    className="text-on-surface-variant hover:text-on-surface transition-all p-1.5 rounded-full hover:bg-surface-container flex items-center justify-center active:scale-95 cursor-pointer"
                    id="btn-scan-result-back"
                  >
                    <span className="material-symbols-outlined text-lg">arrow_back</span>
                  </button>
                  <div className="flex flex-col text-left">
                    <h2 className="text-lg font-extrabold text-on-surface font-sans tracking-tight leading-none">
                      {appLanguage === "Español (ES)" ? "Resultado del Diagnóstico" : appLanguage === "Français (FR)" ? "Résultat du Diagnostic" : "Diagnostic Result"}
                    </h2>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start mt-1 w-full text-left" id="scan-result-responsive-grid">
                  
                  {/* Left Column: Image & Direct Action Buttons (Desktop only) */}
                  <div className="md:col-span-5 md:sticky md:top-20 z-20 flex flex-col gap-5 w-full">
                    {/* Captured Image Section */}
                    <section className="w-full">
                      <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl">
                        <img alt="Scanned Leaf" className="w-full h-full object-cover" src={scanResult.imageUrl} />
                        <div className="absolute bottom-3 right-3 bg-zinc-900/90 text-emerald-400 px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-extrabold text-[10px] shadow-lg border border-emerald-500/20 backdrop-blur-sm uppercase tracking-wider">
                          <span className="material-symbols-outlined text-[14px]">verified</span>
                          {appLanguage === "Español (ES)" ? "Patología Analizada" : appLanguage === "Français (FR)" ? "Patologie Analysée" : "Pathology Scanned"}
                        </div>
                      </div>
                    </section>
                    
                    {/* Show Destination Selector & Action Buttons here (On Desktop/Tablet ONLY) */}
                    <div className="hidden md:block w-full">
                      {renderSaveAndActions()}
                    </div>
                  </div>

                  {/* Right Column: Information, Diagnosis Tabs & Content (Responsive) */}
                  <div className="md:col-span-7 flex flex-col w-full">
                    {/* Horizontal Navigation Pills (mockup icons list) */}
                    <div className="grid grid-cols-5 p-1 bg-surface-container-high border border-outline-variant/80 rounded-2xl mb-4 gap-1 shadow-inner">
                  {[
                    { key: "identify", label: appLanguage === "Español (ES)" ? "Identificar" : appLanguage === "Français (FR)" ? "Identifier" : "Identify", icon: "eco" },
                    { key: "diseases", label: appLanguage === "Español (ES)" ? "Enfermedades" : appLanguage === "Français (FR)" ? "Maladies" : "Diseases", icon: "bug_report" },
                    { key: "solutions", label: appLanguage === "Español (ES)" ? "Soluciones" : appLanguage === "Français (FR)" ? "Traitements" : "Solutions", icon: "healing" },
                    { key: "pruning", label: appLanguage === "Español (ES)" ? "Poda" : appLanguage === "Français (FR)" ? "Taille" : "Pruning", icon: "content_cut" },
                    { key: "care", label: appLanguage === "Español (ES)" ? "Cuidado" : appLanguage === "Français (FR)" ? "Soin" : "Care", icon: "spa" }
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      id={`btn-result-tab-${tab.key}`}
                      onClick={() => setActiveResultTab(tab.key as any)}
                      className={`py-2 px-0.5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all outline-none ${
                        activeResultTab === tab.key 
                          ? "bg-surface-container-lowest text-emerald-600 dark:text-emerald-450 border border-outline-variant shadow-md scale-[1.02]" 
                          : "text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                      <span className="text-[9px] font-bold tracking-tight leading-none">{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Tab content area */}
                <div className="mb-6">
                  {activeResultTab === "identify" && (
                    <div className="flex flex-col gap-3 animate-fadeIn">
                      {/* PLANT IDENTIFIED CARD */}
                      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 flex justify-between items-center shadow-sm relative overflow-hidden">
                        <div className="flex items-center gap-3 text-left">
                          <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <span className="material-symbols-outlined text-[20px]">eco</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block leading-none">
                              {appLanguage === "Español (ES)" ? "Planta Identificada" : appLanguage === "Français (FR)" ? "Plante Identifiée" : "Plant Identified"}
                            </span>
                            <h3 className="text-lg font-black text-on-surface leading-tight font-sans mt-1">{scanResult.cropName || "Tomato"}</h3>
                            <span className="text-[11px] font-semibold text-on-surface-variant/85 italic block mt-0.5">{scanResult.botanicalName || "Solanum lycopersicum"}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 block leading-none">{scanResult.confidence || "85%"}</div>
                          <span className="text-[8px] text-on-surface-variant font-bold tracking-wide uppercase mt-1 block">
                            {appLanguage === "Español (ES)" ? "Confianza" : appLanguage === "Français (FR)" ? "Confiance" : "Confidence"}
                          </span>
                        </div>
                      </div>

                      {/* HEALTH ASSESSMENT CARD */}
                      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-sm flex items-center gap-4 text-left">
                        {/* Radial progress ring */}
                        <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle
                              cx="24"
                              cy="24"
                              r="20"
                              className="stroke-outline-variant/40"
                              strokeWidth="4"
                              fill="transparent"
                            />
                            <circle
                              cx="24"
                              cy="24"
                              r="20"
                              className={
                                scanResult.healthStatus === "Healthy" 
                                  ? "stroke-emerald-500"
                                  : (scanResult.healthStatus === "Normal" ? "stroke-amber-500" : "stroke-rose-500")
                              }
                              strokeWidth="4"
                              fill="transparent"
                              strokeDasharray={2 * Math.PI * 20}
                              strokeDashoffset={(2 * Math.PI * 20) * (1 - (scanResult.healthScore || 40) / 100)}
                            />
                          </svg>
                          <span className="absolute text-xs font-black text-on-surface">{scanResult.healthScore || 40}</span>
                        </div>

                        <div className="flex-1 min-w-0 text-left">
                          <span className="text-[9px] text-on-surface-variant font-black uppercase tracking-widest block leading-none">
                            {appLanguage === "Español (ES)" ? "Evaluación de Salud" : appLanguage === "Français (FR)" ? "État de Santé" : "Health Assessment"}
                          </span>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-[8.5px] font-black tracking-wider leading-none uppercase ${
                              scanResult.healthStatus === "Healthy" 
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" 
                                : (scanResult.healthStatus === "Pest Risk" || scanResult.healthStatus === "Warning" 
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" 
                                    : "bg-rose-500/10 text-rose-600 dark:text-rose-450 border border-rose-500/20")
                            }`}>
                              {(() => {
                                const status = scanResult.healthStatus || "Sick";
                                if (appLanguage === "Español (ES)") {
                                  if (status === "Healthy") return "Saludable";
                                  if (status === "Normal") return "Normal";
                                  if (status === "Sick") return "Enfermo";
                                  return status;
                                } else if (appLanguage === "Français (FR)") {
                                  if (status === "Healthy") return "En bonne santé";
                                  if (status === "Normal") return "Normal";
                                  if (status === "Sick") return "Malade";
                                  return status;
                                }
                                return status;
                              })()}
                            </span>
                            <span className="text-on-surface-variant text-xs font-bold">
                              {(scanResult.healthScore || 40)}/100 {appLanguage === "Español (ES)" ? "puntuación de salud" : appLanguage === "Français (FR)" ? "score de santé" : "health score"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* PLANT FAMILY CARD */}
                      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-sm text-left">
                        <span className="text-[9px] text-on-surface-variant font-black uppercase tracking-widest block leading-none">
                          {appLanguage === "Español (ES)" ? "Familia de Planta" : appLanguage === "Français (FR)" ? "Famille de la Plante" : "Plant Family"}
                        </span>
                        <p className="text-base font-extrabold text-on-surface font-sans mt-1.5 leading-none">{scanResult.plantFamily || "Solanaceae"}</p>
                      </div>

                      {/* ABOUT THIS PLANT */}
                      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-sm text-left">
                        <span className="text-[9px] text-on-surface-variant font-black uppercase tracking-widest block leading-none mb-1.5">
                          {appLanguage === "Español (ES)" ? "Sobre esta Planta" : appLanguage === "Français (FR)" ? "À Propos de la Plante" : "About This Plant"}
                        </span>
                        <p className="text-xs text-on-surface-variant leading-relaxed font-semibold">
                          {scanResult.aboutPlant || getPlantSummary(scanResult.cropName || "")}
                        </p>
                      </div>
                    </div>
                  )}

                  {activeResultTab === "diseases" && (
                    <div className="flex flex-col gap-3 animate-fadeIn">
                       {/* PATHOLOGY DETAILS CARD */}
                      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-sm text-left">
                        <div className="flex items-center gap-1.5 text-rose-500 dark:text-rose-450 mb-2.5">
                          <span className="material-symbols-outlined text-[18px]">bug_report</span>
                          <span className="text-[9px] font-black uppercase tracking-widest leading-none">
                            {appLanguage === "Español (ES)" ? "INFORME DE PATOLOGÍA DE DIAGNÓSTICO" : appLanguage === "Français (FR)" ? "RAPPORT DIAGNOSTIC PATHOLOGIQUE" : "Diagnostic Pathology Report"}
                          </span>
                        </div>

                        <h3 className="text-base font-black text-on-surface mb-2 leading-snug">
                          {appLanguage === "Español (ES)" ? "Estado: " : appLanguage === "Français (FR)" ? "Statut: " : "Status: "} <span className="text-rose-500 dark:text-rose-400 font-extrabold">{scanResult.pestOrDisease}</span>
                        </h3>

                        <div className="flex gap-2 items-center mb-3">
                          <span className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider bg-surface-container border border-outline-variant/60 ${
                            scanResult.severity === "High" || scanResult.severity === "Critical" ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-450"
                          }`}>
                            {appLanguage === "Español (ES)" ? "Severidad: " : appLanguage === "Français (FR)" ? "Gravité: " : "Severity: "} 
                            {(() => {
                              const sev = scanResult.severity || "Medium";
                              if (appLanguage === "Español (ES)") {
                                if (sev === "None") return "Ninguna";
                                  if (sev === "Low") return "Baja";
                                  if (sev === "Medium") return "Media";
                                  if (sev === "High") return "Alta";
                                  if (sev === "Critical") return "Crítica";
                                  return sev;
                              } else if (appLanguage === "Français (FR)") {
                                if (sev === "None") return "Aucune";
                                  if (sev === "Low") return "Faible";
                                  if (sev === "Medium") return "Moyenne";
                                  if (sev === "High") return "Élevée";
                                  if (sev === "Critical") return "Critique";
                                  return sev;
                              }
                              return sev;
                            })()}
                          </span>
                          <span className="text-[10px] text-on-surface-variant/80 font-semibold">
                            {appLanguage === "Español (ES)" ? "Alerta de vector de infección activada" : appLanguage === "Français (FR)" ? "Alerte de propagation générée" : "Infection vector alert triggered"}
                          </span>
                        </div>

                        <p className="text-xs text-on-surface-variant leading-relaxed font-semibold border-t border-outline-variant/60 pt-3 mt-1.5">
                          {scanResult.description}
                        </p>

                        {scanResult.diagnosedVia && (
                          <div className="mt-4 pt-3 border-t border-dashed border-outline-variant/60 flex items-center justify-between text-[10px] text-on-surface-variant">
                            <span>{appLanguage === "Español (ES)" ? "Motor de Diagnóstico:" : appLanguage === "Français (FR)" ? "Moteur de Diagnostic:" : "Diagnostics Engine:"}</span>
                            <span className="font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold">{scanResult.diagnosedVia}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeResultTab === "solutions" && (
                    <div className="flex flex-col gap-3 animate-fadeIn text-left">
                      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-450 mb-3.5">
                          <span className="material-symbols-outlined text-[18px]">healing</span>
                          <span className="text-[9px] font-black uppercase tracking-widest leading-none">
                            {appLanguage === "Español (ES)" ? "Protocolo de Tratamiento Agrónomo" : appLanguage === "Français (FR)" ? "Protocole de Traitement" : "Agronomy Treatment Protocol"}
                          </span>
                        </div>

                        <ul className="flex flex-col gap-2.5">
                          {scanResult.solutions.map((sol: string, idx: number) => (
                            <li key={idx} className="flex gap-3 bg-surface-container border border-outline-variant/65 p-3 rounded-xl items-start">
                              <div className="w-5.5 h-5.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-650 dark:text-emerald-400 font-mono text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                                {idx + 1}
                              </div>
                              <p className="text-xs text-on-surface-variant font-semibold leading-normal">{sol}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {activeResultTab === "pruning" && (
                    <div className="flex flex-col gap-3 animate-fadeIn text-left">
                      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400 mb-3.5">
                          <span className="material-symbols-outlined text-[18px]">content_cut</span>
                          <span className="text-[9px] font-black uppercase tracking-widest leading-none">
                            {appLanguage === "Español (ES)" ? "Consejos de Poda Agronómica" : appLanguage === "Français (FR)" ? "Conseils de Taille" : "Agronomic Pruning Tips"}
                          </span>
                        </div>

                        <ul className="flex flex-col gap-2.5">
                          {(scanResult.pruningTips || (
                            appLanguage === "Español (ES)" ? [
                              "Retire los brotes laterales chupones que nacen entre el tallo principal y las ramas.",
                              "Quite las hojas marchitas de la capa inferior para evitar salpicaduras del suelo con hongos.",
                              "Aclare las ramas u hojas densas para asegurar una buena ventilación de la planta."
                            ] : appLanguage === "Français (FR)" ? [
                              "Pincez les bourgeons gourmands latéraux qui poussent à l'aisselle des feuilles.",
                              "Enlevez les feuilles flétries de la base pour éliminer les éclaboussures de pathogènes du sol.",
                              "Éclaircissez les grappes de feuilles denses pour assurer un bon passage d'air frais."
                            ] : [
                              "Pinch off lateral suckers that emerge at the main stem and side branch intersection.",
                              "Remove withered or chlorotic leaves on the bottom layer to eliminate pathogen ground splash.",
                              "Thin out overlapping leaf clusters to ensure healthy exposure to fresh airflow."
                            ]
                          )).map((tip: string, idx: number) => (
                            <li key={idx} className="flex gap-3 bg-surface-container border border-outline-variant/65 p-3 rounded-xl items-start">
                              <div className="w-5.5 h-5.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-655 dark:text-sky-400 font-mono text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                                {idx + 1}
                              </div>
                              <p className="text-xs text-on-surface-variant font-semibold leading-normal">{tip}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {activeResultTab === "care" && (
                    <div className="flex flex-col gap-3 animate-fadeIn text-left">
                      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400 mb-3.5">
                          <span className="material-symbols-outlined text-[18px]">spa</span>
                          <span className="text-[9px] font-black uppercase tracking-widest leading-none">
                            {appLanguage === "Español (ES)" ? "Estrategia de Cuidado de Cultivo" : appLanguage === "Français (FR)" ? "Conseils de Sereine Culture" : "Farming Care Strategy"}
                          </span>
                        </div>

                        <ul className="flex flex-col gap-2.5">
                          {(scanResult.careTips || (
                            appLanguage === "Español (ES)" ? [
                              "Riegue de forma profunda directamente en la base y las raíces evitando mojar el follaje.",
                              "Coloque una capa de abono de compost para mantener la humedad y temperatura óptima del suelo.",
                              "Agregue minerales o fertilizante especializado (NPK / Calcio) según el período fenológico de la planta."
                            ] : appLanguage === "Français (FR)" ? [
                              "Arrosez copieusement et directement au pied sans mouiller le feuillage.",
                              "Maintenez une couche de paillage de compost pour préserver la température du sol.",
                              "Fournissez des minéraux ou de l'engrais spécialisé (NPK / Calcium) selon le cycle de croissance."
                            ] : [
                              "Provide consistent deep soil irrigation directly at the roots rather than overhead wetness.",
                              "Maintain complete compost mulch insulation layers to preserve ideal subsoil warmth.",
                              "Supplement high minerals or specialized fertilizer (NPK / Calcium) depending on crop cycle."
                            ]
                          )).map((tip: string, idx: number) => (
                            <li key={idx} className="flex gap-3 bg-surface-container border border-outline-variant/65 p-3 rounded-xl items-start">
                              <div className="w-5.5 h-5.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-655 dark:text-teal-400 font-mono text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                                {idx + 1}
                              </div>
                              <p className="text-xs text-on-surface-variant font-semibold leading-normal">{tip}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                  </div>

                  {/* Show Destination Selector & Action Buttons here (On Mobile ONLY) */}
                  <div className="block md:hidden w-full mt-4">
                    {renderSaveAndActions()}
                  </div>
                </div>

              </div>

            </div>
            )}
          </div>
        )}

        {/* TAB 4: SETTINGS */}
        {activeTab === "settings" && (
          <div className="px-5 md:px-8 lg:px-12 animate-fadeIn pb-12" id="screen-settings">
            <div className="w-full max-w-4xl mx-auto">
            
            {/* Settings Header with Back Button - Clean transparent header */}
            <div className="w-full flex items-center gap-3 py-4 mb-5">
              <button 
                onClick={() => setActiveTab("crops")}
                className="text-on-surface-variant hover:text-on-surface transition-all p-1.5 rounded-full hover:bg-surface-container flex items-center justify-center active:scale-95 cursor-pointer"
                id="btn-settings-back"
              >
                <span className="material-symbols-outlined text-lg">arrow_back</span>
              </button>
              <div className="flex flex-col text-left">
                <h2 className="text-lg font-extrabold text-on-surface font-sans tracking-tight leading-none">
                  {appLanguage === "Español (ES)" ? "Ajustes" : appLanguage === "Français (FR)" ? "Paramètres" : "Settings"}
                </h2>
              </div>
            </div>

            {/* Profile Section */}
            <section className="mb-6 mt-1">
              <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 border border-outline-variant bg-surface-container">
                    <img 
                      alt="User profile photo" 
                      className="w-full h-full object-cover" 
                      src={currentUserPhoto} 
                    />
                  </div>
                  
                  {!isEditingProfile ? (
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-sans text-lg font-bold text-on-surface truncate">{currentUserName}</h3>
                        {user && (
                          <span className="material-symbols-outlined text-primary text-lg" title="Verified Google Account">verified</span>
                        )}
                      </div>
                      <p className="font-sans text-xs text-on-surface-variant truncate font-medium">{currentUserEmail}</p>
                      {user ? (
                        <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full w-fit mt-1 border border-emerald-100 dark:border-emerald-900/30">
                          <span className="material-symbols-outlined text-[10px]">cloud_done</span>
                          Cloud Sync Active
                        </div>
                      ) : (
                        <button
                          onClick={handleGoogleSignIn}
                          className="flex items-center gap-1.5 bg-primary hover:bg-opacity-90 text-white font-semibold text-[10px] px-3 py-1 rounded-full w-fit mt-1.5 active:scale-95 transition-all shadow-sm cursor-pointer"
                        >
                          <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                            <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.51 0-6.36-2.85-6.36-6.36s2.85-6.36 6.36-6.36c1.623 0 3.102.613 4.232 1.624l3.14-3.14a10.875 10.875 0 00-7.372-2.848C5.02 1.44 0 6.46 0 12.24s5.02 10.8 10.8 10.8c5.448 0 10.08-3.903 10.08-10.08 0-.613-.06-1.192-.18-1.722H12.24z"/>
                          </svg>
                          Connect Google Cloud Sync
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex-grow flex flex-col gap-1.5 min-w-0">
                      <input 
                        type="text" 
                        value={tempName} 
                        onChange={(e) => setTempName(e.target.value)} 
                        placeholder="Thomas Miller"
                        className="w-full h-8 px-2 bg-surface-container border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-xs outline-none font-bold"
                      />
                      <input 
                        type="email" 
                        value={tempEmail} 
                        onChange={(e) => setTempEmail(e.target.value)} 
                        placeholder="t.miller@greenfield.farm"
                        disabled={!!user} // Email editing is disabled for auth providers to preserve login links
                        className="w-full h-8 px-2 bg-surface-container border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-xs outline-none disabled:opacity-55"
                      />
                    </div>
                  )}

                  <div className="flex-shrink-0">
                    {!isEditingProfile ? (
                      <button 
                        onClick={() => {
                          setTempName(currentUserName);
                          setTempEmail(currentUserEmail);
                          setIsEditingProfile(true);
                        }}
                        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container-high transition-all active:scale-95 text-outline"
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <button 
                          onClick={async () => {
                            if (tempName.trim() && tempEmail.trim()) {
                              setUserName(tempName);
                              setUserEmail(tempEmail);
                              localStorage.setItem("agriscan_profile_name", tempName);
                              localStorage.setItem("agriscan_profile_email", tempEmail);

                              localStorage.setItem("agriscan_cached_name", tempName);
                              localStorage.setItem("agriscan_cached_email", tempEmail);
                              if (user) setUser({ ...user, email: tempEmail, fullName: tempName });
                              showToast("Profile details updated successfully", "success");
                              setIsEditingProfile(false);
                            } else {
                              showToast("Name and email cannot be empty", "error");
                            }
                          }}
                          className="px-2 py-1 bg-primary text-white font-bold text-[10px] rounded-lg active:scale-95 transition-all text-center"
                        >
                          Save
                        </button>
                        <button 
                          onClick={() => setIsEditingProfile(false)}
                          className="px-2 py-1 bg-surface-container-high text-on-surface-variant font-bold text-[10px] rounded-lg active:scale-95 transition-all text-center"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>


              </div>
            </section>

            {/* Account Settings Group */}
            <section className="mb-6">
              <h3 className="text-xs font-bold text-tertiary mb-2 px-1 uppercase tracking-wider">Account Settings</h3>
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden shadow-sm">
                <div 
                  onClick={() => {
                    setTempPersonalInfo({ ...personalInfo });
                    setIsPersonalInfoOpen(true);
                  }}
                  className="flex items-center justify-between p-4 border-b border-outline-variant hover:bg-surface-container-low transition-all cursor-pointer active:bg-surface-container"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary">person</span>
                    <span className="text-xs font-bold text-on-surface">Personal Information</span>
                  </div>
                  <span className="material-symbols-outlined text-outline text-lg">chevron_right</span>
                </div>
                
                <div 
                  onClick={() => {
                    setNewPassword("");
                    setConfirmPassword("");
                    setTempPin(pinCode);
                    setIsSecurityOpen(true);
                  }}
                  className="flex items-center justify-between p-4 hover:bg-surface-container-low transition-all cursor-pointer active:bg-surface-container"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary">security</span>
                    <span className="text-xs font-bold text-on-surface">Security & Password</span>
                  </div>
                  <span className="material-symbols-outlined text-outline text-lg">chevron_right</span>
                </div>
              </div>
            </section>

                    {/* Preferences Group */}
            <section className="mb-6">
              <h3 className="text-xs font-bold text-tertiary mb-2 px-1 uppercase tracking-wider">{t("preferences")}</h3>
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden shadow-sm">
                
                {/* Theme Selector */}
                <div 
                  onClick={() => {
                    const nextTheme = appTheme === "dark" ? "light" : "dark";
                    setAppTheme(nextTheme);
                    showToast(`Switched to ${nextTheme === "dark" ? "Dark Theme" : "Light Theme"}`, "success");
                  }}
                  className="p-4 border-b border-outline-variant flex items-center justify-between hover:bg-surface-container-low transition-all cursor-pointer active:bg-surface-container"
                  id="row-theme-selector"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary">
                      {appTheme === "dark" ? "dark_mode" : "light_mode"}
                    </span>
                    <div className="text-left">
                      <span className="block text-xs font-bold text-on-surface">{t("theme")}</span>
                      <span className="block text-[10px] text-on-surface-variant font-medium -mt-0.5">
                        Tap here to switch between Light and Dark
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-secondary/10 text-secondary border border-secondary/20 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wide">
                      {appTheme === "dark" ? "Dark" : "Light"}
                    </span>
                    {/* Animated custom pill switch */}
                    <div className={`w-10 h-6 rounded-full p-0.5 transition-all duration-300 flex items-center ${appTheme === "dark" ? "bg-primary" : "bg-outline/30"}`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow transition-all duration-300 transform ${appTheme === "dark" ? "translate-x-4" : "translate-x-0"}`} />
                    </div>
                  </div>
                </div>

                <div 
                  onClick={() => {
                    const nextLang = appLanguage === "English (US)" ? "Español (ES)" : appLanguage === "Español (ES)" ? "Français (FR)" : "English (US)";
                    setAppLanguage(nextLang);
                    showToast(`System language set to ${nextLang}`, "success");
                  }}
                  className="flex items-center justify-between p-4 border-b border-outline-variant hover:bg-surface-container-low transition-all cursor-pointer active:bg-surface-container"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary">language</span>
                    <span className="text-xs font-bold text-on-surface">{t("language")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-on-surface-variant font-semibold">{appLanguage}</span>
                    <span className="material-symbols-outlined text-outline text-lg">chevron_right</span>
                  </div>
                </div>

                <div 
                  onClick={() => setIsSupportChatOpen(true)}
                  className="flex items-center justify-between p-4 hover:bg-surface-container-low transition-all cursor-pointer active:bg-surface-container"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary">help</span>
                    <span className="text-xs font-bold text-on-surface">{t("helpSupport")}</span>
                  </div>
                  <span className="material-symbols-outlined text-outline text-lg">chevron_right</span>
                </div>
              </div>
            </section>



            {/* Log Out button and storage reset */}
            <section className="mb-6">
              <button 
                onClick={() => {
                  resetAllPortfolios();
                }}
                className={`w-full flex items-center justify-center gap-2 p-3.5 text-xs font-bold rounded-2xl transition-all active:scale-95 border ${
                  pendingReset
                    ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-500 animate-pulse"
                    : "text-error border-error-container/40 hover:bg-error-container/10"
                }`}
              >
                <span className="material-symbols-outlined text-md">
                  {pendingReset ? "warning" : "logout"}
                </span>
                {pendingReset ? "Tap again to Log Out & Reset Cache" : "Log Out & Reset Cache"}
              </button>
            </section>

            {/* Version sticker */}
            <p className="text-center font-mono text-[10px] text-outline font-semibold uppercase mb-10 select-none tracking-wider">
              Version 2.4.1 (Stable Build)
            </p>

            </div>
          </div>
        )}

      </main>

      {/* Expert Chat Overlay Drawer */}
      {isChatOpen && (
        <div className="fixed inset-x-0 bottom-0 top-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center px-4 animate-fadeIn" id="expert-chat-drawer">
          <div className="bg-surface-container-lowest rounded-t-2xl max-w-md md:max-w-xl lg:max-w-2xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden border-t-2 border-primary">
            
            {/* Drawer Header */}
            <div className="p-4 bg-surface border-b border-outline-variant flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsChatOpen(false)}
                  className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-outline hover:text-black transition-all mr-1"
                  title="Go back"
                >
                  <span className="material-symbols-outlined text-base">arrow_back</span>
                </button>
                <div className="w-9 h-9 rounded-full bg-secondary-container flex items-center justify-center border border-secondary/30 shrink-0 font-bold">
                  <span className="material-symbols-outlined text-secondary text-base">support_agent</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-primary">Consul. Dr. Julian Vance</h4>
                  <p className="text-[10px] text-on-surface-variant font-medium font-sans">Calibrated Pathology Advisor</p>
                </div>
              </div>
              
              <button 
                onClick={() => setIsChatOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-outline hover:text-black"
              >
                <span className="material-symbols-outlined text-sm font-bold">close</span>
              </button>
            </div>

            {/* Chat Topic header snippet */}
            <div className="bg-secondary-container/30 px-4 py-2 border-b border-outline-variant/30 text-[10px] font-bold text-primary shrink-0 truncate">
              Subject: {chatTopic}
            </div>

            {/* Chat Messages */}
            <div className="flex-grow p-4 overflow-y-auto flex flex-col gap-3 bg-surface-container-lowest">
              {chatMessages.map((msg, idx) => {
                const isMe = msg.sender === "user";
                return (
                  <div key={idx} className={`flex flex-col max-w-[85%] ${isMe ? "self-end items-end" : "self-start items-start"}`}>
                    <div className={`p-3 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                      isMe 
                        ? "bg-primary text-white rounded-tr-none" 
                        : "bg-surface-container border border-outline-variant text-on-surface rounded-tl-none"
                    }`}>
                      {msg.text}
                    </div>
                    <span className="text-[8px] text-on-surface-variant font-semibold mt-1 px-1">{msg.time}</span>
                  </div>
                );
              })}
            </div>

            {/* Chat Input form */}
            <form onSubmit={sendChatMessage} className="p-3 bg-surface border-t border-outline-variant shrink-0 flex gap-2">
              <input 
                type="text"
                placeholder="Type your agronomical query..."
                className="flex-grow h-11 px-3 bg-surface-container border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none text-on-surface"
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
              />
              <button 
                type="submit"
                disabled={!newMessageText.trim()}
                className="w-11 h-11 bg-primary text-white rounded-xl flex items-center justify-center shrink-0 active:scale-95 transition-all disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-base">send</span>
              </button>
            </form>

          </div>
        </div>
      )}

      {/* Create Portfolio Overlay Drawer */}
      {isCreatePortfolioOpen && (
        <div className="fixed inset-x-0 bottom-0 top-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center px-4 animate-fadeIn" id="create-portfolio-drawer">
          <div className="bg-surface-container-lowest rounded-t-3xl max-w-md md:max-w-xl lg:max-w-2xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden border-t-4 border-emerald-500">
            
            {/* Drawer Header */}
            <div className="p-4 bg-surface border-b border-outline-variant flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <button 
                  type="button"
                  onClick={() => setIsCreatePortfolioOpen(false)}
                  className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-outline hover:text-black transition-all mr-1"
                  title="Go back"
                >
                  <span className="material-symbols-outlined text-base">arrow_back</span>
                </button>
                <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center border border-emerald-200 dark:border-emerald-800/30 shrink-0">
                  <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-base">potted_plant</span>
                </div>
                <div>
                  <h4 className="text-sm font-black text-primary">New Crop Portfolio</h4>
                  <p className="text-[10px] text-on-surface-variant font-medium font-sans">Add a customizable specimen to your workspace</p>
                </div>
              </div>
              
              <button 
                type="button"
                onClick={() => setIsCreatePortfolioOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-outline hover:text-black transition-all"
                id="btn-close-create-portfolio"
              >
                <span className="material-symbols-outlined text-sm font-bold">close</span>
              </button>
            </div>

            {/* Scrollable form body */}
            <form onSubmit={handleCreatePortfolioSubmit} className="flex-grow p-5 overflow-y-auto flex flex-col gap-4 bg-surface-container-lowest no-scrollbar">
              
              {/* Crop Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant font-bold">Portfolio Crop Name *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g., Sweet Bell Peppers"
                  className="w-full h-11 px-3 bg-surface-container border border-outline-variant focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs outline-none font-semibold transition-all text-on-surface"
                  value={newPortfolioName}
                  onChange={(e) => setNewPortfolioName(e.target.value)}
                  id="input-portfolio-name"
                />
              </div>

              {/* Location */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant font-bold">Location (Optional)</label>
                <input 
                  type="text"
                  placeholder="e.g., North Field, Block A"
                  className="w-full h-11 px-3 bg-surface-container border border-outline-variant focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs outline-none font-semibold transition-all text-on-surface"
                  value={newPortfolioLocation}
                  onChange={(e) => setNewPortfolioLocation(e.target.value)}
                  id="input-portfolio-location"
                />
              </div>

              {/* Custom Image selection list */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant font-bold">Thumbnail Image Cover *</label>
                <div className="grid grid-cols-4 gap-2.5 font-bold">
                  
                  {/* Upload own cover page image option */}
                  <div className="relative aspect-square rounded-xl overflow-hidden border border-dashed border-outline-variant flex flex-col items-center justify-center bg-surface-container hover:bg-surface-container-high hover:border-emerald-500 transition-all cursor-pointer">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handlePortfolioCoverUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer text-[0px]"
                      id="input-portfolio-cover-file"
                    />
                    <span className="material-symbols-outlined text-on-surface-variant text-base">add_a_photo</span>
                    <span className="text-[8px] text-on-surface-variant font-black mt-1 uppercase text-center leading-none">Upload Own</span>
                  </div>

                  {[
                    { name: "Maize", url: "https://lh3.googleusercontent.com/aida-public/AB6AXuCJPM5FUbYJekt9TD8bqwPtsgDl_47MJIPWtWApw_1qB3pq9jeQ1w781H-deTvEheM4wV_wtKx3Rn6KZc8qxc3wlFEvW7ifTUrZyQ21kLNSJQsuXXt7YOOj4e1grbOkl3kwXdOXfVJYSoWX9W4L4CFaTJDDjB0eCNzjmN50TjnQsIuHKI3Yh8IGIN4LR9cKaJ8KebLuvm-A5ruAsRwtAOPgtyHaub62hio7o-zz6RlMqXPx-tg47s4CKs4negX65IJ-xe0ZWoA1F-Ze" },
                    { name: "Tomato", url: "https://lh3.googleusercontent.com/aida-public/AB6AXuA35G5LB6ZutbJifOdd6SYrUULXziKOXb0WFSwoSHPJnRUX0cpk-ujPr29hxqAAZdUrTBi1LCAHlsuEG-L-VdLnGV24Oox1SaIHyzO1kE0Wh-GB98iPqv5ErvAOipgdpK8grCQRZgBsKkCfOXL1s0_dv5PNGzZFwgjO6A1dn3do7sT1D_nIYva-pdgjAeF8aEnZr6lNr3uwvXaNuy6kAsGuM2AnrydriJXD3JKV27Nhc9EMZoErKXTUoYvWPtaxHBAmBJ6Fpkk5KMYi" },
                    { name: "Soybeans", url: "https://lh3.googleusercontent.com/aida-public/AB6AXuC4pHTDk1hg4C58vaRhvcJSv-DKDLXWCS9L7ybmEphgLQwBS9JneGSgCeOhdytjomC_uMbRtJqhNLlqqSlzko5afpitQwnOZbIl9OHxLb3WQr7c0Sevrg1CFMq6avj9NLZx7429QW3hGuc15HpVHrUfKkLiXbvv3qSZCaPeSI5OEn7wP6f6cjIWUEoeTHPDQQryvdgXap_VWwuZc9D9wUjez32pynbB12O3nTqbjtz2r4nfPNh37ntkMcuHKUMS62zykVYkSZIIAT_q" },
                    { name: "Potato", url: "https://lh3.googleusercontent.com/aida-public/AB6AXuAI3McbJA_Jxbm0KNH9c0_OHWkzVZwAbela8eV3yKjBAl9gQ4_91h7i3GReL9nbIJxaqlkDZfqd_x5iEnt6Lx1r_SnMbVLx9Ckdla8rvzHmEz0-guGI8Iuy7k9m3TYaNO-BEbWxMbDUl7bTGDxjHEvuTJYCrqyzjBDDGX-_P5BRDnlTXKCjw6IuHELOprc0lBKmFtYbcfc99F-0DEvtUWsK__1yJFVKvQVfZVkOhv138G2AiemSEoJ2xOKA-G8zDwLrmjuP16uV66I1" }
                  ].map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setNewPortfolioImage(preset.url)}
                      className={`relative aspect-square rounded-xl overflow-hidden border border-outline-variant/50 transition-all ${
                        newPortfolioImage === preset.url ? "ring-2 ring-emerald-500 scale-95 shadow-md border-transparent animate-pulse" : "opacity-75 hover:opacity-100"
                      }`}
                    >
                      <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-[8px] font-bold text-center text-white truncate">
                        {preset.name}
                      </div>
                    </button>
                  ))}

                  {/* Show current uploaded file thumbnail if active */}
                  {newPortfolioImage && newPortfolioImage.startsWith("data:image") && (
                    <button
                      type="button"
                      onClick={() => setNewPortfolioImage(newPortfolioImage)}
                      className="relative aspect-square rounded-xl overflow-hidden border border-transparent ring-2 ring-emerald-500 scale-95 shadow-md"
                    >
                      <img src={newPortfolioImage} alt="Cover Upload" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-[8px] font-bold text-center text-white truncate">
                        Uploaded Cover
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* Submit button inside form footer */}
              <div className="mt-4 pt-3 border-t border-outline-variant flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreatePortfolioOpen(false)}
                  className="flex-1 h-12 bg-surface-container hover:bg-surface-container-high text-on-surface-variant rounded-xl text-xs font-bold transition-all active:scale-95 border border-outline-variant"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-12 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-md"
                  id="btn-submit-new-portfolio"
                >
                  <span className="material-symbols-outlined text-sm font-extrabold">check</span>
                  Establish Portfolio
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Floating Action Button (FAB) on Crop List screen */}
      {activeTab === "crops" && !selectedCropId && (
        <button 
          onClick={() => {
            setIsCreatePortfolioOpen(true);
          }}
          className="fixed bottom-24 md:bottom-8 right-5 md:right-8 lg:right-10 w-14 h-14 bg-tertiary-container text-on-tertiary-container rounded-full flex items-center justify-center shadow-2xl border-4 border-tertiary hover:scale-110 active:scale-95 transition-all z-30 cursor-pointer"
          id="crop-list-add-fab"
        >
          <span className="material-symbols-outlined text-[32px] font-semibold">add</span>
        </button>
      )}

      {/* Support Chat Overlay Drawer */}
      {isSupportChatOpen && (
        <div className="fixed inset-x-0 bottom-0 top-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center px-4 animate-fadeIn" id="support-chat-drawer">
          <div className="bg-surface-container-lowest rounded-t-2xl max-w-md md:max-w-xl lg:max-w-2xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden border-t-2 border-primary">
            
            {/* Drawer Header */}
            <div className="p-4 bg-surface border-b border-outline-variant flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsSupportChatOpen(false)}
                  className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-outline hover:text-black transition-all mr-1"
                  title="Go back"
                >
                  <span className="material-symbols-outlined text-base">arrow_back</span>
                </button>
                <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center border border-primary/30 shrink-0">
                  <span className="material-symbols-outlined text-primary text-base">support</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-primary">AgriScan AI Support Bot</h4>
                  <p className="text-[10px] text-on-surface-variant font-medium font-sans">Instant Assistant & Setup Helper</p>
                </div>
              </div>
              
              <button 
                onClick={() => setIsSupportChatOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-outline hover:text-black"
                id="btn-close-support-chat"
              >
                <span className="material-symbols-outlined text-sm font-bold">close</span>
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-grow p-4 overflow-y-auto flex flex-col gap-3 bg-surface-container-lowest">
              {supportMessages.map((msg, idx) => {
                const isMe = msg.sender === "user";
                return (
                  <div key={idx} className={`flex flex-col max-w-[85%] ${isMe ? "self-end items-end" : "self-start items-start"}`}>
                    <div className={`p-3 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                      isMe 
                        ? "bg-primary text-white rounded-tr-none" 
                        : "bg-surface-container border border-outline-variant text-on-surface rounded-tl-none"
                    }`}>
                      {msg.text}
                      
                      {!isMe && (msg.showEmailBtn || msg.text.toLowerCase().includes("email") || msg.text.toLowerCase().includes("daniel") || msg.text.toLowerCase().includes("pontiac") || msg.text.toLowerCase().includes("geek") || msg.text.toLowerCase().includes("ky383")) && (
                        <div className="mt-3 pt-2.5 border-t border-outline-variant/30 flex flex-col gap-2 w-full">
                          <p className="text-[10px] font-semibold text-primary">Need direct help? Contact our Support Center:</p>
                          
                          <div className="flex flex-col gap-1.5">
                            <a 
                              href="mailto:daniel.frimpong003@stu.ucc.edu.gh?subject=AgriScan%20AI%20Support%20Inquiry"
                              className="inline-flex items-center justify-between px-3 py-2 bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20 transition-all text-[11px] font-bold rounded-xl text-left"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-xs">school</span>
                                <div>
                                  <span className="block text-[10px] font-bold">Daniel Frimpong</span>
                                  <span className="block text-[8px] opacity-75 font-medium -mt-0.5">Lead Developer</span>
                                </div>
                              </div>
                              <span className="material-symbols-outlined text-[14px]">mail</span>
                            </a>

                            <a 
                              href="mailto:pontiacmadegeek@gmail.com?subject=AgriScan%20AI%20Operations%20Support"
                              className="inline-flex items-center justify-between px-3 py-2 bg-secondary/5 hover:bg-secondary/10 text-secondary border border-secondary/20 transition-all text-[11px] font-bold rounded-xl text-left"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-xs">settings_applications</span>
                                <div>
                                  <span className="block text-[10px] font-bold">pontiacmadegeek@gmail.com</span>
                                  <span className="block text-[8px] opacity-75 font-medium -mt-0.5">Operations Support</span>
                                </div>
                              </div>
                              <span className="material-symbols-outlined text-[14px]">mail</span>
                            </a>

                            <a 
                              href="mailto:ky383201@gmail.com?subject=AgriScan%20AI%20Database%20Support"
                              className="inline-flex items-center justify-between px-3 py-2 bg-tertiary/5 hover:bg-tertiary/10 text-tertiary border border-tertiary/20 transition-all text-[11px] font-bold rounded-xl text-left"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-xs">database</span>
                                <div>
                                  <span className="block text-[10px] font-bold">ky383201@gmail.com</span>
                                  <span className="block text-[8px] opacity-75 font-medium -mt-0.5">Systems Advisor</span>
                                </div>
                              </div>
                              <span className="material-symbols-outlined text-[14px]">mail</span>
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="text-[8px] text-on-surface-variant font-semibold mt-1 px-1">{msg.time}</span>
                  </div>
                );
              })}
              
              {supportBotLoading && (
                <div className="flex flex-col max-w-[85%] self-start items-start">
                  <div className="p-3 rounded-2xl text-xs font-medium bg-surface-container border border-outline-variant text-on-surface rounded-tl-none shadow-sm flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input form */}
            <form onSubmit={handleSendSupportMsg} className="p-3 bg-surface border-t border-outline-variant shrink-0 flex gap-2">
              <input 
                type="text"
                placeholder="Ask support anything about AgriScan..."
                value={newSupportMessage}
                onChange={(e) => setNewSupportMessage(e.target.value)}
                className="flex-grow h-11 px-3 bg-surface-container border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none font-semibold transition-all"
                disabled={supportBotLoading}
              />
              <button 
                type="submit"
                disabled={supportBotLoading || !newSupportMessage.trim()}
                className="w-11 h-11 bg-primary text-white rounded-xl flex items-center justify-center disabled:opacity-50 active:scale-95 transition-all text-center"
              >
                <span className="material-symbols-outlined text-base font-bold">send</span>
              </button>
            </form>

          </div>
        </div>
      )}

      {/* Personal Information Overlay Drawer */}
      {isPersonalInfoOpen && (
        <div className="fixed inset-x-0 bottom-0 top-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center px-4 animate-fadeIn" id="personal-info-drawer">
          <div className="bg-surface-container-lowest rounded-t-3xl max-w-md w-full h-[80vh] flex flex-col shadow-2xl overflow-hidden border-t-4 border-emerald-500 animate-slideUp">
            
            {/* Drawer Header */}
            <div className="p-4 bg-surface border-b border-outline-variant flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center border border-emerald-200 dark:border-emerald-800/30 shrink-0">
                  <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-base">person</span>
                </div>
                <div>
                  <h4 className="text-sm font-black text-primary">Personal Information</h4>
                  <p className="text-[10px] text-on-surface-variant font-medium font-sans">Manage your active dynamic profile details</p>
                </div>
              </div>
              
              <button 
                type="button"
                onClick={() => setIsPersonalInfoOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-outline hover:text-black transition-all"
                id="btn-close-personal-info"
              >
                <span className="material-symbols-outlined text-sm font-bold">close</span>
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                setPersonalInfo(tempPersonalInfo);
                localStorage.setItem("agriscan_personal_info", JSON.stringify(tempPersonalInfo));
                // Sync name to top profile card too
                if (tempPersonalInfo.fullName) {
                  setUserName(tempPersonalInfo.fullName);
                  setTempName(tempPersonalInfo.fullName);
                  localStorage.setItem("agriscan_profile_name", tempPersonalInfo.fullName);
                }
                showToast("Personal Details updated successfully!", "success");
                setIsPersonalInfoOpen(false);
              }}
              className="flex-grow p-4 overflow-y-auto flex flex-col gap-5 bg-surface-container-lowest no-scrollbar"
            >
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant font-bold">Full Name</label>
                <input 
                  type="text" 
                  value={tempPersonalInfo.fullName}
                  onChange={(e) => setTempPersonalInfo(prev => ({ ...prev, fullName: e.target.value }))}
                  required
                  className="w-full h-11 px-3 bg-surface border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none font-semibold transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant font-bold">Phone Number</label>
                <input 
                  type="text" 
                  value={tempPersonalInfo.phone}
                  onChange={(e) => setTempPersonalInfo(prev => ({ ...prev, phone: e.target.value }))}
                  required
                  className="w-full h-11 px-3 bg-surface border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none font-semibold transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant font-bold">Farming Region / Country</label>
                <input 
                  type="text" 
                  value={tempPersonalInfo.region}
                  onChange={(e) => setTempPersonalInfo(prev => ({ ...prev, region: e.target.value }))}
                  required
                  className="w-full h-11 px-3 bg-surface border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none font-semibold transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant font-bold">Primary Focus</label>
                <select 
                  value={tempPersonalInfo.farmingFocus}
                  onChange={(e) => setTempPersonalInfo(prev => ({ ...prev, farmingFocus: e.target.value }))}
                  className="w-full h-11 px-3 bg-surface border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none font-semibold transition-all"
                >
                  <option value="Maize & Soybeans">Maize & Soybeans</option>
                  <option value="Tomato & Peppers">Tomato & Peppers</option>
                  <option value="Cassava & Tuber Crops">Cassava & Tuber Crops</option>
                  <option value="Mixed Agronomy Plot">Mixed Agronomy Plot</option>
                  <option value="Orchards & Forestry">Orchards & Forestry</option>
                  <option value="Vineyards & Horticulture">Vineyards & Horticulture</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant font-bold">Farm Acreage Size</label>
                <input 
                  type="text" 
                  value={tempPersonalInfo.acreage}
                  onChange={(e) => setTempPersonalInfo(prev => ({ ...prev, acreage: e.target.value }))}
                  required
                  className="w-full h-11 px-3 bg-surface border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none font-semibold transition-all"
                />
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-4 border-t border-outline-variant shrink-0 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsPersonalInfoOpen(false)}
                  className="flex-1 py-3 bg-surface border border-outline-variant font-bold text-xs rounded-xl hover:bg-surface-container active:scale-95 transition-all text-center"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-primary text-white font-bold text-xs rounded-xl hover:bg-opacity-90 active:scale-95 transition-all text-center font-semibold shadow-sm"
                >
                  Save Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Security & Password Overlay Drawer */}
      {isSecurityOpen && (
        <div className="fixed inset-x-0 bottom-0 top-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center px-4 animate-fadeIn" id="security-drawer">
          <div className="bg-surface-container-lowest rounded-t-3xl max-w-md w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden border-t-4 border-emerald-500 animate-slideUp">
            
            {/* Drawer Header */}
            <div className="p-4 bg-surface border-b border-outline-variant flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center border border-emerald-200 dark:border-emerald-800/30 shrink-0">
                  <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-base">security</span>
                </div>
                <div>
                  <h4 className="text-sm font-black text-primary">Security & Passcode</h4>
                  <p className="text-[10px] text-on-surface-variant font-medium font-sans">Manage app locks and credentials</p>
                </div>
              </div>
              
              <button 
                type="button"
                onClick={() => setIsSecurityOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-outline hover:text-black transition-all"
                id="btn-close-security"
              >
                <span className="material-symbols-outlined text-sm font-bold">close</span>
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-grow p-4 overflow-y-auto flex flex-col gap-6 bg-surface-container-lowest no-scrollbar">
              
              {/* App Passcode Lock Section */}
              <div className="flex flex-col gap-3 p-4 bg-surface border border-outline-variant rounded-2xl shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-on-surface">Enable Lock Passcode PIN</h5>
                    <p className="text-[9px] text-on-surface-variant mt-0.5 font-medium leading-relaxed">Require a 4-digit PIN when launching AgriScan AI</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      const next = !isPinEnabled;
                      setIsPinEnabled(next);
                      localStorage.setItem("agriscan_pin_enabled", next ? "true" : "false");
                      if (!next) {
                        setPinCode("");
                        setTempPin("");
                        localStorage.removeItem("agriscan_pin_code");
                        showToast("Passcode lock deactivated.", "info");
                      } else {
                        showToast("Please enter a 4-digit PIN below and save.", "info");
                      }
                    }}
                    className={`w-10 h-6 rounded-full p-0.5 transition-all ${
                      isPinEnabled ? "bg-primary flex justify-end" : "bg-outline-variant flex justify-start"
                    }`}
                  >
                    <div className="w-5 h-5 bg-white rounded-full shadow-sm" />
                  </button>
                </div>

                {isPinEnabled && (
                  <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-outline-variant/50 animate-fadeIn">
                    <label className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant font-bold">4-Digit Security PIN</label>
                    <div className="flex gap-2">
                      <input 
                        type="password" 
                        maxLength={4}
                        placeholder="e.g. 1234"
                        value={tempPin}
                        onChange={(e) => setTempPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        className="w-full h-10 px-3 bg-surface-container border border-outline-variant focus:border-primary rounded-xl text-center text-sm tracking-widest font-black outline-none transition-all"
                      />
                      <button 
                        type="button"
                        disabled={tempPin.length !== 4}
                        onClick={() => {
                          setPinCode(tempPin);
                          localStorage.setItem("agriscan_pin_code", tempPin);
                          showToast("Security Pass PIN updated successfully!", "success");
                        }}
                        className="px-4 bg-primary text-white text-xs font-bold rounded-xl active:scale-95 hover:bg-opacity-90 disabled:opacity-50 transition-all shrink-0"
                      >
                        Set PIN
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Login Method Banner */}
              <div className="p-4 bg-surface border border-outline-variant rounded-2xl shadow-sm flex flex-col gap-2">
                <h5 className="text-xs font-bold text-on-surface">Authentication Status</h5>
                {user ? (
                  <div className="flex flex-col gap-1 mt-1">
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold">
                      <span className="material-symbols-outlined text-[14px]">cloud_done</span>
                      Logged in via {user.providerData.some(p => p.providerId === "google.com") ? "Google Single Sign-In" : "Email & Password"}
                    </div>
                    <p className="text-[9px] text-on-surface-variant font-medium leading-relaxed">Your account credentials protect and cloud-synchronize your AgriScan portfolios.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 mt-1">
                    <div className="flex items-center gap-1.5 text-[10px] text-amber-600 font-bold">
                      <span className="material-symbols-outlined text-[14px]">report_problem</span>
                      Running as Guest / Offline mode
                    </div>
                    <p className="text-[9px] text-on-surface-variant font-medium leading-relaxed">Connect external credentials in Settings or sign up to activate Cloud backup protection.</p>
                  </div>
                )}
              </div>

              {/* Firebase Password Update Form */}
              {user && user.providerData.some(p => p.providerId === "password") && (
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newPassword || newPassword.length < 6) {
                      showToast("Password must be at least 6 characters long.", "error");
                      return;
                    }
                    if (newPassword !== confirmPassword) {
                      showToast("Passwords do not match.", "error");
                      return;
                    }
                    setIsSecurityLoading(true);
                    try {
                      if (user) {
                        // Password update via backend
                        const res = await fetch("/api/auth/change-password", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("agriscan_token")}` }, body: JSON.stringify({ newPassword }) });
                        if (!res.ok) throw new Error((await res.json()).error || "Failed");
                        showToast("Password updated successfully!", "success");
                        setNewPassword("");
                        setConfirmPassword("");
                        setIsSecurityOpen(false);
                      }
                    } catch (err: any) {
                      console.error("Firebase updatePassword error:", err);
                      if (err.code === "auth/requires-recent-login") {
                        showToast("Re-authenticate requested. Please log out and back in to change password.", "error");
                      } else {
                        showToast(err.message || "Failed to update password.", "error");
                      }
                    } finally {
                      setIsSecurityLoading(false);
                    }
                  }}
                  className="flex flex-col gap-4 p-4 bg-surface border border-outline-variant rounded-2xl shadow-sm"
                >
                  <h5 className="text-xs font-bold text-on-surface">Change Account Password</h5>
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant font-bold">New Password</label>
                    <input 
                      type="password" 
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full h-10 px-3 bg-surface-container border border-outline-variant focus:border-primary rounded-xl text-xs outline-none font-semibold transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant font-bold">Confirm New Password</label>
                    <input 
                      type="password" 
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full h-10 px-3 bg-surface-container border border-outline-variant focus:border-primary rounded-xl text-xs outline-none font-semibold transition-all"
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={isSecurityLoading}
                    className="w-full py-2.5 bg-primary text-white text-xs font-bold rounded-xl active:scale-95 disabled:opacity-55 hover:bg-opacity-90 transition-all text-center mt-1 font-semibold"
                  >
                    {isSecurityLoading ? "Updating..." : "Update Password"}
                  </button>
                </form>
              )}

              {/* Google Managed Note */}
              {user && user.providerData.some(p => p.providerId === "google.com") && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/20 rounded-2xl shadow-sm flex items-start gap-3">
                  <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0">verified_user</span>
                  <div>
                    <h5 className="text-xs font-bold text-emerald-800 dark:text-emerald-400">Enterprise Google SSO Security</h5>
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-500/80 mt-1 leading-relaxed font-sans">
                      Your identity credentials, keys, and security parameters are fully managed by Google Auth. 
                      Change password, enable two-factor setup, or passkeys inside your external Google Account parameters.
                    </p>
                  </div>
                </div>
              )}

              {/* Close Button */}
              <button 
                type="button" 
                onClick={() => setIsSecurityOpen(false)}
                className="w-full py-3 bg-surface border border-outline-variant font-bold text-xs rounded-xl hover:bg-surface-container active:scale-95 transition-all text-center mt-2 font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* App Lock Passcode Screen */}
      {isAppLocked && (
        <div className="fixed inset-0 bg-surface z-[100] flex flex-col justify-center items-center px-6 animate-fadeIn">
          <div className="max-w-xs w-full flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center border border-emerald-200 dark:border-emerald-800/30">
              <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-3xl animate-pulse">lock</span>
            </div>
            
            <div className="text-center">
              <h1 className="text-xl font-bold font-sans text-on-surface">AgriScan AI Locked</h1>
              <p className="text-xs text-on-surface-variant mt-1.5 font-medium">Please enter your 4-digit security PIN</p>
            </div>

            {/* Dots */}
            <div className="flex gap-4 my-2">
              {[0, 1, 2, 3].map((idx) => (
                <div 
                  key={idx} 
                  className={`w-3.5 h-3.5 rounded-full border-2 border-primary transition-all duration-150 ${
                    enteredPin.length > idx 
                      ? "bg-primary scale-110" 
                      : "bg-transparent"
                  } ${pinError ? "border-error bg-error animate-shake" : ""}`}
                />
              ))}
            </div>

            {/* Custom Keypad */}
            <div className="grid grid-cols-3 gap-4 w-full justify-items-center">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    if (enteredPin.length < 4) {
                      const newPin = enteredPin + num;
                      setEnteredPin(newPin);
                      if (newPin === pinCode) {
                        setTimeout(() => {
                          setIsAppLocked(false);
                          setEnteredPin("");
                          showToast("Welcome back to AgriScan AI!", "success");
                        }, 250);
                      } else if (newPin.length === 4) {
                        // Error
                        setTimeout(() => {
                          setPinError(true);
                          showToast("Incorrect security PIN code.", "error");
                          setTimeout(() => {
                            setPinError(false);
                            setEnteredPin("");
                          }, 600);
                        }, 200);
                      }
                    }
                  }}
                  className="w-16 h-16 rounded-full bg-surface-container-low hover:bg-surface-container-high text-on-surface font-sans font-bold text-lg flex items-center justify-center border border-outline-variant/50 transition-all active:scale-90"
                >
                  {num}
                </button>
              ))}
              
              {/* Clear */}
              <button
                type="button"
                onClick={() => setEnteredPin("")}
                className="w-16 h-16 rounded-full text-xs font-bold text-outline hover:text-on-surface flex items-center justify-center transition-all active:scale-90"
              >
                CLEAR
              </button>

              {/* Zero */}
              <button
                key={0}
                type="button"
                onClick={() => {
                  if (enteredPin.length < 4) {
                    const newPin = enteredPin + "0";
                    setEnteredPin(newPin);
                    if (newPin === pinCode) {
                      setTimeout(() => {
                        setIsAppLocked(false);
                        setEnteredPin("");
                        showToast("Welcome back to AgriScan AI!", "success");
                      }, 250);
                    } else if (newPin.length === 4) {
                      setTimeout(() => {
                        setPinError(true);
                        showToast("Incorrect security PIN code.", "error");
                        setTimeout(() => {
                          setPinError(false);
                          setEnteredPin("");
                        }, 600);
                      }, 200);
                    }
                  }
                }}
                className="w-16 h-16 rounded-full bg-surface-container-low hover:bg-surface-container-high text-on-surface font-sans font-bold text-lg flex items-center justify-center border border-outline-variant/50 transition-all active:scale-90"
              >
                0
              </button>

              {/* Backspace */}
              <button
                type="button"
                onClick={() => {
                  setEnteredPin(enteredPin.slice(0, -1));
                }}
                className="w-16 h-16 rounded-full bg-surface-container-lowest text-outline hover:text-on-surface flex items-center justify-center transition-all active:scale-90"
              >
                <span className="material-symbols-outlined">backspace</span>
              </button>
            </div>
            
            {/* Quick Guest Bypass / Logout */}
            <button 
              onClick={async () => {
                if (user || localStorage.getItem("agriscan_cached_uid")) {
                  localStorage.removeItem("agriscan_token");
                  localStorage.removeItem("agriscan_cached_uid");
                  localStorage.removeItem("agriscan_cached_email");
                  localStorage.removeItem("agriscan_cached_name");
                  localStorage.removeItem("agriscan_session_restored");
                  localStorage.setItem("agriscan_explicit_logout", "true");
                  setUser(null);
                  showToast("Signed out successfully.", "success");
                }
                setIsAppLocked(false);
                setIsGuestMode(true);
                localStorage.setItem("agriscan_guest_allowed", "true");
              }}
              className="text-xs text-primary font-bold hover:underline py-1 mt-4"
            >
              Log Out / Switch to Offline Guest
            </button>
          </div>
        </div>
      )}


      {/* BottomNavBar - mobile only */}
      <nav className="fixed bottom-0 left-0 right-0 w-full z-40 flex md:hidden justify-around items-center px-6 pb-3 pt-2.5 bg-surface border-t border-outline-variant shadow-xl">
        
        {/* Crops Tab */}
        <button 
          onClick={() => {
            setSelectedCropId(null);
            setScanResult(null);
            setActiveScanningPortfolioId(null);
            setSaveTargetPortfolioId("NEW");
            setActiveTab("crops");
          }}
          className={`flex flex-col items-center justify-center px-4 py-1 rounded-full transition-all active:scale-90 ${
            activeTab === "crops" 
              ? "bg-secondary-container text-on-secondary-container font-semibold" 
              : "text-on-surface-variant hover:bg-surface-container-low"
          }`}
          id="tab-crops"
        >
          <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: activeTab === "crops" ? "'FILL' 1" : "'FILL' 0" }}>potted_plant</span>
          <span className="text-[10px] font-bold mt-0.5 tracking-tight uppercase">{t("crops")}</span>
        </button>



        {/* Scan Specimen Tab */}
        <button 
          onClick={() => {
            setScanResult(null);
            setActiveScanningPortfolioId(null);
            setSaveTargetPortfolioId("NEW");
            setActiveTab("scan");
          }}
          className={`flex flex-col items-center justify-center px-4 py-1 rounded-full transition-all active:scale-90 ${
            activeTab === "scan" 
              ? "bg-secondary-container text-on-secondary-container font-semibold" 
              : "text-on-surface-variant hover:bg-surface-container-low"
          }`}
          id="tab-scan"
        >
          <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: activeTab === "scan" ? "'FILL' 1" : "'FILL' 0" }}>add_circle</span>
          <span className="text-[10px] font-bold mt-0.5 tracking-tight uppercase">{t("scan")}</span>
        </button>

        {/* Settings Tab */}
        <button 
          onClick={() => {
            setScanResult(null);
            setActiveScanningPortfolioId(null);
            setSaveTargetPortfolioId("NEW");
            setActiveTab("settings");
          }}
          className={`flex flex-col items-center justify-center px-4 py-1 rounded-full transition-all active:scale-90 ${
            activeTab === "settings" 
              ? "bg-secondary-container text-on-secondary-container font-semibold" 
              : "text-on-surface-variant hover:bg-surface-container-low"
          }`}
          id="tab-settings"
        >
          <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: activeTab === "settings" ? "'FILL' 1" : "'FILL' 0" }}>settings</span>
          <span className="text-[10px] font-bold mt-0.5 tracking-tight uppercase font-sans">{t("settings")}</span>
        </button>

      </nav>

      </div>{/* End Main Content Wrapper */}

      {/* PWA Install Banner */}
      {showInstallBanner && !isAppInstalled && (
        <div className="fixed bottom-24 md:bottom-6 inset-x-3 md:left-64 lg:left-68 md:right-6 z-50 animate-fadeIn" id="pwa-install-banner">
          <div className="bg-primary text-on-primary rounded-2xl shadow-2xl border border-on-primary/10 p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-on-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>install_mobile</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-tight">Install AgriScan AI</p>
              <p className="text-[11px] opacity-75 mt-0.5 leading-snug">Add to home screen for quick access & offline use</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={dismissInstallBanner}
                className="px-3 py-2 rounded-lg text-xs font-semibold opacity-70 hover:opacity-100 hover:bg-on-primary/10 transition-all active:scale-95"
                id="pwa-dismiss-btn"
              >
                Later
              </button>
              <button
                onClick={handleInstallApp}
                className="px-4 py-2 bg-on-primary text-primary rounded-lg text-xs font-bold shadow-lg hover:shadow-xl transition-all active:scale-95"
                id="pwa-install-btn"
              >
                Install
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gemini AI Chatbot Floating Button */}
      {!isGeminiChatOpen && (
        <button
          onClick={() => setIsGeminiChatOpen(true)}
          className="fixed bottom-44 md:bottom-24 right-5 md:right-8 w-14 h-14 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all z-50 cursor-pointer border-2 border-primary-container"
          id="gemini-chat-fab"
          title="Chat with AgriScan AI"
          style={themes[appTheme] || {}}
        >
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>forum</span>
        </button>
      )}

      {/* Gemini AI Chat Panel */}
      {isGeminiChatOpen && (
        <div className="fixed bottom-0 right-0 md:bottom-6 md:right-8 w-full h-full md:w-[420px] md:h-[600px] md:max-h-[80vh] z-50 flex flex-col animate-fadeIn md:rounded-2xl overflow-hidden shadow-2xl border border-outline-variant" style={themes[appTheme] || {}} id="gemini-chat-panel">
          {/* Chat Header */}
          <div className="bg-primary text-on-primary px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-on-primary/15 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
              </div>
              <div>
                <h4 className="text-sm font-bold leading-tight">AgriScan AI Assistant</h4>
                <p className="text-[10px] opacity-75 font-medium">Powered by Gemini 2.5 Flash</p>
              </div>
            </div>
            <button
              onClick={() => setIsGeminiChatOpen(false)}
              className="w-8 h-8 rounded-full bg-on-primary/15 hover:bg-on-primary/25 flex items-center justify-center transition-all active:scale-90"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background no-scrollbar">
            {geminiMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed font-medium ${
                  msg.role === "user"
                    ? "bg-primary text-on-primary rounded-br-md"
                    : "bg-surface-container border border-outline-variant text-on-surface rounded-bl-md"
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {geminiLoading && (
              <div className="flex justify-start">
                <div className="bg-surface-container border border-outline-variant px-4 py-3 rounded-2xl rounded-bl-md flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                </div>
              </div>
            )}
            <div ref={geminiChatEndRef} />
          </div>

          {/* Chat Input */}
          <form onSubmit={sendGeminiMessage} className="border-t border-outline-variant bg-surface px-3 py-2.5 flex items-center gap-2 shrink-0">
            <input
              type="text"
              value={geminiInput}
              onChange={(e) => setGeminiInput(e.target.value)}
              placeholder="Ask about crops, diseases, farming..."
              className="flex-1 h-10 px-3.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-on-surface"
              disabled={geminiLoading}
              id="gemini-chat-input"
            />
            <button
              type="submit"
              disabled={geminiLoading || !geminiInput.trim()}
              className="w-10 h-10 bg-primary text-on-primary rounded-xl flex items-center justify-center active:scale-90 transition-all disabled:opacity-40 shrink-0"
            >
              <span className="material-symbols-outlined text-lg">send</span>
            </button>
          </form>
        </div>
      )}

      {/* Toast Notification Banner */}
      {toast && (
        <div className="absolute top-20 inset-x-5 z-50 flex justify-center pointer-events-none animate-fadeIn">
          <div className="bg-inverse-surface text-inverse-on-surface px-4 py-3 rounded-xl shadow-xl border border-outline-variant/10 flex items-center gap-2 max-w-xs pointer-events-auto">
            <span className="material-symbols-outlined text-[18px] text-primary-fixed-dim animate-pulse">
              {toast.type === "success" ? "check_circle" : toast.type === "error" ? "error" : "info"}
            </span>
            <span className="text-xs font-semibold leading-tight">{toast.message}</span>
          </div>
        </div>
      )}

    </div>
  );
}
