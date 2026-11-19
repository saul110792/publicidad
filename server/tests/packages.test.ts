import { describe, expect, it } from 'vitest';
import { anticipoDe, type OptionGroupDTO } from '@publicidad/shared';
import {
  findBestOffer,
  matchPackage,
  mergeComponentSelection,
  packageItemSelection,
  type MatchPackage,
} from '../src/services/packageMatch';
import { FOLIO_PATTERN, generateFolio } from '../src/services/folio';
import { parseCloudinaryUrl, sanitizeFile, signParams } from '../src/services/uploads';

const pkg = (
  slug: string,
  productSlugs: string[],
  extra: Partial<MatchPackage> = {},
): MatchPackage => ({
  slug,
  recomendado: false,
  orden: 0,
  items: productSlugs.map((p) => ({ productSlug: p, etiqueta: p })),
  ...extra,
});

const lines = (...slugs: string[]) => slugs.map((s, i) => ({ id: `l${i}`, productSlug: s }));

const arranque = pkg('arranque', ['logotipo', 'tarjetas', 'lonas', 'google-maps'], {
  recomendado: true,
  orden: 0,
});
const restaurante = pkg('restaurante', ['menus', 'lonas', 'flyers', 'redes'], { orden: 1 });
const comercio = pkg('comercio', ['vinil', 'etiquetas', 'bolsas', 'flyers', 'web'], { orden: 5 });

describe('matchPackage', () => {
  it('marca cubiertos y faltantes', () => {
    const m = matchPackage(lines('tarjetas', 'logotipo', 'playeras'), arranque);
    expect(m.covered).toEqual([
      { itemIndex: 0, lineId: 'l1' },
      { itemIndex: 1, lineId: 'l0' },
    ]);
    expect(m.missing).toEqual([2, 3]);
  });

  it('una línea cubre un solo componente aunque el paquete repita el producto', () => {
    const doble = pkg('doble', ['flyers', 'flyers', 'lonas']);
    expect(matchPackage(lines('flyers'), doble).covered).toHaveLength(1);
    expect(matchPackage(lines('flyers', 'flyers'), doble).covered).toHaveLength(2);
  });

  it('dos líneas del mismo producto no cuentan doble para un componente', () => {
    expect(matchPackage(lines('lonas', 'lonas'), arranque).covered).toHaveLength(1);
  });
});

describe('findBestOffer', () => {
  const all = [arranque, restaurante, comercio];

  it('no ofrece nada con menos de 2 componentes cubiertos', () => {
    expect(findBestOffer(lines('tarjetas'), all)).toBeNull();
    expect(findBestOffer(lines('tarjetas', 'playeras'), all)).toBeNull();
  });

  it('ofrece el paquete con 2 componentes cubiertos', () => {
    expect(findBestOffer(lines('tarjetas', 'logotipo'), all)?.slug).toBe('arranque');
  });

  it('prefiere el paquete que cubre más componentes', () => {
    // lonas está en arranque y restaurante; menus + flyers inclinan a restaurante.
    expect(findBestOffer(lines('lonas', 'menus', 'flyers', 'logotipo'), all)?.slug).toBe(
      'restaurante',
    );
  });

  it('a igual cobertura, prefiere el de mayor proporción (paquete más chico)', () => {
    // flyers + lonas: restaurante (2/4) vs. comercio solo 1 → restaurante;
    // flyers + etiquetas: comercio 2/5. Con un paquete de 3 que cubre 2 gana ese.
    const chico = pkg('chico', ['flyers', 'etiquetas', 'stickers'], { orden: 9 });
    expect(findBestOffer(lines('flyers', 'etiquetas'), [...all, chico])?.slug).toBe('chico');
  });

  it('a igual cobertura y proporción, prefiere el recomendado y luego el orden', () => {
    const a = pkg('a', ['x', 'y', 'z'], { orden: 2 });
    const b = pkg('b', ['x', 'y', 'w'], { orden: 1 });
    const c = pkg('c', ['x', 'y', 'v'], { orden: 3, recomendado: true });
    expect(findBestOffer(lines('x', 'y'), [a, b])?.slug).toBe('b');
    expect(findBestOffer(lines('x', 'y'), [a, b, c])?.slug).toBe('c');
  });

  it('no vuelve a ofrecer paquetes rechazados o que ya van en el carrito', () => {
    const l = lines('tarjetas', 'logotipo', 'lonas', 'menus');
    expect(findBestOffer(l, all)?.slug).toBe('arranque');
    expect(findBestOffer(l, all, ['arranque'])?.slug).toBe('restaurante');
    expect(findBestOffer(l, all, ['arranque', 'restaurante'])).toBeNull();
  });

  it('ignora paquetes sin componentes', () => {
    expect(findBestOffer(lines('a', 'b'), [pkg('vacio', [])])).toBeNull();
  });
});

