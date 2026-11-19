import { describe, expect, it } from 'vitest';
import { sumOrNull } from '@publicidad/shared';
import { escapeLike, precioDesde, productQuerySchema } from '../src/services/catalog';

describe('productQuerySchema', () => {
  it('usa valores por defecto sin params', () => {
    expect(productQuerySchema.parse({})).toEqual({
      cat: [],
      q: '',
      giro: undefined,
      rapida: false,
      diseno: false,
      orden: 'populares',
    });
  });

  it('separa categorías y descarta slugs inválidos', () => {
    const q = productQuerySchema.parse({ cat: 'impresos, gran-formato,../x,' });
    expect(q.cat).toEqual(['impresos', 'gran-formato']);
  });

  it('ignora giro y orden desconocidos en lugar de fallar', () => {
    const q = productQuerySchema.parse({ giro: 'mineria', orden: 'random', rapida: 'quizas' });
    expect(q.giro).toBeUndefined();
    expect(q.orden).toBe('populares');
    expect(q.rapida).toBe(false);
  });

  it('lee banderas y giro válidos', () => {
    const q = productQuerySchema.parse({ giro: 'salud', rapida: '1', diseno: 'true' });
    expect(q).toMatchObject({ giro: 'salud', rapida: true, diseno: true });
  });
});

describe('escapeLike', () => {
  it('escapa comodines', () => {
    expect(escapeLike('50%_off\\')).toBe('50\\%\\_off\\\\');
  });
});

describe('precioDesde', () => {
  it('es NULL si no hay precio', () => {
    expect(precioDesde(null, 100)).toBeNull();
  });
  it('multiplica por la cantidad mínima (1 si no hay)', () => {
    expect(precioDesde(150, 100)).toBe(15000);
    expect(precioDesde(150, null)).toBe(150);
  });
});

describe('sumOrNull', () => {
  it('suma los valores', () => {
    expect(sumOrNull([50000, 4000, 5000])).toBe(59000);
  });

  it('es NULL si algún valor no tiene precio', () => {
    expect(sumOrNull([100, null])).toBeNull();
  });
});
