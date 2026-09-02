// utils/ipSelector.ts
import { Request } from 'express'

export interface ClientMetadata {
  ipAddress: string // Public IP (from x-forwarded-for header)
  serverIp: string // Private IP (what Express sees as req.ip)
  userAgent: string
}

export const getClientMetadata = (req: Request): ClientMetadata => {
  return {
    // 🌟 ใช้ req.ip เท่านั้น — Express คำนวณจาก trusted proxy chain ให้แล้ว
    //    (ห้ามอ่าน X-Forwarded-For เอง เพราะ attacker ปลอม header นี้ได้)
    ipAddress: req.ip || '0.0.0.0',
    // Private IP: socket address ที่ Express เห็นจริง (เช่น 172.x.x.x ใน Docker network)
    serverIp: req.socket?.remoteAddress || req.ip || '0.0.0.0',
    // User Agent
    userAgent: (req.headers['user-agent'] as string) || 'Unknown Device',
  }
}
