import { db } from "../config/firebaseConfig.js";
import { collection, query, where, getDocs, orderBy, limit, addDoc, Timestamp } from "firebase/firestore";
import { extractTextFromPDF } from "../services/pdfService.js";
import { generateQuestionsWithAI } from "../services/openAIService.js";
import { getLoggedInUser } from "../services/authService.js";

/**
 * Busca os simulados do usuário, ordenados por data (do mais recente para o mais antigo) e limitados a 10 resultados.
 */

export const getSimulados = async (req, res) => {
  try {
    const { id, userId } = req.query;

    if (id) {
      // Busca um simulado específico por ID
      const simuladoRef = doc(db, 'simulados', id);
      const simuladoDoc = await getDoc(simuladoRef);

      if (!simuladoDoc.exists()) {
        return res.status(404).json({ error: 'Simulado não encontrado.' });
      }

      const simulado = { id: simuladoDoc.id, ...simuladoDoc.data() };
      return res.json(simulado);
    }

    if (userId) {
      // Busca o histórico de simulados do usuário
      const simuladosRef = collection(db, 'simulados');
      const q = query(simuladosRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);

      const history = [];
      querySnapshot.forEach((doc) => {
        history.push({ id: doc.id, ...doc.data() });
      });

      return res.json({ simulados: history });
    }

    // Busca todos os simulados
    const simuladosRef = collection(db, 'simulados');
    const querySnapshot = await getDocs(simuladosRef);

    const simulados = [];
    querySnapshot.forEach((doc) => {
      simulados.push({ id: doc.id, ...doc.data() });
    });

    res.json(simulados);
  } catch (error) {
    console.error('Erro ao buscar simulados:', error);
    res.status(500).json({ error: 'Erro ao buscar simulados.' });
  }
};

/**
 * Cria um novo simulado com base em um arquivo PDF enviado pelo usuário.
 */
export const createSimulado = async (req, res) => {
  try {
    const { userId, title } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    // Extrai o texto do PDF (você já tem essa lógica)
    const text = await extractTextFromPDF(file);

    // Gera as questões com a OpenAI (você já tem essa lógica)
    const questions = await generateQuestionsWithAI(text);

    // Salva o simulado no Firestore
    const simuladoRef = await addDoc(collection(db, 'simulados'), {
      userId,
      title,
      questions,
      createdAt: serverTimestamp(),
    });

    res.json({ simuladoId: simuladoRef.id, questions });
  } catch (error) {
    console.error('Erro ao criar simulado:', error);
    res.status(500).json({ error: 'Erro ao criar simulado.' });
  }
};