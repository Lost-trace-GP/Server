import express from 'express';
import { deleteAccount, logout, updateProfile } from '../controllers/userController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();
router.post('/logout', authenticateToken, logout);
router.put('/update', authenticateToken, updateProfile);
router.delete('/delete-account', authenticateToken, deleteAccount);

export default router;
