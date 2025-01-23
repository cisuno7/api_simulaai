/**
 * Middleware para tratamento de erros globais.
 * Captura erros lançados em rotas e middlewares, loga no console e envia uma resposta JSON ao cliente.
 */
export const errorHandler = (err, req, res, next) => {
  console.error("Erro:", err.message || err);

  // Define o status code padrão como 500 (Internal Server Error)
  const statusCode = err.statusCode || 500;

  // Define a mensagem de erro
  const message = err.message || "Ocorreu um erro interno no servidor.";

  // Envia a resposta JSON ao cliente
  res.status(statusCode).json({
    success: false,
    message: message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined, // Mostra o stack trace apenas em desenvolvimento
  });
};