/**
 * Tipos del panel de admin. Todo el dinero en centavos; NULL = sin precio todavía
 * (la tienda muestra "$[PRECIO]").
 */
import type { Centavos } from './money';
import type { CartLineDTO, DeliveryMethod, PaymentMethod, PaymentState } from './cart';
import type { ModifierType } from './quote';
import type { OrderStatus } from './constants';

export type AdminMeDTO = { email: string };

// --- Catálogo ---

export type AdminCategory = {
  id: number;
  slug: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  totalProductos?: number;
};

export type AdminOption = {
  id?: number;
  label: string;
  modificador: number | null;
  tipoModificador: ModifierType;
  valorCantidad: number | null;
  esDefault: boolean;
};

export type AdminOptionGroup = {
  id?: number;
  nombre: string;
  clave: string;
  opciones: AdminOption[];
};

export type AdminTier = { cantidad: number; precioUnitario: Centavos };

export type AdminProductBase = {
  slug: string;
  categoryId: number;
  nombre: string;
  descripcion: string | null;
  imagenes: string[];
  precioBase: Centavos | null;
  unidad: string;
  cantidadMinima: number | null;
  tiempoEntregaDias: number | null;
  entregaRapida: boolean;
  incluyeDiseno: boolean;
  activo: boolean;
  giros: string[];
  popularidad: number;
  refPrefijo: string | null;
};

export type AdminProductRow = AdminProductBase & {
  id: number;
  categoria: string;
  /** Cuántas opciones del cotizador están sin costo definido. */
  opcionesSinPrecio: number;
};

/** Producto completo para editar: datos + grupos de opciones + escalas por cantidad. */
export type AdminProduct = AdminProductBase & {
  id?: number;
  grupos: AdminOptionGroup[];
  tiers: AdminTier[];
};

export type AdminPackageItem = {
  productId: number;
  etiqueta: string;
  cantidad: number | null;
  /** clave del grupo → texto de la opción, ej. { medida: "2 × 1 m" } */
  opcionesDefault: Record<string, string>;
};

export type AdminPackage = {
  id?: number;
  slug: string;
  nombre: string;
  giro: string | null;
  descripcion: string | null;
  precio: Centavos | null;
  destacado: boolean;
  recomendado: boolean;
  activo: boolean;
  orden: number;
  items: AdminPackageItem[];
};

export type AdminService = {
  id?: number;
  slug: string;
  nombre: string;
  descripcion: string | null;
  precioMensual: Centavos | null;
  orden: number;
};

// --- Pedidos ---

export type AdminOrderRow = {
  id: number;
  folio: string;
  createdAt: string;
  cliente: string;
  whatsapp: string;
  total: Centavos | null;
  estado: OrderStatus;
  estadoPago: PaymentState;
  metodoPago: PaymentMethod;
  entrega: DeliveryMethod;
  manual: boolean;
  packageUpgrade: boolean;
  refCode: string | null;
  canal: string;
};

export type AdminOrdersDTO = { pedidos: AdminOrderRow[]; total: number; pagina: number };

export type AdminOrderDetail = AdminOrderRow & {
  correo: string | null;
  giro: string | null;
  direccion: string | null;
  comoNosConocio: string | null;
  utm: { source: string | null; medium: string | null; campaign: string | null };
  subtotal: Centavos | null;
  envio: Centavos | null;
  lineas: CartLineDTO[];
  pagos: {
    proveedor: string;
    referencia: string;
    estado: PaymentState;
    monto: Centavos;
    fecha: string;
  }[];
  /** Lead de WhatsApp ligado (ref_code), si hay. */
  lead: { refCode: string; producto: string | null; fecha: string } | null;
  /** URL para el QR que va en el impreso entregado. */
  qrUrl: string;
};

export type AdminOrderUpdate = {
  estado?: OrderStatus;
  estadoPago?: PaymentState;
  /** Liga el pedido con un lead de WhatsApp. '' lo desliga. */
  refCode?: string;
};

/** Venta cerrada por WhatsApp que el admin captura a mano. */
export type ManualOrderRequest = {
  cliente: { nombre: string; whatsapp: string; correo?: string; giro?: string };
  items: {
    tipo: 'producto' | 'paquete';
    id: number;
    detalle: string;
    cantidad: number;
    total: Centavos;
  }[];
  envio: Centavos;
  metodoPago: PaymentMethod;
  entrega: DeliveryMethod;
  estadoPago: PaymentState;
  refCode?: string;
  comoNosConocio?: string;
};

export type AdminLeadRow = {
  id: number;
  refCode: string;
  producto: string | null;
  createdAt: string;
  canal: string;
  utmSource: string | null;
  folio: string | null;
};

// --- Métricas ---

export type MetricsDTO = {
  desde: string;
  hasta: string;
  ventas: { pedidos: number; total: Centavos; ticketPromedio: Centavos | null; porConfirmar: number };
  porCanal: { canal: string; pedidos: number; total: Centavos }[];
  porComoNosConocio: { origen: string; pedidos: number; total: Centavos }[];
  /** Sesiones únicas que llegaron a cada paso. */
  embudo: { paso: string; evento: string; sesiones: number }[];
  paquetes: {
    ofertasMostradas: number;
    ofertasAceptadas: number;
    pedidosConUpgrade: number;
    /** Clientes con compra suelta que después compraron un paquete. */
    sueltoAPaquete: number;
    clientesConCompraSuelta: number;
  };
  /** Productos que más aparecen en las ofertas aceptadas. */
  productosDeEntrada: { producto: string; upgrades: number }[];
  leads: { total: number; convertidos: number };
};
