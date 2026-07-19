export type StatusType = "Healthy" | "Normal" | "Sick";

export interface CropPortfolio {
  id: string;
  name: string;
  lastScan: string;
  status: StatusType;
  image: string;
  healthScore: number;
  moisture: number;
  estYield: string;
  scienceName?: string;
  location?: string;
  growthStage: string; // "Seedling" | "Vegetative" | "Tasseling" | "Grain Fill" | "Maturity"
  statsHistory: { date: string; health: number; moisture: number }[];
  activities: Activity[];
  scanHistory?: any[];
  growthLogs?: { id: string; date: string; stage: string; height: number; notes: string }[];
  ownerId?: string;
}

export interface Activity {
  id: string;
  type: "alert" | "info" | "success" | "warning";
  title: string;
  time: string;
  description: string;
  analysisLink?: boolean;
}

export interface DiseaseInfo {
  name: string;
  pathogen: string;
  description: string;
  solutions: string[];
}
