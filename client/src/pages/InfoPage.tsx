import { PagePlaceholder } from '../components/PagePlaceholder';

export function InfoPage({ title }: { title: string }) {
  return (
    <PagePlaceholder title={title}>
      <p style={{ marginTop: 'var(--space-4)', color: 'var(--color-text-2)', maxWidth: '60ch' }}>
        Contenido pendiente: se redacta con la información real del negocio (tiempos, políticas y
        datos de contacto).
      </p>
    </PagePlaceholder>
  );
}
