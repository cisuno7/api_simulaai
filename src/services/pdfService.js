import pkg from 'pdfjs-dist/legacy/build/pdf.js';
const { getDocument, GlobalWorkerOptions } = pkg;

// Desabilita o worker para evitar o erro
GlobalWorkerOptions.workerSrc = '';

// Função para limpar caracteres inválidos
const cleanText = (text) => {
  return text
    .replace(/[^\x00-\x7F]/g, '') // Remove caracteres não-ASCII
    .replace(/\uFFFD/g, '')       // Remove símbolos de substituição inválidos
    .replace(/\s{2,}/g, ' ');     // Remove espaços em excesso
};

export const extractTextFromPDF = async (buffer) => {
  try {
    if (!buffer || buffer.length === 0) {
      throw new Error("PDF inválido ou vazio.");
    }

    const MAX_PAGES = 10; // Limite de páginas
    // Desabilita o worker para evitar o erro
    const pdf = await getDocument({
      data: new Uint8Array(buffer),
      disableWorker: true
    }).promise;
    const numPages = Math.min(pdf.numPages, MAX_PAGES);
    const extractedText = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      extractedText.push(pageText);
      await page.cleanup(); // Libera memória imediatamente
    }

    await pdf.destroy(); // Destrói o documento completamente
    return cleanText(extractedText.join('\n')).trim();

  } catch (error) {
    throw new Error(`Erro ao extrair texto: ${error.message}`);
  }
};