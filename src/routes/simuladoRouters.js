import express from 'express';
import { getSimuladoById, createSimulado } from '../controllers/simuladoController.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

router.get('/:id', getSimuladoById);
router.post('/', upload.single('file'), createSimulado);

export default router;