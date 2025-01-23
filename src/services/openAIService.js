import { Configuration, OpenAIApi } from 'openai';


const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY, 
});

const openai = new OpenAIApi(configuration);

export const generateQuestionsWithAI = async (text) => {
  try {
    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente que gera questões de simulado com base no texto fornecido.',
        },
        {
          role: 'user',
          content: `Gere 5 questões com base no seguinte texto:\n\n${text}`,
        },
      ],
    });

    return response.data.choices[0].message.content;
  } catch (error) {
    throw new Error('Erro ao gerar questões com a OpenAI: ' + error.message);
  }
};