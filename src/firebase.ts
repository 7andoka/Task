import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Import the Firebase configuration
import firebaseConfig from '../firebase-applet-config.json';

console.log("Initializing Firebase with project ID:", firebaseConfig.projectId);
console.log("Firestore Database ID:", (firebaseConfig as any).firestoreDatabaseId || '(default)');

// Initialize Firebase SDK
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
export const auth = getAuth(app);

// Function to create a secondary app for admin tasks (like creating users)
export const createSecondaryApp = () => {
  const secondaryAppName = `secondary-${Date.now()}`;
  return initializeApp(firebaseConfig, secondaryAppName);
};
