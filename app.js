import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import simuladoRoutes from "./src/routes/simuladoRouters.js";
import responseRoutes from "./src/routes/responseRouters.js";

import { errorHandler } from "./src/utils/errorHandler.js";

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/api/simulados", simuladoRoutes);
app.use("/api/responses", responseRoutes);


app.use(errorHandler);

export default app;