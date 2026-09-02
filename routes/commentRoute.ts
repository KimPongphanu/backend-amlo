import { Router } from 'express'
import {
  createComment,
  getAllComments,
  getComments,
  updateComment,
} from '../controllers/commentController'
import auth, { requireAdmin } from '../middlewares/auth'
import { commentRateLimiter } from '../middlewares/rateLimiter'

const router = Router()

/**
 * @ROUTE   POST /api/comments
 * @DESC    บันทึกความคิดเห็นจากประชาชนหน้าเว็บไซต์ (Public)
 */
router.post('/', commentRateLimiter, createComment)

/**
 * @ROUTE   GET /api/comments/all
 * @DESC    ดึงคอมเมนต์ทั้งหมด รวมที่ถูกซ่อน (Admin/Supervisor only)
 */
router.get('/all', auth, requireAdmin, getAllComments)

/**
 * @ROUTE   GET /api/comments
 * @DESC    ดึงรายการความคิดเห็นที่อนุมัติแล้วเท่านั้น (Public)
 */
router.get('/', getComments)

/**
 * @ROUTE   PUT /api/comments/update
 * @DESC    อัปเดตสถานะการแสดงผล (isShow) ของความคิดเห็น (สิทธิ์ Admin ในแดชบอร์ด)
 */
router.put('/update', auth, updateComment)

export default router
