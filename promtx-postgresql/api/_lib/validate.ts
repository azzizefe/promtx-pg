import { z } from 'zod';
import type { VercelRequest } from '@vercel/node';
import { ApiError } from './errors';

export function validateBody<T extends z.ZodTypeAny>(req: VercelRequest, schema: T): z.infer<T> {
  const body = req.body;
  if (!body) {
    throw new ApiError(400, 'İstek gövdesi (body) bulunamadı');
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    const errors = result.error.issues.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
    throw new ApiError(400, `Geçersiz istek verisi: ${errors}`);
  }

  return result.data;
}

export const loginSchema = z.object({
  email: z.string().email('Geçersiz e-posta formatı'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
});

export const registerSchema = z.object({
  email: z.string().email('Geçersiz e-posta formatı'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
  name: z.string().min(2, 'Ad en az 2 karakter olmalıdır'),
});
