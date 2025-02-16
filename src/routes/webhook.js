// router.post("/webhook", async (req, res) => {
//     console.log("[WEBHOOK] Evento recebido:", req.body);
  
//     // Verifica se o payload possui a propriedade "data" com os detalhes do pagamento.
//     if (!req.body.data) {
//       console.log("[WEBHOOK] Dados do evento ausentes.");
//       return res.status(400).send("Bad Request");
//     }
  
//     // Extrai as informações importantes do evento.
//     const paymentData = req.body.data;
//     const paymentStatus = paymentData.status;
//     const externalReference = paymentData.external_reference; // Deve ter sido definido na criação da preferência
  
//     console.log(`[WEBHOOK] Status do pagamento: ${paymentStatus}`);
//     console.log(`[WEBHOOK] External Reference (usuário): ${externalReference}`);
  
//     // Se o pagamento foi aprovado, atualize o status do usuário no seu banco (ex: Firebase)
//     if (paymentStatus === "approved") {
//       console.log("[WEBHOOK] Pagamento aprovado. Atualizando status do usuário no banco de dados...");
  
//       try {
//         // Aqui você chama a função que atualiza o status de pagamento do usuário.
//         // Por exemplo:
//         // await updateUserPaymentStatus(externalReference, true);
//         console.log(`[WEBHOOK] Status de pagamento atualizado para o usuário ${externalReference}.`);
//       } catch (error) {
//         console.error("[WEBHOOK] Erro ao atualizar status de pagamento:", error);
//         return res.status(500).send("Internal Server Error");
//       }
//     } else {
//       console.log("[WEBHOOK] Evento não processado (status não aprovado ou outro tipo de evento).");
//     }
  
//     // Retorna 200 para informar ao Mercado Pago que o webhook foi processado com sucesso.
//     res.status(200).send("Webhook recebido");
//   });
  
//   export default router;