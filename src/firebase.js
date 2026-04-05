import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Paste your Firebase config here from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyCS1BcfFFuJDGqMBLyOEb13mLdKbaMaY2I",
  authDomain: "blush-e821f.firebaseapp.com",
  projectId: "blush-e821f",
  storageBucket: "blush-e821f.firebasestorage.app",
  messagingSenderId: "740107627361",
  appId: "1:740107627361:web:2559c1e9138b659e4e3320"
};

const app = initializeApp(firebaseConfig);
export const db  = getFirestore(app);
export const auth = getAuth(app);