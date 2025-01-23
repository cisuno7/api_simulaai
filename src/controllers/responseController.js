
import { collection, addDoc } from "firebase/firestore";
import { getLoggedInUser } from "../services/authService.js";
import  {db}  from "../config/firebaseConfig.js"
/**
 * Salva as respostas de um simulado no Firestore.
 */
export const saveResponse = async (req, res, next) => {
  const { responses, timeSpent, simuladoId } = req.body;

  try {
    // Recupera o usuário logado
    const user = await getLoggedInUser();
    if (!user) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    // Salva as respostas no Firestore
    const responseRef = await addDoc(collection(db, "responses"), {
      simuladoId,
      userId: user.uid, // Associa as respostas ao usuário logado
      responses,
      timeSpent,
      createdAt: new Date(),
    });

    res.json({ responseId: responseRef.id });
  } catch (error) {
    next(error);
  }
};