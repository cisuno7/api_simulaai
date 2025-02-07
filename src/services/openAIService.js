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
    // Remove vírgulas extras antes de fechar chaves ou colchetes
    str = str.replace(/,\s*([}\]])/g, '$1');
    // Converte o JSON para objeto e depois de volta para string para normalizar
    const parsed = JSON.parse(str);
    return JSON.stringify(parsed, null, 2);
  } catch (error) {
    console.error('Erro ao corrigir JSON:', error.message);
    throw new Error(`JSON inválido após correção: ${str}`);
  }
};

// Função para validar o esquema do JSON
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

    if (typeof question.options !== 'object' || Object.keys(question.options).length !== 4) {
      throw new Error('Campo "options" deve conter exatamente 4 opções numeradas de 0 a 3.');
    }

    const validIndexes = ['0', '1', '2', '3'];
    for (const index of validIndexes) {
      if (!question.options.hasOwnProperty(index)) {
        throw new Error(`Campo "options" está faltando a chave "${index}".`);
      }
      if (typeof question.options[index] !== 'string') {
        throw new Error(`Valor da opção "${index}" deve ser uma string.`);
      }
    }

    if (typeof question.correctAnswer.index !== 'string' || !validIndexes.includes(question.correctAnswer.index)) {
      throw new Error('Campo "correctAnswer.index" deve ser um índice válido entre 0 e 3.');
    }

    if (typeof question.correctAnswer.userAnswer !== 'string' || question.correctAnswer.userAnswer !== '-1') {
      throw new Error('Campo "correctAnswer.userAnswer" deve ser inicializado como "-1".');
    }
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
Você é um assistente especializado em gerar questões de múltipla escolha com base em um texto fornecido. Sua tarefa é criar ${numQuestions} perguntas com 4 alternativas (numeradas de 0 a 3) sobre o seguinte texto:

"${shortenedText}"

Regras para gerar as perguntas:
1. Cada pergunta deve ser clara e diretamente relacionada ao conteúdo do texto.
2. As 4 alternativas devem ser plausíveis e derivadas do texto fornecido.
3. Apenas uma alternativa deve ser correta.
4. Não inclua informações que não estejam explicitamente mencionadas no texto.
5. Formate a resposta como um JSON estrito, SEM comentários ou texto extra. Use aspas duplas (\") para todos os campos e valores. Escape todas as aspas internas com \\".

Formato da resposta esperada:
{
  "simuladoId": "${simuladoId}",
  "questions": [
    {
      "question": "Texto da pergunta com \\"aspas\\" internas",
      "options": {
        "0": "Opção 0 derivada do texto",
        "1": "Opção 1 derivada do texto",
        "2": "Opção 2 derivada do texto",
        "3": "Opção 3 derivada do texto"
      },
      "correctAnswer": {
        "index": "1",
        "userAnswer": "-1"
      }
    }
  ]
}

Exemplo de saída válida:
{
  "simuladoId": "123",
  "questions": [
    {
      "question": "Qual é o principal problema enfrentado pelo personagem no texto?",
      "options": {
        "0": "Falta de dinheiro",
        "1": "Solidão",
        "2": "Problemas de saúde",
        "3": "Falta de tempo"
      },
      "correctAnswer": {
        "index": "1",
        "userAnswer": "-1"
      }
    }
  ]
}
`;

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

    // Valida o JSON contra o esquema esperado
    try {
      validateJSONSchema(JSON.parse(fixedResponseData));
    } catch (validationError) {
      console.error('Erro de validação do JSON:', validationError.message);
      throw new Error(`Erro de validação: ${validationError.message}`);
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