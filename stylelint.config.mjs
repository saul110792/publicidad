/** Validación de CSS (npm run lint:css). Base: stylelint-config-standard. */
export default {
  extends: ['stylelint-config-standard'],
  ignoreFiles: ['**/dist/**', '**/node_modules/**'],
  rules: {
    // CSS Modules: las clases van en camelCase (styles.catMedia) y algunas variantes con guion.
    'selector-class-pattern': [
      '^[a-z][a-zA-Z0-9]*(-[a-z0-9]+)*$',
      { message: 'Clases en camelCase (CSS Modules)' },
    ],
    // :global(...) y :export son de CSS Modules.
    'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['global', 'export'] }],
    // Los tokens llevan nombres descriptivos (--color-accent-on-dark).
    'custom-property-pattern': null,
    // Se usan valores numéricos explícitos en sombras y degradados (rgb(22 23 27 / 0.06)).
    'alpha-value-notation': null,
    'color-function-notation': 'modern',
    // Prettier ya formatea; evitamos choques de estilo.
    'declaration-empty-line-before': null,
    'no-descending-specificity': null,
    'media-feature-range-notation': null,
  },
};
