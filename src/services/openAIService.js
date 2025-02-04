import dotenv from 'dotenv';
import { extractTextFromPDF } from './pdfService.js';

dotenv.config();
console.log("Environment variables loaded:", process.env);

export const generateQuestionsWithAI = async (pdfBuffer, questionCount, difficulty) => {
  try {
    const text = await extractTextFromPDF(pdfBuffer);
    const numQuestions = parseInt(questionCount, 10);

    const prompt = `Gere EXATAMENTE ${numQuestions} questões de múltipla escolha com dificuldade ${difficulty}.
Formato obrigatório para cada questão:
1. Enunciado claro.
2. Exatamente 4 alternativas (A) a (D), no formato: A) Texto da alternativa
3. A resposta correta DEVE estar na mesma linha da alternativa correta, com "(CORRETA)" ao lado da resposta certa. NÃO escreva "CORRETA" em uma nova linha.

Exemplo:
Qual é a capital da França?
A) Berlim
B) Madrid
C) Paris (CORRETA)
D) Roma

Texto de referência: ${text}`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "openai/gpt-3.5-turbo",
        "messages": [
          {
            "role": "user",
            "content": prompt
          }
        ]
      })
    });

    const data = await response.json();
    console.log("API Response:", data);

    const generatedText = data.choices[0].message.content.trim();
    const questionsArray = generatedText.split(/\d+\.\s+/).filter(q => q.trim() !== '');

    if (questionsArray.length !== numQuestions) {
      throw new Error(`A IA gerou ${questionsArray.length} questões em vez de ${numQuestions}`);
    }

    const formattedQuestions = questionsArray.map((q) => {
      const lines = q.split('\n').map(line => line.trim()).filter(line => line !== '');
      console.log('Processando questão:', lines);

      const question = lines[0];
      const options = [];
      let correctAnswerIndex = null;

      lines.forEach((line) => {
        const optionMatch = line.match(/^([A-D])\)\s*(.*?)(\s*\(CORRETA\))?\s*$/i);

        if (optionMatch) {
          const optionText = optionMatch[2].trim();
          options.push(optionText);

          if (optionMatch[3]) {
            correctAnswerIndex = options.length - 1; // Índice correto da resposta
          }
        } else if (/^\s*CORRETA\s*$/i.test(line)) {
          console.warn('Resposta "CORRETA" isolada detectada. Verifique o formato da questão:', lines);
        }
      });

      if (options.length !== 4) {
        console.error('Opções inválidas:', options);
        throw new Error(`Questão com número incorreto de opções: ${q.substring(0, 50)}...`);
      }

      // Correção automática para casos com "CORRETA" isolado
      if (correctAnswerIndex === null) {
        const isolatedCorrect = lines.findIndex(line => /^\s*CORRETA\s*$/i.test(line));
        if (isolatedCorrect !== -1 && isolatedCorrect > 0) {
          correctAnswerIndex = isolatedCorrect - 1; // Assume que a resposta correta está acima
          console.warn('Correção automática aplicada na questão:', question);
        }
      }

      if (correctAnswerIndex === null) {
        console.error('Nenhuma resposta correta encontrada:', lines);
        throw new Error(`Formato de resposta inválido na questão: "${question}"`);
      }

      return {
        question,
        options,
        answer: correctAnswerIndex // Índice da resposta correta (0-3)
      };
    });

    return formattedQuestions;

  } catch (error) {
    console.error(`Erro: ${error.message}`);
    throw new Error('Não foi possível gerar questões.');
  }
};
