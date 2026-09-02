// routes/twoFactorRoute.ts
import { Router } from 'express'
import {
  disable2FA,
  enable2FA,
  getRecoveryKeys,
  regenerateRecoveryKeys,
  requestEmailOTP,
  setup2FA,
  useRecoveryKey,
  verify2FALogin,
  verifyEmailOTPForLogin,
} from '../controllers/twoFactorController'
import authMiddleware from '../middlewares/auth'
import { otpLimiter, verifyLimiter } from '../middlewares/rateLimiter'

const router = Router()

router.post('/setup', authMiddleware, setup2FA)
router.post('/enable', authMiddleware, enable2FA)
router.post('/disable', authMiddleware, disable2FA)
router.get('/recovery-keys', authMiddleware, getRecoveryKeys)
router.post('/recovery-keys/regenerate', authMiddleware, regenerateRecoveryKeys)

// otpLimiter = ป้องกัน email bombing, verifyLimiter = ป้องกัน brute force OTP/recovery key
router.post('/otp/request', otpLimiter, requestEmailOTP)
router.post('/otp/verify', verifyLimiter, verifyEmailOTPForLogin)

router.post('/verify-login', verifyLimiter, verify2FALogin)
router.post('/recovery/use', verifyLimiter, useRecoveryKey)

export default router
