import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyAbdvu0-CAa5Op0nzLkcYSu6xkt4ZxH0hU",
    authDomain: "simula-ai-bba91.firebaseapp.com",
    projectId: "simula-ai-bba91",
    storageBucket: "simula-ai-bba91.firebasestorage.app",
    messagingSenderId: "1011713534352",
    appId: "1:1011713534352:web:c37ad74e4d63894d0c6b15",
    measurementId: "G-9D91E1QQJ7"
  };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };