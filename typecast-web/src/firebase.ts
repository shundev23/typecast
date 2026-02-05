import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// typecast-v2 プロジェクト（環境変数で上書き可能）
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDY-aJ2TJgL4LJ_Sv_ifRczB8BXyJA8UdE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "typecast-v2.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "typecast-v2",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "typecast-v2.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "220731639324",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:220731639324:web:731545b9dd592646b8c1d9",
};

// Firebaseアプリの初期化
const app = initializeApp(firebaseConfig);

// 各機能のエクスポート
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app, "typecast-db");