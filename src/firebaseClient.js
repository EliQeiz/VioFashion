import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDZdKyeHLJk0XdxgwTZGRCFEpITphKnpaQ",
  authDomain: "viofashion-19cf1.firebaseapp.com",
  projectId: "viofashion-19cf1",
  storageBucket: "viofashion-19cf1.firebasestorage.app",
  messagingSenderId: "389995334496",
  appId: "1:389995334496:web:398ee7981c39db5df5ac05",
  measurementId: "G-75CS06W2T5",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
