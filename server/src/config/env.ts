import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || '../.env' });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must have at least 32 characters'),
  COOKIE_SECURE: z.string().default('false'),
  SEED_ADMIN_EMAIL: z.string().email().default('admin@hydrowork.local'),
  SEED_ADMIN_PASSWORD: z.string().min(12).default('ChangeMe-Local-Only-2026!'),
});

export const env = schema.parse(process.env);
