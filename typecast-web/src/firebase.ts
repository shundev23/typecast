import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase設定（全て環境変数から取得）
// ※ 環境変数が未設定の場合はエラーを投げて早期に問題を検出
const requiredEnvVars = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// 環境変数の検証
Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (!value) {
    throw new Error(
      `Firebase configuration error: ${key} is not defined. ` +
      `Please set VITE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()} in your .env file.`
    );
  }
});

// authDomainを現在のホスト名に基づいて動的に設定
// これにより、どのドメインでアクセスしても正しく認証できる
// セキュリティ: 許可リストに含まれるドメインのみを受け入れる
const getCurrentAuthDomain = (): string => {
  const hostname = window.location.hostname;
  
  // 許可されたドメインのマッピング（ホワイトリスト方式）
  const allowedDomains: Record<string, string> = {
    'tycast.net': 'tycast.net',
    'www.tycast.net': 'tycast.net',
    'typecast-v2.web.app': 'typecast-v2.web.app',
    'typecast-v2.firebaseapp.com': 'typecast-v2.firebaseapp.com',
    'localhost': requiredEnvVars.authDomain || 'typecast-v2.firebaseapp.com',
    '127.0.0.1': requiredEnvVars.authDomain || 'typecast-v2.firebaseapp.com',
  };
  
  // ホワイトリストに含まれるドメインのみを許可
  const authDomain = allowedDomains[hostname];
  
  if (!authDomain) {
    console.warn(`Unauthorized hostname detected: ${hostname}. Falling back to default authDomain.`);
    return requiredEnvVars.authDomain || 'typecast-v2.firebaseapp.com';
  }
  
  return authDomain;
};

const authDomain = getCurrentAuthDomain();

const firebaseConfig = {
  apiKey: requiredEnvVars.apiKey,
  authDomain: authDomain,
  projectId: requiredEnvVars.projectId,
  storageBucket: requiredEnvVars.storageBucket,
  messagingSenderId: requiredEnvVars.messagingSenderId,
  appId: requiredEnvVars.appId,
};

// Firebaseアプリの初期化
const app = initializeApp(firebaseConfig);

// 各機能のエクスポート
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app, "typecast-db");

// 認証の永続化を明示的に設定（ブラウザのローカルストレージに保存）
setPersistence(auth, browserLocalPersistence)
  .catch(console.error);