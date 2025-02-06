import PDFParser from "pdf2json";

// Função para limpar o texto extraído
const cleanExtractedText = (text) => {
  return text
    .replace(/\s+/g, ' ')       // Remove espaços múltiplos
    .replace(/(\w)\s(\w)/g, '$1$2') // Remove espaços entre letras
    .trim();                    // Remove espaços no início e no fim
};

// Função principal para extrair texto de um PDF
export const extractTextFromPDF = (buffer) => {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    // Trata erros durante a análise do PDF
    pdfParser.on("pdfParser_dataError", (error) => {
      pdfParser.destroy(); // Limpa recursos
      reject(new Error(`Erro ao analisar PDF: ${error.message}`));
    });

    // Processa os dados quando estiverem prontos
    pdfParser.on("pdfParser_dataReady", (data) => {
      try {
        // Extrai o texto de todas as páginas
        const text = data.Pages
          .map((page) =>
            page.Texts
              .map((textItem) => decodeURIComponent(textItem.R[0].T)) // Decodifica texto
              .join(" ") // Junta palavras da mesma linha
          )
          .join("\n") // Separa páginas por quebra de linha
          .trim();

        // Limpa o texto extraído
        const cleanedText = cleanExtractedText(text);

        pdfParser.destroy(); // Libera memória
        resolve(cleanedText); // Retorna o texto limpo
      } catch (error) {
        reject(new Error(`Erro ao processar texto: ${error.message}`));
      }
    });

    // Inicia a análise do buffer do PDF
    pdfParser.parseBuffer(buffer);
  });
};