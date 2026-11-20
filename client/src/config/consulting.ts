/**
 * Contenido de la consultoría, tomado del plan de negocios de Ventas Medibles.
 * Solo lo que es para clientes: el reparto interno, las proyecciones y las metas no se publican.
 */
import type { IconName } from '../components/ui/Icon';

/** Acento de cada tarjeta (colores secundarios del plan). */
export type Tone = 'gold' | 'slate' | 'sage' | 'coral';

export const problems: { tone: Tone; title: string; text: string }[] = [
  {
    tone: 'gold',
    title: 'Baja visibilidad',
    text: 'Se mide la facturación, pero no siempre el margen por producto, canal, cliente o sucursal.',
  },
  {
    tone: 'slate',
    title: 'Ejecución fragmentada',
    text: 'Marketing, ventas, tecnología y operación trabajan con objetivos distintos.',
  },
  {
    tone: 'sage',
    title: 'Riesgo de inversión',
    text: 'Se pagan campañas y herramientas sin una forma clara de saber qué resultado dejaron.',
  },
];

export const answerSteps = [
  'Línea base',
  'Hipótesis de mejora',
  'Implementación',
  'Medición',
  'Ajuste',
];

export const services: { icon: IconName; tone: Tone; title: string; text: string }[] = [
  {
    icon: 'search',
    tone: 'gold',
    title: 'Diagnóstico',
    text: 'Ventas, costos, margen, embudo comercial, precios, procesos y experiencia del cliente.',
  },
  {
    icon: 'target',
    tone: 'slate',
    title: 'Estrategia comercial',
    text: 'Propuesta de valor, segmentación, precios, paquetes, retención y venta cruzada.',
  },
  {
    icon: 'megaphone',
    tone: 'sage',
    title: 'Marketing',
    text: 'Marca, diseño, contenidos, SEO, redes, campañas digitales, impresos y material en punto de venta.',
  },
  {
    icon: 'code',
    tone: 'gold',
    title: 'Tecnología',
    text: 'Sitios web, landing pages, comercio electrónico, CRM, automatización y aplicaciones móviles.',
  },
  {
    icon: 'cog',
    tone: 'slate',
    title: 'Operación',
    text: 'Mapeo de procesos, estandarización, tableros de indicadores y mejora de tiempos y mermas.',
  },
  {
    icon: 'scale',
    tone: 'sage',
    title: 'Legal y contable',
    text: 'Revisión contractual, estructura de cobro, cumplimiento, reportes y criterios de medición.',
  },
];

export const method: { title: string; text: string }[] = [
  { title: 'Medir', text: 'Recabamos datos y acordamos la línea base.' },
  { title: 'Diagnosticar', text: 'Encontramos las palancas de margen y crecimiento.' },
  { title: 'Priorizar', text: 'Caso de negocio con impacto, costo y plazo.' },
  { title: 'Implementar', text: 'Marketing, procesos, web, app o automatización.' },
  { title: 'Verificar', text: 'Comparamos resultados contra la línea base.' },
  { title: 'Optimizar', text: 'Escalamos lo que funciona y detenemos lo que no.' },
];

export const rhythm = [
  { value: '2–4 semanas', label: 'de diagnóstico' },
  { value: '90 días', label: 'de piloto' },
  { value: 'Mensual', label: 'revisión de avance' },
  { value: 'Trimestral', label: 'evaluación de resultados' },
];

export const comparison = {
  agency: [
    'Campañas y creatividad',
    'Gestión de pauta',
    'Sitios y contenidos',
    'Honorarios fijos o por proyecto',
  ],
  us: [
    'Diagnóstico de utilidad',
    'Intervención en ventas, operación y tecnología',
    'Resultados cuantificables',
    'Honorario ligado al incremento',
  ],
};

export const idealClient = [
  'Empresa establecida con ventas demostrables y al menos 12 meses de información histórica.',
  'Dueño o dirección dispuestos a compartir información financiera y comercial bajo confidencialidad.',
  'Margen positivo o palancas claras para recuperarlo, y capacidad para atender ventas adicionales.',
];

export const sectors = [
  'Servicios profesionales',
  'Comercio especializado',
  'Clínicas',
  'Restaurantes',
  'Educación privada',
  'Empresas B2B',
];

export const fairMeasurement = [
  'Definimos la utilidad a medir (de preferencia, utilidad operativa antes de impuestos) con un catálogo de costos e ingresos acordado.',
  'Comparamos periodos equivalentes y ajustamos por estacionalidad, inflación, cambios de precio, aperturas o cierres y eventos extraordinarios.',
  'Fijamos la atribución: qué iniciativas, desde qué fecha, con qué periodo de maduración y con qué fuentes de datos.',
  'Pactamos el acceso a punto de venta, CRM o ERP, estados de resultados, facturación y métricas publicitarias, con controles de privacidad.',
  'El contrato inicial es de 3 meses, con plazo de pago, terminación, confidencialidad y resolución de controversias por escrito.',
  'Si hay una diferencia importante entre las partes, la puede revisar un contador independiente.',
];

export const team: { tone: Tone; title: string; text: string }[] = [
  {
    tone: 'gold',
    title: 'Marketing',
    text: 'Demanda, posicionamiento, creatividad, pauta y conversión.',
  },
  {
    tone: 'slate',
    title: 'TI',
    text: 'Web, apps, automatización, analítica, CRM e integración de datos.',
  },
  {
    tone: 'sage',
    title: 'Contabilidad',
    text: 'Línea base financiera, costos, márgenes, conciliación y validación.',
  },
  {
    tone: 'coral',
    title: 'Legal',
    text: 'Contrato, privacidad, propiedad intelectual, términos y gestión de riesgo.',
  },
];

export const diagnosisMessage =
  'Hola, me interesa un diagnóstico de Ventas Medibles para mi negocio.';
