import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getLoggedInUser } from "../services/authService.js";
import { db } from "../config/firebaseConfig.js";

/**
 * Salva as respostas de um simulado no Firestore
 * Estrutura esperada no body:
 * {
 *   simuladoId: string,
 *   respostas: {
 *     [key: string]: {
 *       alternativas: string,
 *       correctAnswer: string,
 *       pergunta: string,
 *       userAnswer: string
 *     }
 *   }
 * }
 */
export const saveResponse = async (req, res) => {
  try {
    // 1. Verificar autenticação
    const user = await getLoggedInUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // 2. Validar dados da requisição
    const { simuladoId, respostas } = req.body;

    if (!simuladoId || !respostas) {
      return res.status(400).json({
        error: 'Dados incompletos. São necessários simuladoId e respostas'
      });
    }

    // 3. Criar estrutura de dados completa
    const responseData = {
      simuladoId,
      userId: user.uid, // Usar ID do usuário autenticado
      pontuacao: "",    // Calculado posteriormente
      respostas,
      createdAt: serverTimestamp()
    };

    // 4. Salvar no Firestore
    const responseRef = await addDoc(collection(db, 'responses'), responseData);

    // 5. Retornar resposta formatada
    res.json({
      success: true,
      responseId: responseRef.id,
      data: {
        ...responseData,
        createdAt: new Date().toISOString() // Timestamp aproximado
      }
    });

  } catch (error) {
    console.error('Erro ao salvar respostas:', error);
    res.status(500).json({
      error: 'Erro interno ao salvar respostas',
      details: error.message
    });
  }
}; 