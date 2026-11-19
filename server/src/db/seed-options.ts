/**
 * Opciones del cotizador por producto.
 *
 * Regla de precios: ningún costo es inventado.
 *  - La opción base de cada grupo (la primera) lleva modificador 0: es el punto de partida
 *    del precio base, no un cargo extra.
 *  - Las demás opciones van con modificador NULL ("por confirmar") hasta que el negocio
 *    capture su costo en el admin.
 *  - Las opciones de cantidad siempre van en 0: su precio sale de precio_base o de las
 *    escalas (price_tiers).
 */

type Tipo = 'fijo' | 'porcentaje' | 'por_unidad';

export type OptionSeed = {
  label: string;
  valorCantidad?: number;
  tipo?: Tipo;
  /** true → modificador 0 (opción base). Por defecto solo la primera opción del grupo. */
  base?: boolean;
};

export type GroupSeed = { nombre: string; clave: string; opciones: OptionSeed[]; tipo?: Tipo };

const cantidad = (valores: number[], unidad = ''): GroupSeed => ({
  nombre: 'Cantidad',
  clave: 'cantidad',
  opciones: valores.map((v) => ({
    label: `${v.toLocaleString('es-MX')}${unidad ? ` ${unidad}` : ''}`,
    valorCantidad: v,
    base: true,
  })),
});

const medida = (opciones: { label: string; m2: number }[]): GroupSeed => ({
  nombre: 'Medida',
  clave: 'cantidad',
  opciones: opciones.map((o) => ({ label: o.label, valorCantidad: o.m2, base: true })),
});

const impresion = (labels = ['Una cara', 'Dos caras']): GroupSeed => ({
  nombre: 'Impresión',
  clave: 'caras',
  tipo: 'por_unidad',
  opciones: labels.map((label) => ({ label })),
});

/** El grupo de diseño va al final de todos los productos impresos. */
const diseno: GroupSeed = {
  nombre: 'Diseño',
  clave: 'diseno',
  tipo: 'fijo',
  opciones: [{ label: 'Ya tengo mi diseño' }, { label: 'Quiero que me lo diseñen' }],
};

const grupo = (
  nombre: string,
  clave: string,
  labels: string[],
  tipo: Tipo = 'por_unidad',
): GroupSeed => ({ nombre, clave, tipo, opciones: labels.map((label) => ({ label })) });

export const REF_PREFIX: Record<string, string> = {
  'tarjetas-de-presentacion': 'TJ',
  flyers: 'FL',
  menus: 'MN',
  talonarios: 'TA',
  recetarios: 'RC',
  'tarjetas-de-cita': 'TC',
  etiquetas: 'ET',
  lonas: 'LO',
  'vinil-vitrina': 'VI',
  'letrero-exterior': 'LE',
  'rotulacion-vehicular': 'RV',
  playeras: 'PL',
  uniformes: 'UN',
  bolsas: 'BO',
  logotipo: 'LG',
  'perfil-instagram': 'IG',
  'google-maps': 'GM',
  'landing-page': 'LP',
  'landing-agenda': 'LA',
  'catalogo-web': 'CW',
  'redes-sociales-mes': 'RS',
};

