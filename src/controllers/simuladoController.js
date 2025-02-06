import { db } from "../config/firebaseConfig.js";
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { extractTextFromPDF } from "../services/pdfService.js";
import { generateQuestionsWithAI } from "../services/openAIService.js";
import { getLoggedInUser } from "../services/authService.js";

/**
 * Busca os simulados do usuário, ordenados por data (do mais recente para o mais antigo) e limitados a 10 resultados.
 */
export const getSimuladoById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('ID recebido:', req.params.id);
    const simuladoDoc = doc(db, 'simulados', id);
    const simuladoSnapshot = await getDoc(simuladoDoc);

    if (!simuladoSnapshot.exists()) {
      return res.status(404).json({ error: 'Simulado não encontrado.' });
    }

    res.json({ id: simuladoSnapshot.id, ...simuladoSnapshot.data() });
  } catch (error) {
    console.error('Erro ao buscar simulado:', error);
    res.status(500).json({ error: 'Erro ao buscar simulado.' });
  }
};

/**
 * Cria um novo simulado com base em um arquivo PDF enviado pelo usuário.
 */

export const createSimulado = async (req, res) => {
  try {
    console.log('Dados recebidos:', req.body);
    const loggedInUser = await getLoggedInUser();

    // Verifica se o usuário está logado
    if (!loggedInUser) {
      return res.status(401).json({ error: 'Usuário não autenticado.' });
    }
    // Remove a declaração duplicada
    const bodyFields = Object.keys(req.body).reduce((acc, key) => {
      acc[key.trim()] = req.body[key];
      return acc;
    }, {});

    // Declaração única das variáveis
    const { userId, title, questionCount: qCount, difficulty: diff } = bodyFields;
    const file = req.file;

    // Validações iniciais
    if (!qCount) {
      return res.status(400).json({ error: 'Número de questões não fornecido.' });
    }
    if (!file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }
    if (!diff) {
      return res.status(400).json({
        error: 'Dificuldade não informada',
        details: 'O campo difficulty é obrigatório'
      });
    }

    // Converta para número
    const numQuestions = parseInt(qCount, 10);
    if (isNaN(numQuestions) || numQuestions < 1 || numQuestions > 20) {
      return res.status(400).json({
        error: 'Número de questões inválido',
        details: `Valor recebido: ${qCount} (Tipo: ${typeof qCount})`
      });
    }

    // Processamento da dificuldade
    const cleanDifficulty = diff
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[éê]/g, 'e')
      .toLowerCase();

    const difficultyMap = {
      facil: 'Fácil',
      medio: 'Médio',
      dificil: 'Difícil'
    };

    const normalizedDifficulty = difficultyMap[cleanDifficulty] || diff;

    const validDifficulties = ['Fácil', 'Médio', 'Difícil'];
    if (!validDifficulties.includes(normalizedDifficulty)) {
      return res.status(400).json({
        error: 'Dificuldade inválida',
        received: diff,
        validOptions: validDifficulties
      });
    }

    // Validação do PDF
    if (file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'O arquivo enviado não é um PDF válido.' });
    }

    // Geração das questões
    const questions = await generateQuestionsWithAI(
      file.buffer,
      numQuestions,
      normalizedDifficulty
    );

    // Salvamento no Firestore
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