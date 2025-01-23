import { getDocument } from 'pdfjs-dist';

export const extractTextFromPDF = async (buffer) => {
  try {
    const loadingTask = getDocument({ data: buffer });
    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;
    let extractedText = '';

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(' ');
      extractedText += pageText + '\n';
    }

    return extractedText.trim(); // Remove espaços em branco no final
  } catch (error) {
    throw new Error('Erro ao extrair texto do PDF: ' + error.message);
  }
};