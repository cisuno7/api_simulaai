import express from 'express';
import { saveResponse } from "../controllers/responseController.js";

const router = express.Router();

router.post('/', saveResponse);

export default router;