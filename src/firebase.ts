import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Import the Firebase configuration
let firebaseConfig: any;
try {
  firebaseConfig = await import('../firebase-applet-config.json').then(m => m.default);
} catch (e) {
  console.error("Firebase configuration not found. Please ensure firebase-applet-config.json exists at the root.");
  // Provide a minimal fallback to prevent immediate crash, though it won't work
  firebaseConfig = {
    apiKey: "missing",
    authDomain: "missing",
    projectId: "missing",
    appId: "missing"
  };
}

// Initialize Firebase SDK
let app: any;
try {
  app = initializeApp(firebaseConfig);
} catch (e) {
  console.error("Firebase initialization failed:", e);
  // Create a dummy app object to prevent further crashes
  app = { name: "[DEFAULT]", options: firebaseConfig, automaticDataCollectionEnabled: false };
}

let db: any;
let auth: any;

try {
  db = getFirestore(app);
} catch (e) {
  console.error("Firestore initialization failed:", e);
}

try {
  auth = getAuth(app);
} catch (e) {
  console.error("Auth initialization failed:", e);
}

export { db, auth };
