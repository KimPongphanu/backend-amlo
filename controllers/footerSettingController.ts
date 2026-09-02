import asyncHandler from 'express-async-handler'
import { NextFunction, Request, Response } from 'express'
import prisma from '../lib/prisma'
import { AppError } from '../utils/AppError'
import { translateToEnglish } from '../utils/translateService'

// GET /api/settings — ดึง settings ทั้งหมด (สาธารณะ)
export const getAllSettings = asyncHandler(async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const settings = await prisma.site_settings.findMany()
  const map: Record<string, string> = {}
  settings.forEach((s: { key: string; value: string }) => {
    map[s.key] = s.value
  })
  res.status(200).json({ success: true, data: map })
})

// PUT /api/settings — อัปเดต settings (admin เท่านั้น)
export const updateSettings = asyncHandler(async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { settings } = req.body as {
    settings: { key: string; value: string }[]
  }

  if (!Array.isArray(settings)) {
    throw new AppError('ข้อมูล settings ต้องเป็น array', 400)
  }

  const finalSettings = [...settings]

  for (const item of settings) {
    if (typeof item.key !== 'string' || typeof item.value !== 'string') {
      throw new AppError('ข้อมูล key และ value ต้องเป็น string', 400)
    }

    // Auto translate for content_* keys (excluding content_en_*)
    if (item.key.startsWith('content_') && !item.key.startsWith('content_en_')) {
      const enKey = item.key.replace('content_', 'content_en_')
      const translated = await translateToEnglish(item.value)
      if (translated) {
        // If it was already in the incoming payload for some reason, update it, else push
        const existingIdx = finalSettings.findIndex(s => s.key === enKey)
        if (existingIdx >= 0) {
          finalSettings[existingIdx].value = translated
        } else {
          finalSettings.push({ key: enKey, value: translated })
        }
      }
    }
  }

  await prisma.$transaction(
    finalSettings.map((item) =>
      prisma.site_settings.upsert({
        where: { key: item.key },
        update: { value: item.value },
        create: { key: item.key, value: item.value },
      }),
    ),
  )

  // Return updated map
  const all = await prisma.site_settings.findMany()
  const map: Record<string, string> = {}
  all.forEach((s: { key: string; value: string }) => {
    map[s.key] = s.value
  })

  res
    .status(200)
    .json({ success: true, data: map, message: 'บันทึกการตั้งค่าสำเร็จ' })
})

// POST /api/settings/retry-translation — รีทรายข้อมูลการแปลภาษาที่ล้มเหลว
export const retryTranslation = asyncHandler(async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const allSettings = await prisma.site_settings.findMany()
  const contentKeys = allSettings.filter(
    (s: { key: string; value: string }) => s.key.startsWith('content_') && !s.key.startsWith('content_en_')
  )
  
  let retriedCount = 0;
  
  for (const th of contentKeys) {
    const enKey = th.key.replace('content_', 'content_en_')
    const enSetting = allSettings.find((s: { key: string; value: string }) => s.key === enKey)
    
    // If English translation is missing, empty, or exactly the same as Thai (failed translation fallback)
    if (!enSetting || !enSetting.value || enSetting.value.trim() === '' || enSetting.value === th.value) {
      if (th.value && th.value.trim() !== '') {
        const translated = await translateToEnglish(th.value)
        // Check if translation is different from original (success)
        if (translated && translated !== th.value) {
          await prisma.site_settings.upsert({
            where: { key: enKey },
            update: { value: translated },
            create: { key: enKey, value: translated },
          })
          retriedCount++
        }
      }
    }
  }

  res.status(200).json({ success: true, message: `Retried ${retriedCount} translations.` })
})