describe('packageItemSelection', () => {
  const groups: OptionGroupDTO[] = [
    {
      id: 1,
      nombre: 'Cantidad',
      clave: 'cantidad',
      opciones: [
        {
          id: 10,
          label: '100',
          modificador: 0,
          tipoModificador: 'fijo',
          valorCantidad: 100,
          esDefault: true,
        },
        {
          id: 11,
          label: '500',
          modificador: 0,
          tipoModificador: 'fijo',
          valorCantidad: 500,
          esDefault: false,
        },
      ],
    },
    {
      id: 2,
      nombre: 'Medida',
      clave: 'medida',
      opciones: [
        {
          id: 20,
          label: '1 × 1 m',
          modificador: 0,
          tipoModificador: 'fijo',
          valorCantidad: null,
          esDefault: true,
        },
        {
          id: 21,
          label: '2 × 1 m',
          modificador: null,
          tipoModificador: 'fijo',
          valorCantidad: null,
          esDefault: false,
        },
      ],
    },
  ];

  it('elige la cantidad del componente y las opciones por texto', () => {
    expect(
      packageItemSelection(groups, { cantidad: 500, opcionesDefault: { medida: '2 × 1 M' } }),
    ).toEqual({
      '1': 11,
      '2': 21,
    });
  });

  it('deja que el motor use el default si no hay coincidencia', () => {
    expect(packageItemSelection(groups, { cantidad: 300, opcionesDefault: null })).toEqual({});
  });
});

describe('mergeComponentSelection', () => {
  const g = (id: number, clave: string, ids: number[]): OptionGroupDTO => ({
    id,
    nombre: clave,
    clave,
    opciones: ids.map((oid, i) => ({
      id: oid,
      label: String(oid),
      modificador: 0,
      tipoModificador: 'fijo' as const,
      valorCantidad: clave === 'cantidad' ? oid : null,
      esDefault: i === 0,
    })),
  });
  const groups = [g(1, 'cantidad', [100, 500]), g(2, 'papel', [20, 21]), g(3, 'medida', [30, 31])];

  it('la cantidad es la del paquete y se conservan las demás opciones del cliente', () => {
    const sel = mergeComponentSelection(
      groups,
      { cantidad: 500, opcionesDefault: {} },
      { '1': 100, '2': 21, '3': 31 },
    );
    expect(sel).toEqual({ '1': 500, '2': 21, '3': 31 });
  });

  it('lo que el paquete fija en opciones_default gana sobre lo del cliente', () => {
    const sel = mergeComponentSelection(
      groups,
      { cantidad: null, opcionesDefault: { medida: '30' } },
      { '1': 500, '2': 21, '3': 31 },
    );
    expect(sel).toEqual({ '2': 21, '3': 30 });
  });
});

describe('folio', () => {
  it('tiene el formato P-XXXXXX sin caracteres ambiguos', () => {
    for (let i = 0; i < 200; i++) expect(generateFolio()).toMatch(FOLIO_PATTERN);
  });
});

describe('anticipoDe', () => {
  it('es la mitad redondeada hacia arriba al peso', () => {
    expect(anticipoDe(115000)).toBe(57500);
    expect(anticipoDe(100100)).toBe(50100);
    expect(anticipoDe(null)).toBeNull();
  });
});

describe('subida de archivos', () => {
  const cfg = parseCloudinaryUrl('cloudinary://123:secreto@mi-nube')!;

  it('lee CLOUDINARY_URL', () => {
    expect(cfg).toEqual({ apiKey: '123', apiSecret: 'secreto', cloudName: 'mi-nube' });
    expect(parseCloudinaryUrl('https://otra-cosa')).toBeNull();
    expect(parseCloudinaryUrl(undefined)).toBeNull();
  });

  it('firma los parámetros ordenados con el secreto (algoritmo de Cloudinary)', () => {
    // Ejemplo de la documentación de Cloudinary.
    expect(
      signParams(
        {
          timestamp: 1315060510,
          public_id: 'sample_image',
          eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop',
        },
        'abcd',
      ),
    ).toBe('bfd09f95f331f558cbd1320e67aa8d488770583e');
  });

  it('solo acepta archivos de nuestra cuenta y carpeta', () => {
    const ok = 'https://res.cloudinary.com/mi-nube/image/upload/v1/publicidad/disenos/a.pdf';
    expect(sanitizeFile({ url: ok, nombre: 'a.pdf' }, cfg)).toEqual({ url: ok, nombre: 'a.pdf' });
    expect(
      sanitizeFile({ url: 'https://evil.example/publicidad/disenos/a.pdf', nombre: 'a' }, cfg),
    ).toBeNull();
    expect(
      sanitizeFile(
        {
          url: 'https://res.cloudinary.com/otra/image/upload/publicidad/disenos/a.pdf',
          nombre: 'a',
        },
        cfg,
      ),
    ).toBeNull();
    expect(sanitizeFile({ url: ok, nombre: 'a' }, null)).toBeNull();
  });
});
