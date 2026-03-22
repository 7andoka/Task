import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Import the Firebase configuration
import firebaseConfig from '../firebase-applet-config.json';

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
  db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
} catch (e) {
  console.error("Firestore initialization failed:", e);
}

try {
  auth = getAuth(app);
} catch (e) {
  console.error("Auth initialization failed:", e);
}

export { db, auth };
