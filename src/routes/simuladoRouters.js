import express from 'express';
import { getSimulados, createSimulado } from '../controllers/simuladoController.js';
import multer from 'multer';

const upload = multer();
const router = express.Router();

router.get('/', getSimulados);
router.post('/', upload.single('file'), createSimulado);

export default router;