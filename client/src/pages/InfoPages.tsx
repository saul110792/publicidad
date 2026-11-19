import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { ProductCardDTO } from '@publicidad/shared';
import { Button } from '../components/ui/Button';
import { site } from '../config/site';
import { usePageMeta } from '../lib/usePageMeta';
import { useApi } from '../lib/useApi';
import { whatsappLink } from '../lib/whatsapp';
import styles from './InfoPages.module.css';

function InfoLayout({
  title,
  description,
  lead,
  children,
}: {
  title: string;
  description: string;
  lead?: ReactNode;
  children: ReactNode;
}) {
  usePageMeta(title, description);
  return (
    <article className={`container ${styles.page}`}>
      <header className={styles.header}>
        <h1 className={styles.h1}>{title}</h1>
        {lead && <p className={styles.lead}>{lead}</p>}
      </header>
      <div className={styles.body}>{children}</div>
      <aside className={styles.help} aria-label="Ayuda">
        <p>¿Te quedó alguna duda?</p>
        <Button href={whatsappLink('Hola, tengo una pregunta.')} variant="secondary">
          Escríbenos por WhatsApp
        </Button>
      </aside>
    </article>
  );
}

// --- Preguntas frecuentes ---

const FAQ: { q: string; a: ReactNode }[] = [
  {
    q: '¿Cómo cotizo?',
    a: (
      <>
        Entra al producto, elige cantidad, papel y acabados, y el precio se calcula al momento. Si
        prefieres, da clic en "Cotizar por WhatsApp": el mensaje ya lleva lo que elegiste y un
        código para darte seguimiento.
      </>
    ),
  },
  {
    q: '¿Necesito tener mi diseño listo?',
    a: (
      <>
        No. Puedes subir tu archivo o elegir "Quiero que me lo diseñen" y un diseñador te contacta
        para conocer tu negocio. Revisa <Link to="/preparar-archivo">cómo preparar tu archivo</Link>{' '}
        si ya lo tienes.
      </>
    ),
  },
  {
    q: '¿Veo el diseño antes de que se imprima?',
    a: 'Sí. Te mandamos una prueba digital por WhatsApp y no producimos nada sin tu aprobación.',
  },
  {
    q: '¿Cuánto tarda mi pedido?',
    a: (
      <>
        Depende del producto: revisa los <Link to="/tiempos-de-entrega">tiempos de entrega</Link>.
        El tiempo empieza a contar cuando apruebas la prueba digital.
      </>
    ),
  },
  {
    q: '¿Cómo puedo pagar?',
    a: 'Con tarjeta de crédito o débito en línea, por transferencia o SPEI, o en tienda dejando el 50% de anticipo para empezar.',
  },
  {
    q: '¿Hacen envíos?',
    a: `Puedes recoger tu pedido sin costo o pedir envío a domicilio en ${site.coverage}. El costo del envío se muestra al confirmar tu pedido o te lo confirmamos por WhatsApp.`,
  },
  {
    q: '¿Qué es un paquete por giro?',
    a: (
      <>
        Es un conjunto de piezas pensado para tu tipo de negocio (por ejemplo, restaurante o
        estética) que cuesta menos que comprarlas por separado. Si en tu carrito ya llevas varias
        piezas de un paquete, te lo ofrecemos antes de pagar.{' '}
        <Link to="/paquetes">Ver paquetes</Link>.
      </>
    ),
  },
  {
    q: '¿Emiten factura?',
    a: '[CONFIRMAR SI SE EMITE FACTURA Y CÓMO SOLICITARLA]',
  },
  {
    q: '¿Qué pasa si hay un error en mi pedido?',
    a: '[POLÍTICA DE CAMBIOS Y REIMPRESIONES]',
  },
];

export function FaqPage() {
  return (
    <InfoLayout
      title="Preguntas frecuentes"
      description="Cómo cotizar, pagar, recibir tu prueba digital y tu pedido de impresión o publicidad."
    >
      <div className={styles.faq}>
        {FAQ.map((f) => (
          <details key={f.q} className={styles.item}>
            <summary className={styles.summary}>{f.q}</summary>
            <div className={styles.answer}>{f.a}</div>
          </details>
        ))}
      </div>
    </InfoLayout>
  );
}

