// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBBXlMsVKCVZg7wkw2CjWeetnGkpINV_M4",
  authDomain: "webnexus-cdc47.firebaseapp.com",
  projectId: "webnexus-cdc47",
  storageBucket: "webnexus-cdc47.firebasestorage.app",
  messagingSenderId: "185823698270",
  appId: "1:185823698270:web:b92eb6507a6974e46043cf",
  measurementId: "G-59DS94R3BX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
