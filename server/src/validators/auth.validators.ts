import { z } from 'zod';

export const registerSchema = z.object({
  username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_-]+$/, 'Apenas letras, números, _ e -'),
  email:    z.string().email('Email inválido').max(255),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  emailOrUsername: z.string().min(1),
  password:        z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput    = z.infer<typeof loginSchema>;