// --- Cómo preparar tu archivo ---

export function PrepareFilePage() {
  return (
    <InfoLayout
      title="Cómo preparar tu archivo"
      description="Formatos, resolución, color y rebase para que tu impreso salga como lo imaginas."
      lead="Si tu archivo no cumple algo de esto, no te preocupes: lo revisamos en la prueba digital y te avisamos antes de imprimir."
    >
      <section className={styles.section}>
        <h2 className={styles.h2}>Formato</h2>
        <ul className={styles.list}>
          <li>
            <strong>PDF</strong> (lo ideal), <strong>AI</strong>, <strong>PNG</strong> o{' '}
            <strong>JPG</strong>. Máximo 50 MB; si pesa más, mándalo por WhatsApp.
          </li>
          <li>
            Hazlo al tamaño real del impreso (una tarjeta, 9 × 5 cm; una lona de 2 × 1 m, esa
            medida).
          </li>
          <li>Convierte los textos a curvas o incrusta las fuentes para que no cambien.</li>
        </ul>
      </section>
      <section className={styles.section}>
        <h2 className={styles.h2}>Resolución</h2>
        <ul className={styles.list}>
          <li>
            Impresos chicos (tarjetas, flyers, menús): <strong>300 dpi</strong> al tamaño real.
          </li>
          <li>
            Gran formato (lonas, vinil): de <strong>100 a 150 dpi</strong> al tamaño real es
            suficiente, porque se ven de lejos.
          </li>
          <li>Una imagen bajada de internet o de WhatsApp casi siempre sale pixeleada.</li>
        </ul>
      </section>
      <section className={styles.section}>
        <h2 className={styles.h2}>Color</h2>
        <ul className={styles.list}>
          <li>
            Usa <strong>CMYK</strong>. Si mandas RGB lo convertimos, pero algunos colores muy
            brillantes se ven más apagados al imprimir.
          </li>
          <li>
            Los colores en pantalla nunca son idénticos al papel: cada monitor los muestra distinto.
          </li>
          <li>Para negro intenso en fondos grandes, pregúntanos antes.</li>
        </ul>
      </section>
      <section className={styles.section}>
        <h2 className={styles.h2}>Rebase y márgenes</h2>
        <ul className={styles.list}>
          <li>
            <strong>Rebase de 3 mm</strong>: si tu diseño llega hasta la orilla, extiende el fondo 3
            mm hacia afuera por cada lado. Ese sobrante se corta.
          </li>
          <li>
            <strong>Margen de seguridad de 3 a 5 mm</strong>: deja textos y logos a esa distancia de
            la orilla para que el corte no se los coma.
          </li>
        </ul>
      </section>
      <p className={styles.note}>
        ¿No tienes diseño? Elige "Quiero que me lo diseñen" en el cotizador y te ayudamos.{' '}
        <Link to="/productos">Ir a cotizar</Link>.
      </p>
    </InfoLayout>
  );
}

// --- Tiempos de entrega ---

