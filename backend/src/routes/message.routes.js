import express from 'express';
import protect from '../middleware/auth.middleware.js';
import { getMessages } from '../controllers/message.controller.js';      

const router = express.Router();

router.get("/:receiverId", protect, getMessages);

export default router;