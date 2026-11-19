import type { CartFile } from '@publicidad/shared';
import { apiPost, ApiError } from '../../lib/api';

type Firma = {
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
};

/**
 * Sube el archivo de diseño directo a Cloudinary con una firma del back.
 * Lanza ApiError(503) si la subida no está configurada: el cliente lo manda por WhatsApp.
 */
export async function uploadDesign(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<CartFile> {
  const firma = await apiPost<Firma>('/api/uploads/firma', {});
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', firma.apiKey);
  form.append('timestamp', String(firma.timestamp));
  form.append('folder', firma.folder);
  form.append('signature', firma.signature);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', firma.uploadUrl);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText) as {
          secure_url?: string;
          error?: { message?: string };
        };
        if (xhr.status >= 200 && xhr.status < 300 && body.secure_url) {
          resolve({ url: body.secure_url, nombre: file.name });
        } else {
          reject(new ApiError(xhr.status, body.error?.message ?? 'No se pudo subir el archivo'));
        }
      } catch {
        reject(new ApiError(xhr.status, 'No se pudo subir el archivo'));
      }
    };
    xhr.onerror = () => reject(new ApiError(0, 'Se perdió la conexión al subir el archivo'));
    xhr.send(form);
  });
}
