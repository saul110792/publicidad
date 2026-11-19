import { Router } from 'express';
import { z } from 'zod';
import { clientUrl } from '../../config/env';
import { HttpError } from '../../middleware/errors';
import { getMetrics } from '../../services/metrics';
import {
  getRemarketingList,
  remarketingCsv,
  type RemarketingRow,
} from '../../services/remarketing';

export const adminMetricsRouter = Router();

const DAY = 86_400_000;
const dateParam = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .catch(undefined);

/** Rango del dashboard. `hasta` es inclusivo (se suma un día). Por defecto: últimos 30 días. */
export function parseRange(q: { desde?: unknown; hasta?: unknown }, now = new Date()) {
  const d = dateParam.parse(q.desde);
  const h = dateParam.parse(q.hasta);
  const hasta = h ? new Date(new Date(`${h}T00:00:00Z`).getTime() + DAY) : now;
  const desde = d ? new Date(`${d}T00:00:00Z`) : new Date(hasta.getTime() - 30 * DAY);
  if (Number.isNaN(desde.getTime()) || Number.isNaN(hasta.getTime()) || desde >= hasta) {
    throw new HttpError(400, 'Rango de fechas inválido');
  }
  if (hasta.getTime() - desde.getTime() > 366 * DAY) {
    throw new HttpError(400, 'El rango máximo es de un año');
  }
  return { desde, hasta };
}

adminMetricsRouter.get('/metrics', async (req, res) => {
  const { desde, hasta } = parseRange(req.query);
  res.json(await getMetrics(desde, hasta));
});

/** Mensaje sugerido para mandar por WhatsApp a cada cliente de la lista. */
function remarketingMessage(r: RemarketingRow) {
  const nombre = r.nombre.split(/\s+/)[0];
  if (!r.paquete) {
    return `Hola ${nombre}, ¿cómo te fue con tu pedido ${r.ultimoFolio}? Si necesitas algo más para tu negocio, aquí estamos: ${clientUrl}/paquetes`;
  }
  const falta = r.leFaltan.length ? ` Te faltaría: ${r.leFaltan.join(', ')}.` : '';
  return `Hola ${nombre}, ¿cómo te fue con tu pedido ${r.ultimoFolio}? Lo que compraste viene en el Paquete ${r.paquete} y te sale más barato que por separado.${falta} ${clientUrl}/paquetes`;
}

adminMetricsRouter.get('/remarketing', async (req, res) => {
  const rows = await getRemarketingList();
  const link = (r: RemarketingRow) =>
    `https://wa.me/52${r.whatsapp}?text=${encodeURIComponent(remarketingMessage(r))}`;

  if (req.query.formato === 'csv') {
    const fecha = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="remarketing-${fecha}.csv"`);
    res.send(remarketingCsv(rows, link));
    return;
  }
  res.json(rows.map((r) => ({ ...r, whatsappLink: link(r) })));
});
