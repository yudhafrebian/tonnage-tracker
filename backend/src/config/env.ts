import dotenv from "dotenv"
import z = require("zod");

dotenv.config({quiet:true});

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters long"),
  // Jumlah proxy di depan app (Express "trust proxy"), supaya req.ip = IP user asli untuk
  // rate limit login. Production: browser -> Vercel (rewrite) -> load balancer Render -> app = 2.
  // 0 = tidak ada proxy (lokal).
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
});

const parsed = schema.safeParse(process.env);
if(!parsed.success) {
    console.error(`Missing required env:`);
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
}

export const env = parsed.data