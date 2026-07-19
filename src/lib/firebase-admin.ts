import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import firebaseConfig from "../../firebase-applet-config.json";

// Force the process to use the explicit project ID and ignore system defaults
process.env.GOOGLE_CLOUD_PROJECT = firebaseConfig.projectId;
process.env.GCLOUD_PROJECT = firebaseConfig.projectId;
process.env.FIREBASE_CONFIG = JSON.stringify({ projectId: firebaseConfig.projectId });

// Disable default local credentials that belong to a different project
delete process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

export const adminAuth = getAuth();
