import { describe, expect, it } from 'vitest';
import { buildWhatsappMessage, type OptionGroupDTO } from '@publicidad/shared';
import {
  computeQuote,
  QuoteError,
  resolveSelection,
  unitPriceFor,
  type PricingProduct,
} from '../src/services/pricing';

const opt = (
  id: number,
  label: string,
  modificador: number | null,
  extra: Partial<OptionGroupDTO['opciones'][number]> = {},
) => ({
  id,
  label,
  modificador,
  tipoModificador: 'fijo' as const,
  valorCantidad: null,
  esDefault: false,
  ...extra,
});

const groups: OptionGroupDTO[] = [
  {
    id: 1,
    nombre: 'Cantidad',
    clave: 'cantidad',
    opciones: [
      opt(10, '100', 0, { valorCantidad: 100, esDefault: true }),
      opt(11, '500', 0, { valorCantidad: 500 }),
      opt(12, '1,000', 0, { valorCantidad: 1000 }),
    ],
  },
  {
    id: 2,
    nombre: 'Impresión',
    clave: 'caras',
    opciones: [
      opt(20, 'Una cara', 0, { tipoModificador: 'por_unidad', esDefault: true }),
      opt(21, 'Dos caras', 50, { tipoModificador: 'por_unidad' }),
    ],
  },
  {
    id: 3,
    nombre: 'Acabado',
    clave: 'acabado',
    opciones: [
      opt(30, 'Sin acabado', 0, { esDefault: true }),
      opt(31, 'Laminado', 10, { tipoModificador: 'porcentaje' }),
      opt(32, 'Barniz UV', null),
    ],
  },
  {
    id: 4,
    nombre: 'Diseño',
    clave: 'diseno',
    opciones: [
      opt(40, 'Ya tengo mi diseño', 0, { esDefault: true }),
      opt(41, 'Quiero que me lo diseñen', 25000),
    ],
  },
];

const product: PricingProduct = { precioBase: 200, cantidadMinima: 100, unidad: 'pzas' };
const tiers = [
  { cantidad: 500, precioUnitario: 150 },
  { cantidad: 1000, precioUnitario: 100 },
];

const quote = (sel: Record<string, number>, p = product, t = tiers) =>
  computeQuote(p, t, resolveSelection(groups, sel));

describe('unitPriceFor', () => {
  it('usa precio_base por debajo de la primera escala', () => {
    expect(unitPriceFor(100, 200, tiers)).toBe(200);
  });
  it('usa la escala más alta que no se pase de la cantidad', () => {
    expect(unitPriceFor(500, 200, tiers)).toBe(150);
    expect(unitPriceFor(999, 200, tiers)).toBe(150);
    expect(unitPriceFor(1000, 200, tiers)).toBe(100);
    expect(unitPriceFor(5000, 200, tiers)).toBe(100);
  });
  it('funciona con escalas desordenadas y sin precio base', () => {
    expect(unitPriceFor(600, null, [...tiers].reverse())).toBe(150);
    expect(unitPriceFor(10, null, tiers)).toBeNull();
  });
});

describe('computeQuote', () => {
  it('toma las opciones por defecto cuando no se elige nada', () => {
    const q = quote({});
    expect(q.cantidad).toBe(100);
    expect(q.total).toBe(200 * 100);
    expect(q.precioUnitario).toBe(200);
    expect(q.seleccion.map((s) => s.opcion)).toEqual([
      '100',
      'Una cara',
      'Sin acabado',
      'Ya tengo mi diseño',
    ]);
  });

  it('aplica escala por cantidad + por_unidad + fijo', () => {
    // 500 pzas a $1.50 = 75000; dos caras +0.50 × 500 = 25000; diseño fijo 25000
    const q = quote({ 1: 11, 2: 21, 4: 41 });
    expect(q.total).toBe(75000 + 25000 + 25000);
    expect(q.pendientes).toEqual([]);
  });

  it('aplica el porcentaje al final sobre todo lo demás', () => {
    // 1000 × 100 = 100000; diseño 25000 → 125000 × 1.10
    const q = quote({ 1: 12, 3: 31, 4: 41 });
    expect(q.total).toBe(137500);
    expect(q.precioUnitario).toBe(138); // redondeado
  });

  it('deja el total en NULL y lista pendientes si una opción no tiene precio', () => {
    const q = quote({ 3: 32 });
    expect(q.total).toBeNull();
    expect(q.precioUnitario).toBeNull();
    expect(q.pendientes).toEqual(['Acabado: Barniz UV']);
  });

  it('deja el total en NULL si el producto no tiene precio base ni escala', () => {
    const q = quote({}, { ...product, precioBase: null }, []);
    expect(q.total).toBeNull();
    expect(q.pendientes).toContain('Precio base');
  });

  it('usa la cantidad mínima si el producto no tiene grupo de cantidad', () => {
    const q = computeQuote({ precioBase: 5000, cantidadMinima: 2, unidad: 'm²' }, [], []);
    expect(q.cantidad).toBe(2);
    expect(q.total).toBe(10000);
  });

  it('rechaza una opción que no pertenece al grupo', () => {
    expect(() => resolveSelection(groups, { 1: 20 })).toThrow(QuoteError);
  });
});

describe('buildWhatsappMessage', () => {
  it('incluye producto, opciones, precio y referencia', () => {
    const msg = buildWhatsappMessage({
      producto: 'Tarjetas de presentación',
      seleccion: [{ grupo: 'Cantidad', clave: 'cantidad', opcion: '500' }],
      total: 125000,
      refCode: 'TJ-4F2A',
    });
    expect(msg).toContain('*Tarjetas de presentación*');
    expect(msg).toContain('- Cantidad: 500');
    expect(msg).toMatch(/Precio estimado: \$1,250/);
    expect(msg).toContain('Referencia: TJ-4F2A');
  });

  it('dice "por confirmar" si no hay precio', () => {
    const msg = buildWhatsappMessage({
      producto: 'Lona',
      seleccion: [],
      total: null,
      refCode: 'LO-0001',
    });
    expect(msg).toContain('Precio estimado: por confirmar');
  });
});

describe('generateRefCode', () => {
  it('usa el prefijo del producto y 4 hex', async () => {
    const { generateRefCode, REF_CODE_PATTERN } = await import('../src/services/refCode');
    expect(generateRefCode('TJ')).toMatch(/^TJ-[0-9A-F]{4}$/);
    expect(generateRefCode('lonas')).toMatch(/^LO-/);
    expect(generateRefCode('9')).toMatch(REF_CODE_PATTERN);
  });
});

describe('formatMXN', () => {
  it('muestra pesos cerrados sin decimales y centavos con dos', async () => {
    const { formatMXN } = await import('@publicidad/shared');
    expect(formatMXN(115000)).toBe('$1,150');
    expect(formatMXN(230)).toBe('$2.30');
    expect(formatMXN(50)).toBe('$0.50');
  });
});
