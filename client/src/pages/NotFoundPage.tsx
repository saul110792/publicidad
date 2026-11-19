import { PagePlaceholder } from '../components/PagePlaceholder';
import { Button } from '../components/ui/Button';
import { usePageMeta } from '../lib/usePageMeta';

export function NotFoundPage() {
  usePageMeta('Página no encontrada');
  return (
    <PagePlaceholder title="No encontramos esta página">
      <p style={{ marginBlock: 'var(--space-4) var(--space-6)', color: 'var(--color-text-2)' }}>
        Puede que el link esté mal escrito o que la página ya no exista.
      </p>
      <Button to="/">Volver al inicio</Button>
    </PagePlaceholder>
  );
}
