import express from 'express';
import { 
  createPost, 
  getAllPosts, 
  getUserPosts, 
  getPost, 
  updatePost, 
  deletePost, 
  downloadFile 
} from '../controllers/postController.js';
import { authMiddleware } from '../middleware/auth.js';
import { upload } from '../utils/multer.js';

const router = express.Router();

router.get('/', getAllPosts);
router.get('/user', authMiddleware, getUserPosts);
router.get('/:id', getPost);
router.post('/', authMiddleware, upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'documents', maxCount: 5 }
]), createPost);
router.put('/:id', authMiddleware, updatePost);
router.delete('/:id', authMiddleware, deletePost);
router.get('/:postId/download/:fileId', downloadFile);

export default router;