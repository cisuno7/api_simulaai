
import { collection, addDoc } from "firebase/firestore";
import { getLoggedInUser } from "../services/authService.js";
import  {db}  from "../config/firebaseConfig.js"
/**
 * Salva as respostas de um simulado no Firestore.
 */
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

export const saveResponse = async (req, res) => {
  try {
    const { simuladoId, userId, responses } = req.body;

    // Salva as respostas no Firestore
    const responseRef = await addDoc(collection(db, 'responses'), {
      simuladoId,
      userId,
      responses,
      createdAt: serverTimestamp(),
    });

    res.json({ responseId: responseRef.id });
  } catch (error) {
    console.error('Erro ao salvar  as resposta:', error);
    res.status(500).json({ error: 'Erro ao salvar respostas.' });
  }
};