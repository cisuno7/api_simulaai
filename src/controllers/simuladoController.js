import { db } from "../config/firebaseConfig.js";
import { collection, query, where, getDocs, orderBy, limit, addDoc, Timestamp } from "firebase/firestore";
import { extractTextFromPDF } from "../services/pdfService.js";
import { generateQuestionsWithAI } from "../services/openAIService.js";
import { getLoggedInUser } from "../services/authService.js";

/**
 * Busca os simulados do usuário, ordenados por data (do mais recente para o mais antigo) e limitados a 10 resultados.
 */
export const getSimulados = async (req, res, next) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: "userId é obrigatório." });
  }

  try {
    const simuladosQuery = query(
      collection(db, "simulados"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(10)
    );

    const simuladosSnapshot = await getDocs(simuladosQuery);
    const simulados = simuladosSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    res.json({ simulados });
  } catch (error) {
    next(error);
  }
};

/**
 * Cria um novo simulado com base em um arquivo PDF enviado pelo usuário.
 */
export const createSimulado = async (req, res, next) => {
  const { file, title } = req;

  try {
    // Verifica se o arquivo foi recebido
    if (!file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado." });
    }

    // Recupera o usuário logado
    const user = await getLoggedInUser();
    if (!user) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    // Extrai o texto do PDF
    const text = await extractTextFromPDF(file);

    // Gera as questões com a OpenAI
    const questions = await generateQuestionsWithAI(text);

    // Salva o simulado no Firestore
    const simuladoRef = await addDoc(collection(db, "simulados"), {
      userId: user.uid,
      title,
      questions,
      createdAt: Timestamp.now(),
    });

    res.json({ simuladoId: simuladoRef.id, questions });
  } catch (error) {
    next(error);
  }
};