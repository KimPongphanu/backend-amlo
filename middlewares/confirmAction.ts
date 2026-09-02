// backend/middlewares/confirmAction.ts
import crypto from 'crypto'
import { Request, Response } from 'express'
import { AuthRequest } from './auth'

interface ConfirmationState {
  token: string
  action: string
  targetId: string
  confirmed: boolean
  reason: string
  expiresAt: number
}

const confirmationStore = new Map<string, ConfirmationState>()

const STORE_EXPIRY_MS = 5 * 60 * 1000

setInterval(() => {
  const now = Date.now()
  for (const [key, value] of confirmationStore.entries()) {
    if (value.expiresAt < now) {
      confirmationStore.delete(key)
    }
  }
}, 60 * 1000).unref()

// 🌟 Key ผูกกับ user + action + target — กัน token ไปใช้กับเป้าหมายอื่น
const storeKey = (req: Request, action: string, targetId: string): string =>
  `confirm_${(req as AuthRequest).user?.uuid || 'anon'}_${action}_${targetId}`

/**
 * Step 1: สร้าง confirmation token และจดจำ context (action + target) ไว้บน server
 */
export const step1RequestConfirmation = async (
  req: Request,
  res: Response,
  action: string,
  targetId: string,
): Promise<void> => {
  const confirmationToken = crypto.randomBytes(32).toString('hex')
  confirmationStore.set(storeKey(req, action, targetId), {
    token: confirmationToken,
    action,
    targetId,
    confirmed: false,
    reason: '',
    expiresAt: Date.now() + STORE_EXPIRY_MS,
  })

  res.json({
    success: true,
    step: 1,
    message: 'Confirmation requested. Check your email/app.',
    confirmationToken,
  })
}

/**
 * Step 2: ตรวจ token (ต้องเป็น token ที่ออกจาก step 1 ของ user+action+target เดียวกัน)
 * แล้วบันทึกสถานะ confirmed + reason
 */
export const step2ConfirmWithReason = async (
  req: Request,
  res: Response,
  action: string,
  targetId: string,
): Promise<void> => {
  const { token, reason } = req.body as { token?: string; reason?: string }
  const entry = confirmationStore.get(storeKey(req, action, targetId))

  if (!entry || entry.expiresAt < Date.now() || entry.token !== token) {
    res.status(400).json({
      success: false,
      message:
        'Confirmation token ไม่ถูกต้องหรือหมดอายุ กรุณาเริ่มยืนยันใหม่ (step 1)',
    })
    return
  }

  entry.confirmed = true
  entry.reason = typeof reason === 'string' ? reason : ''

  res.json({
    success: true,
    step: 2,
    message: 'Confirmed. Delaying execution by 5 minutes.',
  })
}

/**
 * Step 3: อนุญาตให้ execute เฉพาะเมื่อผ่าน step 2 จริง (consume สถานะทิ้งหลังใช้)
 * @returns true = ผ่าน (response ส่งให้ client แล้ว), false = ไม่ผ่าน (403 ส่งแล้ว)
 */
export const step3ExecuteWithDelay = async (
  req: Request,
  res: Response,
  action: string,
  targetId: string,
): Promise<boolean> => {
  const key = storeKey(req, action, targetId)
  const entry = confirmationStore.get(key)

  if (!entry || !entry.confirmed || entry.expiresAt < Date.now()) {
    res.status(403).json({
      success: false,
      message: 'ยังไม่ได้ยืนยันการทำรายการ (ต้องผ่าน step 1 และ 2 ก่อน)',
    })
    return false
  }

  confirmationStore.delete(key) // one-time use

  res.json({
    success: true,
    step: 3,
    message: 'Action executed successfully.',
  })
  return true
}

/**
 * เช็ค + consume สถานะ confirm โดยไม่ตอบกลับเอง
 * (สำหรับ controller ที่ execute action เองใน step 3)
 */
export const isConfirmed = (
  req: Request,
  action: string,
  targetId: string,
): boolean => {
  const key = storeKey(req, action, targetId)
  const entry = confirmationStore.get(key)

  if (!entry || !entry.confirmed || entry.expiresAt < Date.now()) {
    return false
  }

  confirmationStore.delete(key) // one-time use
  return true
}

export const cancelConfirmation = (
  req: AuthRequest,
  res: Response,
  action: string,
  targetId = '',
): void => {
  confirmationStore.delete(storeKey(req, action, targetId))

  res.status(200).json({
    success: true,
    message: 'Action cancelled',
  })
}
