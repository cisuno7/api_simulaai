import pkg from 'pdfjs-dist/legacy/build/pdf.js';
const { getDocument } = pkg;

export const extractTextFromPDF = async (buffer) => {
  try {
    // Inicializa a tarefa de carregamento do documento PDF
    const loadingTask = getDocument({ data: buffer });
    const pdfDocument = await loadingTask.promise;

    // Verifica se o documento foi carregado com sucesso
    if (!pdfDocument) {
      throw new Error('Não foi possível carregar o documento PDF.');
    }

    const numPages = pdfDocument.numPages;
    let extractedText = '';

    // Itera sobre todas as páginas do PDF
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Extrai o texto da página e concatena com os resultados anteriores
      const pageText = textContent.items.map((item) => item.str).join(' ');
      extractedText += pageText + '\n';
    }

    // Libera recursos do documento PDF
    pdfDocument.cleanup();

    return extractedText.trim(); // Remove espaços em branco no final
  } catch (error) {
    // Lida com erros ao carregar ou processar o PDF
    throw new Error('Erro ao extrair texto do PDF: ' + error.message);
  }
};
