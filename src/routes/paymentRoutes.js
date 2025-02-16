import express from "express";
import { MercadoPagoConfig, Preference } from "mercadopago";

const router = express.Router();

const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
    options: { timeout: 5000 }
});


router.post("/create-payment", async (req, res) => {
    try {
        const { email } = req.body;

        const preference = new Preference(client);

        const body = {
            items: [
                {
                    title: "Pagamento SimulaAi",
                    quantity: 1,
                    currency_id: "BRL",
                    unit_price: 0.50
                }
            ],
            payer: {
                email: email
            },
            payment_methods: {
                excluded_payment_types: [{ id: "ticket" }],
                installments: 1
            },
            back_urls: {
                success: "http://localhost:3000/sign-in",
                failure: "http://localhost:3000/sign-up",
                pending: "http://localhost:3000/sign-in"
            },
            auto_return: "approved"
        };

        const response = await preference.create({ body });

        res.json({ url: response.init_point });
    } catch (error) {
        console.error("Erro ao criar pagamento:", error);
        res.status(500).json({ error: "Erro ao criar pagamento" });
    }
});

export default router;
