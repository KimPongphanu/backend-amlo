// middlewares/errorHandler.ts
import { NextFunction, Request, Response } from 'express'

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.error('Global Error Handler:', err) // Log error for debugging

  const isProduction = process.env.NODE_ENV === 'production'

  // 🌟 Production: error ที่ไม่ใช่ AppError (ไม่มี statusCode) ต้องไม่เผย detail ภายใน
  const message =
    isProduction && !err.statusCode
      ? 'Internal Server Error'
      : err.message || 'Internal Server Error'

  // Send a clean response to the client
  res.status(err.statusCode || 500).json({
    success: false,
    message,
  })
}
