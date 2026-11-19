/**
 * Alta de clientes y pedidos. Lo comparten el checkout de la tienda y la venta manual del admin.
 */
import { sql } from 'drizzle-orm';
import type { db } from '../db/client';
import { customers, orderItems, orders } from '../db/schema';
import { HttpError } from '../middleware/errors';
import { generateFolio } from './folio';
import { isUniqueViolation } from './refCode';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Guarda el WhatsApp como 10 dígitos para que el mismo cliente no se duplique. */
export function normalizeWhatsapp(digits: string): string {
  return digits.replace(/\D/g, '').slice(-10);
}

/**
 * Crea el cliente o actualiza el existente (mismo WhatsApp). El correo y el giro solo se
 * sobrescriben si vienen; el origen ("¿cómo nos conociste?") conserva el primero.
 */
export async function upsertCustomer(
  tx: Tx,
  c: {
    nombre: string;
    whatsapp: string;
    correo?: string | null;
    giro?: string | null;
    origen?: string | null;
  },
): Promise<number> {
  const [row] = await tx
    .insert(customers)
    .values({
      nombre: c.nombre,
      whatsapp: normalizeWhatsapp(c.whatsapp),
      correo: c.correo || null,
      giro: c.giro || null,
      origen: c.origen || null,
    })
    .onConflictDoUpdate({
      target: customers.whatsapp,
      set: {
        nombre: c.nombre,
        correo: sql`coalesce(excluded.correo, ${customers.correo})`,
        giro: sql`coalesce(excluded.giro, ${customers.giro})`,
        origen: sql`coalesce(${customers.origen}, excluded.origen)`,
      },
    })
    .returning({ id: customers.id });
  return row!.id;
}

type OrderValues = Omit<typeof orders.$inferInsert, 'folio' | 'id'>;
type ItemValues = Omit<typeof orderItems.$inferInsert, 'orderId' | 'id'>;

/** Inserta el pedido con un folio aleatorio (reintenta si choca) y sus líneas. */
export async function insertOrder(
  tx: Tx,
  values: OrderValues,
  items: ItemValues[],
): Promise<{ id: number; folio: string }> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const folio = generateFolio();
    try {
      // Savepoint: si el folio choca, solo se revierte este intento.
      return await tx.transaction(async (sp) => {
        const [order] = await sp
          .insert(orders)
          .values({ ...values, folio })
          .returning({ id: orders.id });
        if (items.length) {
          await sp.insert(orderItems).values(items.map((it) => ({ ...it, orderId: order!.id })));
        }
        return { id: order!.id, folio };
      });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
    }
  }
  throw new HttpError(503, 'No pudimos generar el folio, intenta de nuevo.');
}
