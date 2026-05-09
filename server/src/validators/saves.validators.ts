import { z } from 'zod';

export const saveGameSchema = z.object({
  stateJson: z.string().min(2),
  name:      z.string().min(1).max(50).optional(),
  thumbnail: z.string().max(100_000).optional(),  // base64 mini-PNG ~75KB
});

export type SaveGameInput = z.infer<typeof saveGameSchema>;
