import app from "./app.js";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 3001;
console.log('OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY);
console.log('TEST_VARIABLE:', process.env.TEST_VARIABLE);

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
