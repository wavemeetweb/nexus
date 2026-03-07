import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBBXlMsVKCVZg7wkw2CjWeetnGkpINV_M4",
  authDomain: "webnexus-cdc47.firebaseapp.com",
  projectId: "webnexus-cdc47",
  storageBucket: "webnexus-cdc47.appspot.com", 
  messagingSenderId: "185823698270",
  appId: "1:185823698270:web:b92eb6507a6974e46043cf"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
