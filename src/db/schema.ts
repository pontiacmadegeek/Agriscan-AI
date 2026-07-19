import { pgTable, text, integer, jsonb, timestamp, serial } from "drizzle-orm/pg-core";

// Users table — supports custom auth (email + password) via Postgres
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(), // unique user id (uuid generated server-side)
  email: text("email").notNull().unique(),
  fullName: text("full_name").default(""),
  passwordHash: text("password_hash"), // null for future OAuth users
  createdAt: timestamp("created_at").defaultNow(),
});

// Crop portfolios stored in PostgreSQL
export const portfolios = pgTable("portfolios", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id")
    .references(() => users.uid)
    .notNull(),
  name: text("name").notNull(),
  lastScan: text("last_scan"),
  status: text("status"), // "Healthy" | "Pest Risk" | "Ready" | "Warning" | "Infected"
  image: text("image"), // URL or Base64
  healthScore: integer("health_score"),
  moisture: integer("moisture"),
  estYield: text("est_yield"),
  scienceName: text("science_name"),
  growthStage: text("growth_stage"),
  statsHistory: jsonb("stats_history").default([]),
  activities: jsonb("activities").default([]),
  scanHistory: jsonb("scan_history").default([]),
  growthLogs: jsonb("growth_logs").default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

// Storage files acting as Supabase Bucket storage stored in Cloud SQL
export const storageFiles = pgTable("storage_files", {
  id: text("id").primaryKey(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileData: text("file_data").notNull(), // Base64 data block
  ownerId: text("owner_id"), // Firebase Auth UID
  createdAt: timestamp("created_at").defaultNow(),
});
