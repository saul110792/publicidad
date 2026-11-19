import { z } from 'zod';
import { HttpError } from '../middleware/errors';

export const slugSchema = z.string().regex(/^[a-z0-9-]{1,80}$/);
/** groupId → optionId */
export const selectionSchema = z
  .record(z.string().regex(/^\d+$/), z.number().int().positive())
  .refine((s) => Object.keys(s).length <= 20);

const utmField = z.string().trim().max(100).optional();
export const utmSchema = z
  .object({ source: utmField, medium: utmField, campaign: utmField })
  .optional();

export function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (!r.success) throw new HttpError(400, 'Datos inválidos');
  return r.data;
}
