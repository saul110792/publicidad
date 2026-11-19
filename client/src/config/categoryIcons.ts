import type { IconName } from '../components/ui/Icon';

export const categoryIcon: Record<string, IconName> = {
  impresos: 'impresos',
  'gran-formato': 'granFormato',
  promocionales: 'promocionales',
  'identidad-de-marca': 'identidad',
  digital: 'digital',
};

export function iconForCategory(slug: string): IconName {
  return categoryIcon[slug] ?? 'impresos';
}
