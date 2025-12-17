import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAB6p2rLrR_YJjwgHTW3irj1zapgoGldEI",
  authDomain: "sixth-tribute-481218-f0.firebaseapp.com",
  projectId: "sixth-tribute-481218-f0",
  storageBucket: "sixth-tribute-481218-f0.firebasestorage.app",
  messagingSenderId: "478973527810",
  appId: "1:478973527810:web:7629f0021d4a854e32641b",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
