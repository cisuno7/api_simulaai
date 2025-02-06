import dotenv from 'dotenv';
import axios from 'axios';
import { extractTextFromPDF } from './pdfService.js';

// Carrega as variáveis de ambiente
dotenv.config();
console.log('OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY);

// Função para adicionar um delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Função para limpar o texto extraído do PDF
const cleanExtractedText = (text) => {
  return text
    .replace(/\s+/g, ' ') // Remove espaços múltiplos
    .replace(/(\w)\s(\w)/g, '$1$2') // Remove espaços entre letras
    .replace(/([a-z])([A-Z])/g, '$1 $2') // Adiciona espaço entre letras minúsculas e maiúsculas
    .replace(/([.,!?])(\w)/g, '$1 $2') // Adiciona espaço após pontuação
    .replace(/(\w)\n(\w)/g, '$1 $2') // Substitui quebras de linha por espaços
    .trim(); // Remove espaços no início e no fim
};

// Função para corrigir JSON malformado
const fixJSON = (str) => {
  try {
    // Remove espaços desnecessários entre chaves e colchetes
    str = str.replace(/\{\s+/g, '{').replace(/\[\s+/g, '[');
    str = str.replace(/\s+\}/g, '}').replace(/\s+\]/g, ']');

    // Remove barras invertidas duplicadas
    str = str.replace(/\\+/g, '\\');

    // Substitui aspas escapadas corretamente
    str = str.replace(/\\"/g, '"');

    // Converte o JSON para objeto e depois de volta para string para normalizar
    const parsed = JSON.parse(str);
    return JSON.stringify(parsed, null, 2);
  } catch (error) {
    console.error('Erro ao corrigir JSON:', error.message);
    throw new Error(`JSON inválido após correção: ${str}`);
  }
};

// Função principal para gerar perguntas com IA
export const generateQuestionsWithAI = async (pdfBuffer, questionCount, simuladoId) => {
  try {
    // Extrai e limpa o texto do PDF
    const text = await extractTextFromPDF(pdfBuffer);
    const numQuestions = parseInt(questionCount, 10);
    const shortenedText = cleanExtractedText(text.substring(0, 2000)); // Limite de 2000 caracteres
    console.log('Texto extraído:', shortenedText);
    console.log('Número de perguntas:', numQuestions);

    // Cria o prompt para a IA
    const prompt = `
Gere ${numQuestions} questões de múltipla escolha em português do Brasil sobre o seguinte texto:
"${shortenedText}"

Cada questão deve ter:
- Uma única resposta correta;
- Quatro opções identificadas pelas letras "A", "B", "C" e "D";
- A resposta correta deve ser representada por um objeto contendo a letra e o texto da opção correta.

Formato da resposta em STRICT JSON SEM comentários ou texto extra. Use aspas duplas (\") para todos os campos e valores. Escape todas as aspas internas com \\". Exemplo válido:
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

    // Variáveis para controle de retentativas
    let response;
    let attempts = 0;
    const maxAttempts = 3;

    // Realiza a chamada à API com retentativas automáticas
    while (attempts < maxAttempts) {
      try {
        response = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: 'gpt-3.5-turbo', // Modelo escolhido
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1024,
            temperature: 0.7
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000 // Timeout de 30 segundos
          }
        );
        break; // Sai do loop se a chamada for bem-sucedida
      } catch (error) {
        if (error.response && error.response.status === 503) {
          const estimatedTime = error.response.data.estimated_time || 10;
          console.log(`API indisponível, tentando novamente em ${estimatedTime} segundos...`);
          await delay(estimatedTime * 1000);
          attempts++;
        } else {
          throw error; // Lança o erro se não for um problema temporário
        }
      }
    }

    // Verifica se a resposta foi recebida após as retentativas
    if (!response) {
      throw new Error('Não foi possível gerar questões após várias tentativas.');
    }

    // Processa a resposta da API
    const responseData = response.data.choices[0].message.content;
    console.log('Resposta bruta da API:', responseData);

    // Corrige JSON malformado
    const fixedResponseData = fixJSON(responseData);
    console.log('JSON corrigido:', fixedResponseData);

    // Valida o JSON
    const isValidJSON = (str) => {
      try {
        JSON.parse(str);
        return true;
      } catch {
        return false;
      }
    };

    if (!isValidJSON(fixedResponseData)) {
      console.error('JSON inválido após correção:', fixedResponseData);
      throw new Error('Resposta da IA em formato incorreto após tentativa de correção.');
    }

    // Converte o JSON corrigido para um objeto JavaScript
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
    // Trata erros de forma robusta
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