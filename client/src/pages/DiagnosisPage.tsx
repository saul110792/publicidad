import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { diagnosisMessage, fairMeasurement, idealClient, team } from '../config/consulting';
import { usePageMeta } from '../lib/usePageMeta';
import { whatsappLink } from '../lib/whatsapp';
import styles from './DiagnosisPage.module.css';

const reviewed = [
  'Ventas',
  'Costos',
  'Margen',
  'Embudo comercial',
  'Precios',
  'Procesos',
  'Experiencia del cliente',
];

const timeline = [
  {
    when: '2–4 semanas',
    title: 'Diagnóstico',
    text: 'Recabamos tus datos, acordamos la línea base y encontramos las palancas de margen y crecimiento.',
  },
  {
    when: 'Al cierre',
    title: 'Propuesta',
    text: 'Te presentamos un caso de negocio por iniciativa: impacto esperado, costo y plazo.',
  },
  {
    when: '90 días',
    title: 'Piloto',
    text: 'Ejecutamos una o dos mejoras en tu cuenta: marketing, procesos, web, app o automatización.',
  },
  {
    when: 'Cada mes',
    title: 'Revisión y ajuste',
    text: 'Comparamos contra la línea base, escalamos lo que funciona y detenemos lo que no. Evaluación trimestral.',
  },
];

export function DiagnosisPage() {
  usePageMeta(
    'Diagnóstico',
    'Medimos dónde está tu negocio, encontramos fugas de rentabilidad y proponemos mejoras con un honorario ligado a la utilidad incremental.',
  );
  const wa = whatsappLink(diagnosisMessage);

  return (
    <>
      <section className={styles.heroWrap}>
        <div className={`container ${styles.hero}`}>
          <p className={styles.eyebrow}>Diagnóstico</p>
          <h1 className={styles.h1}>Primero medimos. Después proponemos.</h1>
          <p className={styles.lead}>
            En 2 a 4 semanas revisamos cómo gana dinero tu negocio, acordamos una línea base
            verificable y te decimos dónde vemos utilidad por recuperar o por crear.
          </p>
          <div className={styles.ctas}>
            <Button href={wa} variant="whatsapp" size="lg">
              <Icon name="whatsapp" size={22} />
              Solicitar diagnóstico
            </Button>
          </div>
        </div>
      </section>

      <div className={`container ${styles.page}`}>
        <section className={styles.section} aria-labelledby="revisamos">
          <h2 id="revisamos" className={styles.h2}>
            Qué revisamos
          </h2>
          <ul role="list" className={styles.chips}>
            {reviewed.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>

        <section className={styles.section} aria-labelledby="proceso">
          <h2 id="proceso" className={styles.h2}>
            Cómo es el proceso
          </h2>
          <ol role="list" className={styles.timeline}>
            {timeline.map((t) => (
              <li key={t.title} className={styles.tlItem}>
                <span className={styles.tlWhen}>{t.when}</span>
                <h3 className={styles.tlTitle}>{t.title}</h3>
                <p className={styles.text}>{t.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.section} aria-labelledby="necesitamos">
          <h2 id="necesitamos" className={styles.h2}>
            Qué necesitamos de ti
          </h2>
          <ul role="list" className={styles.checks}>
            {idealClient.map((c) => (
              <li key={c}>
                <Icon name="check" size={20} />
                {c}
              </li>
            ))}
          </ul>
          <p className={styles.note}>
            Si el negocio no tiene registros confiables, atraviesa una insolvencia severa o no puede
            atender más ventas, te lo diremos en el diagnóstico antes de proponer un contrato.
          </p>
        </section>

        <section id="medicion" className={styles.section} aria-labelledby="medicion-title">
          <h2 id="medicion-title" className={styles.h2}>
            Contrato y medición justa
          </h2>
          <p className={styles.text}>
            Nuestro honorario es un porcentaje acordado de la utilidad incremental, así que antes de
            empezar dejamos por escrito qué cuenta como resultado:
          </p>
          <ul role="list" className={styles.measure}>
            {fairMeasurement.map((m) => (
              <li key={m}>
                <Icon name="shield" size={20} />
                {m}
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.section} aria-labelledby="equipo">
          <h2 id="equipo" className={styles.h2}>
            Un equipo multidisciplinario
          </h2>
          <ul role="list" className={styles.team}>
            {team.map((t) => (
              <li key={t.title} className={`${styles.teamCard} ${styles[t.tone]}`}>
                <h3 className={styles.teamTitle}>{t.title}</h3>
                <p className={styles.text}>{t.text}</p>
              </li>
            ))}
          </ul>
          <p className={styles.text}>
            Un responsable de cuenta coordina a todos con un solo tablero de objetivos.
          </p>
        </section>

        <aside className={styles.cta} aria-labelledby="cta-title">
          <div>
            <h2 id="cta-title" className={styles.ctaTitle}>
              ¿Platicamos de tu negocio?
            </h2>
            <p className={styles.ctaText}>
              Cuéntanos tu giro y cuánto tiempo llevas operando. Te respondemos por WhatsApp.
            </p>
          </div>
          <Button href={wa} variant="whatsapp" size="lg">
            <Icon name="whatsapp" size={22} />
            Escríbenos por WhatsApp
          </Button>
        </aside>
      </div>
    </>
  );
}
