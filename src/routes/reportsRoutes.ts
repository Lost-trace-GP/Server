import { Router } from 'express';
import {
  createReport,
  getAllReports,
  getReportById,
  getUserReports,
  deleteReport,
} from '../controllers/reportController';
import upload from '../config/multer';
import { authenticateToken } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';

const router = Router();

router.use(authenticateToken);
//TODO: update report endpoint

router.post('/', requireRole('USER'), upload.single('image'), createReport);
router.get('/', getAllReports); // Admin/Police view
router.get('/user', getUserReports); // Logged-in user's reports
router.get('/:id', getReportById);
router.delete('/:id', deleteReport); // Only owner can delete

export default router;
