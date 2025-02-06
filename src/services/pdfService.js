import PDFParser from "pdf2json";

// Função melhorada para limpar o texto extraído
const cleanExtractedText = (text) => {
  return text
    // Normalização de caracteres especiais
    .replace(/�/g, '') // Remove caracteres desconhecidos
    .replace(/[“”]/g, '"') // Normaliza aspas
    .replace(/[‘’]/g, "'") // Normaliza apóstrofos

    // Correção de espaçamento entre palavras
    .replace(/([a-z])([A-ZÀ-Ú])/g, '$1 $2') // Separa palavras juntas com case mixing
    .replace(/([.,!?;:])([A-Za-zÀ-ú])/g, '$1 $2') // Espaço após pontuação
    .replace(/(\w)([A-ZÀ-Ú])/g, '$1 $2') // Separa palavras coladas com mudança de case

    // Correção específica para termos comuns
    .replace(/PDFs/g, 'PDFs ') // Espaço após PDFs
    .replace(/Appde/g, 'App de ') // Corrige caso específico do exemplo
    .replace(/AI Aa/g, 'AI a ') // Corrige formatação de parágrafos

    // Normalização de espaços e quebras de linha
    .replace(/\s+/g, ' ') // Múltiplos espaços para um único
    .replace(/(\r\n|\n|\r)/gm, ' ') // Remove quebras de linha
    .replace(/(•|●)/g, '\n● ') // Formata marcadores corretamente

    // Estruturação de títulos e seções
    .replace(/([A-ZÀ-Ú ]+):/g, '\n$1:') // Quebra linha antes de títulos
    .replace(/(\w)([A-ZÀ-Ú]{2,})/g, '$1\n$2') // Separa palavras em caixa alta

    // Finalização
    .trim()
    .replace(/(\S)\n(\S)/g, '$1\n\n$2') // Duas quebras para parágrafos
    .split('\n')
    .map(line => line.trim())
    .join('\n');
};

// Função principal com tratamento melhorado
export const extractTextFromPDF = (buffer) => {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", (error) => {
      pdfParser.destroy();
      reject(new Error(`Erro na análise do PDF: ${error.message}`));
    });

    pdfParser.on("pdfParser_dataReady", (data) => {
      try {
        const rawText = data.Pages
          .flatMap(page =>
            page.Texts.map(textItem =>
              decodeURIComponent(textItem.R[0].T)
                .replace(/\s+/g, ' ')
                .replace(/([a-z])([A-Z])/g, '$1 $2')
            )
          )
          .join(' ')
          .replace(/(\w)- (\w)/g, '$1$2') // Junta palavras separadas por hífen

        const cleanedText = cleanExtractedText(rawText)
          .replace(/(\w) (\W)/g, '$1$2') // Remove espaço antes de pontuação
          .replace(/(\W) (\w)/g, '$1$2'); // Remove espaço após pontuação

        pdfParser.destroy();
        resolve(cleanedText);
      } catch (error) {
        reject(new Error(`Erro no processamento: ${error.message}`));
      }
    });

    // Tratamento para PDFs protegidos
    try {
      pdfParser.parseBuffer(buffer);
    } catch (error) {
      reject(new Error(`PDF possivelmente criptografado: ${error.message}`));
    }
  });
};