import express from 'express';
import { requireRole } from '../middleware/roleMiddleware';
import {
  deleteUserByID,
  demoteUser,
  getAllUsers,
  promoteUser,
} from '../controllers/adminController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole('ADMIN'));

router.get('/users', getAllUsers);
router.delete('/users/:id', deleteUserByID);
router.put('/users/:id', promoteUser);
router.put('/users/:id', demoteUser);

export default router;
