import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { Link } from 'react-router';
import styles from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'dark' | 'ghost-dark' | 'light';
type Size = 'md' | 'lg';

type BaseProps = {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  children: ReactNode;
  className?: string;
};

type AsButton = BaseProps & {
  to?: undefined;
  href?: undefined;
} & ComponentPropsWithoutRef<'button'>;
type AsLink = BaseProps & { to: string; href?: undefined };
type AsAnchor = BaseProps & { href: string; to?: undefined } & ComponentPropsWithoutRef<'a'>;

export type ButtonProps = AsButton | AsLink | AsAnchor;

export function Button(props: ButtonProps) {
  const { variant = 'primary', size = 'md', block = false, className, children } = props;
  const cls = [styles.btn, styles[variant], styles[size], block && styles.block, className]
    .filter(Boolean)
    .join(' ');

  if (props.to !== undefined) {
    return (
      <Link to={props.to} className={cls}>
        {children}
      </Link>
    );
  }

  if (props.href !== undefined) {
    const { variant: _v, size: _s, block: _b, className: _c, children: _ch, ...rest } = props;
    const external = /^https?:/.test(props.href);
    return (
      <a
        {...rest}
        className={cls}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {children}
      </a>
    );
  }

  const { variant: _v, size: _s, block: _b, className: _c, children: _ch, ...rest } = props;
  return (
    <button type="button" {...rest} className={cls}>
      {children}
    </button>
  );
}
