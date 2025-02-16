import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import simuladoRoutes from "./src/routes/simuladoRouters.js";
import responseRoutes from "./src/routes/responseRouters.js";
import paymentRoutes from "./src/routes/paymentRoutes.js";
// import webhook from "./src/routes/webhook.js";



import { errorHandler } from "./src/utils/errorHandler.js";

import 'dotenv/config'
import { MercadoPagoConfig, Payment } from 'mercadopago';

const app = express()
  



app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/api/simulados", simuladoRoutes);
app.use("/api/responses", responseRoutes);

app.use("/api/payment", paymentRoutes);
// app.use("/api/webhook", webhook);




const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
    options: {
        timeout: 5000
    }
});

const payment = new Payment(client);

const body = {
	transaction_amount: 0.50,
	description: 'Pagamento SimulaAi',
	payment_method_id: 'pix',
	payer: {
		email: 'fabiobrasileiromidia@gmail.com'
	},
};

payment.create({ body }).then(console.log).catch(console.log);


app.use(errorHandler);

export default app;





