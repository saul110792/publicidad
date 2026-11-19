import type { ReactNode } from 'react';
import styles from './PagePlaceholder.module.css';

type Props = {
  title: string;
  phase?: number;
  children?: ReactNode;
};

/** Página provisional: marca qué sección se construye en qué fase. */
export function PagePlaceholder({ title, phase, children }: Props) {
  return (
    <section className={`container ${styles.wrap}`}>
      <h1 className={styles.title}>{title}</h1>
      {phase && <p className={styles.note}>Esta página se construye en la Fase {phase}.</p>}
      {children}
    </section>
  );
}
