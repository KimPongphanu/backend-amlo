import "dotenv/config";
import { defineConfig, env } from "@prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    // 🌟 ห้ามมี credential fallback ในโค้ด — ต้องมาจาก environment เท่านั้น
    url: env("DATABASE_URL") || process.env.DATABASE_URL || "",
  },
});
