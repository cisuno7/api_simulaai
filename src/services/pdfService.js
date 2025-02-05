import pkg from 'pdfjs-dist/legacy/build/pdf.js';
const { getDocument } = pkg;

// Função para limpar caracteres inválidos
const cleanText = (text) => {
  return text
    .replace(/[^\x00-\x7F]/g, '') // Remove caracteres não-ASCII
    .replace(/\uFFFD/g, '')       // Remove símbolos de substituição inválidos
    .replace(/\s{2,}/g, ' ');     // Remove espaços em excesso
};

export const extractTextFromPDF = async (buffer) => {
  try {
    const loadingTask = getDocument({
      data: buffer,
      standardFontDataUrl: 'path/to/standard/font/data' // Adiciona o parâmetro necessário
    });
    const pdfDocument = await loadingTask.promise;

    if (!pdfDocument) {
      throw new Error('Não foi possível carregar o documento PDF.');
    }

    const numPages = pdfDocument.numPages;
    let extractedText = '';

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      let page;
      try {
        page = await pdfDocument.getPage(pageNum);
      } catch (error) {
        throw new Error(`Erro ao obter a página ${pageNum}: ${error.message}`);
      }

      let textContent;
      try {
        textContent = await page.getTextContent();
      } catch (error) {
        throw new Error(`Erro ao obter o conteúdo de texto da página ${pageNum}: ${error.message}`);
      }

      const pageText = textContent.items.map((item) => item.str).join(' ');
      extractedText += pageText + '\n';
    }

    pdfDocument.cleanup();

    const cleanedText = cleanText(extractedText); // Limpeza do texto extraído

    return cleanedText.trim();
  } catch (error) {
    throw new Error('Erro ao extrair texto do PDF: ' + error.message);
  }
};