export const OPTION_SETS: Record<string, GroupSeed[]> = {
  'tarjetas-de-presentacion': [
    cantidad([100, 250, 500, 1000]),
    grupo('Papel', 'material', ['Couché 300 g', 'Opalina', 'Lino']),
    grupo('Acabado', 'acabado', ['Sin acabado', 'Laminado mate', 'Laminado brillante']),
    impresion(),
    diseno,
  ],
  'tarjetas-de-cita': [
    cantidad([100, 250, 500, 1000]),
    grupo('Papel', 'material', ['Couché 300 g', 'Opalina']),
    grupo('Acabado', 'acabado', ['Sin acabado', 'Laminado mate']),
    impresion(),
    diseno,
  ],
  flyers: [
    cantidad([100, 500, 1000, 2000]),
    grupo('Papel', 'material', ['Couché 130 g', 'Couché 150 g', 'Bond']),
    grupo('Tamaño', 'tamano', ['Media carta', 'Carta']),
    impresion(),
    diseno,
  ],
  menus: [
    cantidad([10, 25, 50, 100]),
    grupo('Material', 'material', ['Cartulina', 'Enmicado']),
    grupo('Tamaño', 'tamano', ['Carta', 'Doble carta (díptico)']),
    impresion(),
    diseno,
  ],
  talonarios: [
    cantidad([5, 10, 20], 'blocks'),
    grupo('Papel', 'material', ['Bond', 'Autocopiante (original y copia)']),
    grupo('Tamaño', 'tamano', ['Media carta', 'Carta']),
    diseno,
  ],
  recetarios: [
    cantidad([5, 10, 20], 'blocks'),
    grupo('Papel', 'material', ['Bond', 'Autocopiante (original y copia)']),
    diseno,
  ],
  etiquetas: [
    cantidad([100, 500, 1000, 2000]),
    grupo('Material', 'material', ['Papel', 'Vinil']),
    grupo('Acabado', 'acabado', ['Mate', 'Brillante']),
    diseno,
  ],
  lonas: [
    medida([
      { label: '1 × 1 m', m2: 1 },
      { label: '2 × 1 m', m2: 2 },
      { label: '3 × 1 m', m2: 3 },
      { label: '3 × 2 m', m2: 6 },
    ]),
    grupo('Material', 'material', ['Lona 13 oz', 'Lona mesh (para viento)']),
    grupo('Acabado', 'acabado', ['Bastilla y ojillos', 'Solo ojillos', 'Sin acabado'], 'fijo'),
    diseno,
  ],
  'vinil-vitrina': [
    medida([
      { label: '1 m²', m2: 1 },
      { label: '2 m²', m2: 2 },
      { label: '4 m²', m2: 4 },
    ]),
    grupo('Tipo', 'material', ['Vinil recortado', 'Vinil impreso', 'Microperforado']),
    grupo('Instalación', 'instalacion', ['Sin instalación', 'Con instalación'], 'fijo'),
    diseno,
  ],
  'letrero-exterior': [
    grupo('Medida', 'tamano', ['60 × 40 cm', '90 × 60 cm', '120 × 80 cm'], 'fijo'),
    grupo('Material', 'material', ['Coroplast', 'PVC espumado', 'Lámina galvanizada'], 'fijo'),
    grupo('Instalación', 'instalacion', ['Sin instalación', 'Con instalación'], 'fijo'),
    diseno,
  ],
  'rotulacion-vehicular': [
    grupo('Cobertura', 'cobertura', ['Puertas', 'Puertas y medallón', 'Vehículo completo'], 'fijo'),
    grupo('Vehículo', 'tamano', ['Auto', 'Camioneta', 'Camión'], 'fijo'),
    diseno,
  ],
  playeras: [
    cantidad([10, 25, 50, 100]),
    grupo('Técnica', 'material', ['Estampado (serigrafía)', 'Vinil textil', 'Bordado']),
    impresion(['Frente', 'Frente y espalda']),
    diseno,
  ],
  uniformes: [
    cantidad([5, 10, 25]),
    grupo('Prenda', 'material', ['Mandil', 'Filipina', 'Camisa', 'Polo']),
    grupo('Logo', 'acabado', ['Estampado', 'Bordado']),
    diseno,
  ],
  bolsas: [
    cantidad([50, 100, 250, 500]),
    grupo('Material', 'material', ['Papel kraft', 'Tela (manta)', 'Plástico biodegradable']),
    impresion(['Una tinta', 'Dos tintas']),
    diseno,
  ],
  logotipo: [grupo('Propuestas', 'propuestas', ['2 propuestas', '3 propuestas'], 'fijo')],
  'perfil-instagram': [
    grupo('Publicaciones iniciales', 'alcance', ['6 publicaciones', '9 publicaciones'], 'fijo'),
  ],
  'google-maps': [],
  'landing-page': [grupo('Dominio', 'dominio', ['Ya tengo dominio', 'Necesito dominio'], 'fijo')],
  'landing-agenda': [grupo('Dominio', 'dominio', ['Ya tengo dominio', 'Necesito dominio'], 'fijo')],
  'catalogo-web': [
    grupo('Productos', 'alcance', ['Hasta 30 productos', 'Hasta 100 productos'], 'fijo'),
    grupo('Dominio', 'dominio', ['Ya tengo dominio', 'Necesito dominio'], 'fijo'),
  ],
  'redes-sociales-mes': [
    grupo('Redes', 'alcance', ['Facebook e Instagram', 'Facebook, Instagram y TikTok'], 'fijo'),
  ],
};
