import { describe, expect, it } from 'vitest';
import {
  escapeLike,
  precioDesde,
  precioSeparado,
  productQuerySchema,
} from '../src/services/catalog';

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

describe('precioSeparado', () => {
  it('suma precio × cantidad, usando la mínima si el componente no trae cantidad', () => {
    expect(
      precioSeparado([
        { precioBase: 100, cantidad: 500, cantidadMinima: 100 },
        { precioBase: 2000, cantidad: null, cantidadMinima: 2 },
        { precioBase: 5000, cantidad: null, cantidadMinima: null },
      ]),
    ).toBe(50000 + 4000 + 5000);
  });

  it('es NULL si algún componente no tiene precio', () => {
    expect(
      precioSeparado([
        { precioBase: 100, cantidad: 1, cantidadMinima: null },
        { precioBase: null, cantidad: 1, cantidadMinima: null },
      ]),
    ).toBeNull();
  });

  it('es NULL para un paquete sin componentes', () => {
    expect(precioSeparado([])).toBeNull();
  });
});
