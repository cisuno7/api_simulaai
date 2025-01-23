import { auth } from "../config/firebaseConfig.js";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

// Registrar usuário


// Obter usuário logado
export const getLoggedInUser = async () => {
  try {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe(); // Para de escutar depois que pegar o usuário
        resolve(user); // Retorna o usuário logado ou null
      });
    });
  } catch (error) {
    console.error("Erro ao obter o usuário logado", error);
    return null;
  }
};