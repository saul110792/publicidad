import { useId, useState, type ChangeEvent } from 'react';
import { Icon } from '../../components/ui/Icon';
import styles from './DesignFile.module.css';

const ACCEPTED_EXT = ['pdf', 'ai', 'png', 'jpg', 'jpeg'];
const MAX_MB = 50;

type Props = { file: File | null; onChange: (file: File | null) => void };

/**
 * Selección del archivo de diseño. Por ahora solo se valida y se guarda en memoria;
 * la subida a almacenamiento (Cloudinary) se conecta con el carrito en la Fase 4.
 */
export function DesignFile({ file, onChange }: Props) {
  const inputId = useId();
  const hintId = useId();
  const [error, setError] = useState<string | null>(null);

  function handle(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    e.target.value = '';
    if (!f) return;
    const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ACCEPTED_EXT.includes(ext)) {
      setError('Formato no válido. Sube un PDF, AI, PNG o JPG.');
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`El archivo pesa más de ${MAX_MB} MB. Mándalo por WhatsApp.`);
      return;
    }
    setError(null);
    onChange(f);
  }

  if (file) {
    return (
      <div className={styles.selected}>
        <Icon name="check" size={20} />
        <span className={styles.fileName}>{file.name}</span>
        <button type="button" className={styles.remove} onClick={() => onChange(null)}>
          Quitar
        </button>
      </div>
    );
  }

  return (
    <div>
      <label htmlFor={inputId} className={styles.drop}>
        <Icon name="upload" size={24} />
        <span className={styles.dropTitle}>Sube tu archivo</span>
        <span id={hintId} className={styles.hint}>
          PDF, AI, PNG o JPG · máx. {MAX_MB} MB. También puedes mandarlo después por WhatsApp.
        </span>
      </label>
      <input
        id={inputId}
        type="file"
        accept=".pdf,.ai,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
        className="visually-hidden"
        aria-describedby={hintId}
        onChange={handle}
      />
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