export function DeliveryPage() {
  const { data, error } = useApi<ProductCardDTO[]>('/api/products?orden=entrega');
  return (
    <InfoLayout
      title="Tiempos de entrega"
      description="Cuánto tarda cada producto, desde que apruebas tu prueba digital."
      lead="Los días son hábiles y empiezan a contar cuando apruebas la prueba digital y, si aplica, recibimos tu pago o anticipo."
    >
      {error && <p className={styles.note}>No pudimos cargar la lista. {error}</p>}
      {data && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className="visually-hidden">Tiempo de entrega por producto</caption>
            <thead>
              <tr>
                <th scope="col">Producto</th>
                <th scope="col">Categoría</th>
                <th scope="col">Tiempo</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.slug}>
                  <th scope="row">
                    <Link to={`/producto/${p.slug}`}>{p.nombre}</Link>
                  </th>
                  <td>{p.categoria.nombre}</td>
                  <td>
                    {p.tiempoEntregaDias != null
                      ? `${p.tiempoEntregaDias} ${p.tiempoEntregaDias === 1 ? 'día hábil' : 'días hábiles'}`
                      : site.deliveryTime}
                    {p.entregaRapida && <span className={styles.badge}>Entrega rápida</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <section className={styles.section}>
        <h2 className={styles.h2}>Recoger o envío</h2>
        <ul className={styles.list}>
          <li>
            Recoger en tienda no tiene costo. Horario: {site.schedule}. Dirección: {site.address}.
          </li>
          <li>Envío a domicilio en {site.coverage}. Te avisamos por WhatsApp cuando salga.</li>
        </ul>
      </section>
    </InfoLayout>
  );
}

// --- Aviso de privacidad ---

export function PrivacyPage() {
  return (
    <InfoLayout
      title="Aviso de privacidad"
      description="Qué datos personales recabamos, para qué los usamos y cómo ejercer tus derechos ARCO."
      lead="Última actualización: [FECHA DE ACTUALIZACIÓN]."
    >
      <section className={styles.section}>
        <h2 className={styles.h2}>Responsable</h2>
        <p>
          [RAZÓN SOCIAL O NOMBRE DEL RESPONSABLE] ({site.brand}), con domicilio en {site.address},
          es responsable del tratamiento de tus datos personales conforme a la Ley Federal de
          Protección de Datos Personales en Posesión de los Particulares.
        </p>
      </section>
      <section className={styles.section}>
        <h2 className={styles.h2}>Datos que recabamos</h2>
        <ul className={styles.list}>
          <li>Nombre, número de WhatsApp y, si lo das, correo electrónico.</li>
          <li>Tipo de negocio y dirección de entrega cuando pides envío.</li>
          <li>Los archivos de diseño que nos compartes.</li>
          <li>
            Datos de navegación: páginas visitadas, productos vistos y la campaña por la que
            llegaste (UTM).
          </li>
        </ul>
        <p>
          No recabamos datos sensibles. Los datos de tu tarjeta los procesa directamente el
          proveedor de pagos; no los guardamos.
        </p>
      </section>
      <section className={styles.section}>
        <h2 className={styles.h2}>Para qué los usamos</h2>
        <p>
          <strong>Finalidades necesarias:</strong> cotizar, producir y entregar tu pedido, enviarte
          la prueba digital, cobrar y darte seguimiento por WhatsApp.
        </p>
        <p>
          <strong>Finalidades adicionales:</strong> enviarte ofertas de productos o paquetes
          relacionados con lo que compraste y medir cómo se usa el sitio para mejorarlo. Si no
          quieres que usemos tus datos para esto, escríbenos a {site.email}; no afecta tu pedido.
        </p>
      </section>
      <section className={styles.section}>
        <h2 className={styles.h2}>Con quién los compartimos</h2>
        <p>
          Solo con proveedores que nos ayudan a operar y que tratan los datos por nuestra cuenta:
          procesamiento de pagos (Mercado Pago), almacenamiento de archivos (Cloudinary),
          alojamiento del sitio (Render) y, si están activos, medición de visitas y anuncios (Google
          Analytics y Meta). No vendemos tus datos.
        </p>
      </section>
      <section className={styles.section}>
        <h2 className={styles.h2}>Cookies y tecnologías similares</h2>
        <p>
          Usamos almacenamiento del navegador para recordar tu carrito y la campaña por la que
          llegaste, y, si están activos, Google Analytics y el Pixel de Meta para medir visitas y
          anuncios. Puedes borrarlos o bloquearlos desde la configuración de tu navegador.
        </p>
      </section>
      <section className={styles.section}>
        <h2 className={styles.h2}>Tus derechos ARCO</h2>
        <p>
          Puedes acceder, rectificar, cancelar u oponerte al uso de tus datos, o revocar tu
          consentimiento, escribiendo a {site.email} con tu nombre, el dato o la solicitud y un
          medio para responderte. Te contestamos en un máximo de 20 días hábiles.
        </p>
      </section>
      <section className={styles.section}>
        <h2 className={styles.h2}>Cambios a este aviso</h2>
        <p>Cualquier cambio se publica en esta misma página con su fecha de actualización.</p>
      </section>
    </InfoLayout>
  );
}
