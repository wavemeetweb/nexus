import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBBXlMsVKCVZg7wkw2CjWeetnGkpINV_M4",
  authDomain: "webnexus-cdc47.firebaseapp.com",
  projectId: "webnexus-cdc47",
  storageBucket: "webnexus-cdc47.firebasestorage.appspot.com",
  messagingSenderId: "185823698270",
  appId: "1:185823698270:web:b92eb6507a6974e46043cf"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
