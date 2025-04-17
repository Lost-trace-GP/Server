import express from 'express';
import { forgotPassword, login, register, resetPassword } from '../controllers/authController';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forget-password', forgotPassword);
router.post('/reset-password', resetPassword);
export default router;
