// utils/escapeHtml.ts

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '`': '&#x60;',
  '=': '&#x3D;',
  '/': '&#x2F;',
}

/**
 * Escape ข้อความเพื่อฝังลงใน HTML ได้อย่างปลอดภัย (ป้องกัน HTML Injection
 * ใน email templates และจุดอื่น ๆ) — ยอมรับค่าใด ๆ และคืน string ที่ปลอดภัยเสมอ
 */
export const escapeHtml = (value: unknown): string => {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value).replace(
    /[&<>"'`=/]/g,
    (ch) => HTML_ESCAPE_MAP[ch] ?? ch,
  )
}