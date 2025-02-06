import dotenv from 'dotenv';
import axios from 'axios';
import { extractTextFromPDF } from './pdfService.js';

dotenv.config();

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const generateQuestionsWithAI = async (pdfBuffer, questionCount, simuladoId) => {
  try {
    const text = await extractTextFromPDF(pdfBuffer);
    const numQuestions = parseInt(questionCount, 10);
    const shortenedText = text.substring(0, 2000); // Aumentei o limite para 2000 caracteres
    const API_KEY = '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';
    console.log('Texto extraído:', shortenedText);
    console.log('Número de perguntas:', numQuestions);

    const prompt = `Gere ${numQuestions} questões de múltipla escolha em português do Brasil sobre o seguinte texto:
"${shortenedText}".
    
Cada questão deve ter:
- Uma única resposta correta;
- Quatro opções identificadas pelas letras "A", "B", "C" e "D";
- A resposta correta deve ser representada por um objeto contendo a letra e o texto da opção correta.

Formato da resposta em STRICT JSON SEM comentários ou texto extra. Escape todas as aspas internas com \\". Exemplo válido:
{
  "simuladoId": "${simuladoId}",
  "questions": [
    {
      "pergunta": "Texto da pergunta com \\"aspas\\" internas",
      "opcoes": {
        "A": "Opção A",
        "B": "Opção B",
        "C": "Opção C",
        "D": "Opção D"
      },
      "correctAnswer": {
        "letra": "A",
        "texto": "Opção A"
      }
    }
  ]
}`;

    let response;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        response = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: 'gpt-3.5-turbo', // Você pode ajustar o modelo conforme necessário
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1024,
            temperature: 0.7
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json'
            }
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

    // Tentar corrigir JSON malformado
    const fixedResponseData = responseData
      .replace(/\\/g, '\\\\') // Escapar barras invertidas primeiro
      .replace(/([^\\]|^)"([^"]*?[^\\]|)"/g, '$1"$2"') // Aspas internas
      .replace(/,\s*([}\]])/g, '$1') // Remover vírgulas finais
      .replace(/'/g, "\\'"); // Escapar aspas simples

    const isValidJSON = (str) => {
      try {
        JSON.parse(str);
        return true;
      } catch {
        return false;
      }
    };

    if (!isValidJSON(fixedResponseData)) {
      console.error('JSON inválido:', fixedResponseData);
      throw new Error('Resposta da IA em formato incorreto');
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
      throw new Error(`Erro ao gerar questões: ${error.message}`);
    }
  }
};
