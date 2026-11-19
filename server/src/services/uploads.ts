/**
 * Subida directa del navegador a Cloudinary con firma del back: el archivo (hasta 50 MB)
 * no pasa por la API y el secreto nunca llega al front.
 */
import { createHash } from 'node:crypto';
import type { CartFile } from '@publicidad/shared';
import { env } from '../config/env';

export const UPLOAD_FOLDER = 'publicidad/disenos';

export type CloudinaryConfig = { cloudName: string; apiKey: string; apiSecret: string };

export function parseCloudinaryUrl(url: string | undefined): CloudinaryConfig | null {
  const m = url?.match(/^cloudinary:\/\/([^:]+):([^@]+)@([\w-]+)$/);
  if (!m) return null;
  return { apiKey: m[1]!, apiSecret: m[2]!, cloudName: m[3]! };
}

export const cloudinary = parseCloudinaryUrl(env.CLOUDINARY_URL);

/** Firma de Cloudinary: sha1 de los parámetros ordenados + secreto. */
export function signParams(params: Record<string, string | number>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return createHash('sha1')
    .update(toSign + apiSecret)
    .digest('hex');
}

export function uploadSignature(cfg: CloudinaryConfig, now = Date.now()) {
  const timestamp = Math.floor(now / 1000);
  const params = { folder: UPLOAD_FOLDER, timestamp };
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${cfg.cloudName}/auto/upload`,
    apiKey: cfg.apiKey,
    timestamp,
    folder: UPLOAD_FOLDER,
    signature: signParams(params, cfg.apiSecret),
  };
}

/**
 * Solo se aceptan archivos alojados en nuestra cuenta de Cloudinary y en la carpeta de
 * diseños; cualquier otra URL se descarta para no guardar enlaces arbitrarios.
 */
export function sanitizeFile(
  file: CartFile | null | undefined,
  cfg: CloudinaryConfig | null = cloudinary,
): CartFile | null {
  if (!file || !cfg) return null;
  const prefix = `https://res.cloudinary.com/${cfg.cloudName}/`;
  if (!file.url.startsWith(prefix) || !file.url.includes(`/${UPLOAD_FOLDER}/`)) return null;
  return { url: file.url, nombre: file.nombre.slice(0, 200) };
}
