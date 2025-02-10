import dotenv from 'dotenv';
import axios from 'axios';
import { extractTextFromPDF } from './pdfService.js';

dotenv.config();
console.log('OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const cleanExtractedText = (text) => {
  return text
    .replace(/\s+/g, ' ')
    .replace(/(\w)\s(\w)/g, '$1$2')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([.,!?])(\w)/g, '$1 $2')
    .replace(/(\w)\n(\w)/g, '$1 $2')
    .trim();
};

const fixJSON = (str) => {
  try {
    str = str.replace(/\{\s+/g, '{').replace(/\[\s+/g, '[');
    str = str.replace(/\s+\}/g, '}').replace(/\s+\]/g, ']');
    str = str.replace(/,\s*([}\]])/g, '$1');
    const parsed = JSON.parse(str);
    return JSON.stringify(parsed, null, 2);
  } catch (error) {
    console.error('Erro ao corrigir JSON:', error.message);
    throw new Error(`JSON inválido após correção: ${str}`);
  }
};

const validateJSONSchema = (data) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Resposta da IA não é um objeto válido.');
  }

  if (!Array.isArray(data.questions)) {
    throw new Error('Campo "questions" deve ser um array.');
  }

  for (const question of data.questions) {
    if (typeof question.question !== 'string') {
      throw new Error('Campo "question" deve ser uma string.');
    }

    if (!Array.isArray(question.options) || question.options.length !== 4) {
      throw new Error('Campo "options" deve ser uma lista com exatamente 4 opções.');
    }

    if (!Number.isInteger(question.correctAnswer) || question.correctAnswer < 0 || question.correctAnswer > 3) {
      throw new Error('Campo "correctAnswer" deve ser um número entre 0 e 3.');
    }

    if (!Number.isInteger(question.userAnswer) || question.userAnswer !== -1) {
      throw new Error('Campo "userAnswer" deve ser inicializado como -1.');
    }
  }
};

export const generateQuestionsWithAI = async (pdfBuffer, questionCount, simuladoId) => {
  try {
    const text = await extractTextFromPDF(pdfBuffer);
    const numQuestions = parseInt(questionCount, 10);
    const shortenedText = cleanExtractedText(text.substring(0, 2000));
    console.log('Texto extraído:', shortenedText);
    console.log('Número de perguntas:', numQuestions);
    const prompt = `
Gere ${numQuestions} questões de múltipla escolha de nível avançado com base no seguinte trecho extraído de um documento:
"${shortenedText}"

⚠️ As questões devem:
- Ser inspiradas em questões de concursos públicos e vestibulares renomados;
- Exigir um alto nível de interpretação e análise crítica;
- Conter pegadinhas e enunciados enganosos para levar o candidato ao erro caso ele não compreenda bem o contexto;
- Apresentar alternativas que sejam muito semelhantes entre si, mas apenas uma está correta;
- Criar armadilhas lógicas, utilizando palavras que induzam ao erro caso o candidato não tenha atenção total;
- Evitar perguntas diretas e fáceis de responder apenas com memorização.

⚠️ Formato das questões:
- O enunciado deve ser desafiador e conter nuances que possam ser interpretadas de formas diferentes;
- As alternativas devem apresentar termos técnicos e diferenças sutis para dificultar a escolha correta;
- A pergunta deve forçar o candidato a refletir sobre o tema antes de marcar a alternativa.

📌 A resposta correta deve ser representada pelo número do índice (0, 1, 2 ou 3) e o campo "userAnswer" deve ser inicializado com -1.

⚠️ Responda ESTRITAMENTE no seguinte formato JSON, sem incluir explicações ou comentários:
{
  "simuladoId": "${simuladoId}",
  "questions": [
    {
      "question": "Texto da pergunta",
      "options": ["Opção 1", "Opção 2", "Opção 3", "Opção 4"],
      "correctAnswer": 1,
      "userAnswer": -1
    }
  ]
}
`;


    let response;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        response = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1024,
            temperature: 0.7
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000
          }
        );
        break;
      } catch (error) {
        if (error.response && error.response.status === 503) {
          const estimatedTime = error.response.data.estimated_time || 10;
          console.log(`API indisponível, tentando novamente em ${estimatedTime} segundos...`);
          await delay(estimatedTime * 1000);
          attempts++;
        } else {
          throw error;
        }
      }
    }

    if (!response) {
      throw new Error('Não foi possível gerar questões após várias tentativas.');
    }

    const responseData = response.data.choices[0].message.content;
    console.log('Resposta bruta da API:', responseData);

    const fixedResponseData = fixJSON(responseData);
    console.log('JSON corrigido:', fixedResponseData);

    try {
      validateJSONSchema(JSON.parse(fixedResponseData));
    } catch (validationError) {
      console.error('Erro de validação do JSON:', validationError.message);
      throw new Error(`Erro de validação: ${validationError.message}`);
    }

    let formattedQuestions;
    try {
      formattedQuestions = JSON.parse(fixedResponseData);
    } catch (jsonError) {
      console.error('JSON problemático:', fixedResponseData.slice(jsonError.position - 50, jsonError.position + 50));
      throw new Error(`Erro de parse: ${jsonError.message}. Trecho: ${fixedResponseData.slice(jsonError.position - 50, jsonError.position + 50)}`);
    }

    console.log('JSON retornado:', JSON.stringify(formattedQuestions, null, 2));
    return formattedQuestions;
  } catch (error) {
    if (error.response) {
      const errorMessage = typeof error.response.data === 'object' ? JSON.stringify(error.response.data) : error.response.data;
      throw new Error(`Erro ao gerar questões: ${error.response.status} - ${errorMessage}`);
    } else if (error.request) {
      throw new Error('Erro ao gerar questões: Nenhuma resposta recebida do servidor.');
    } else {
      throw new Error(`Erro inesperado: ${error.message}`);
    }
  }
};
