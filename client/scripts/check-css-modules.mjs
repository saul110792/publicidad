/**
 * Revisa que las clases de CSS Modules que usan los componentes existan en su archivo CSS.
 *   - Error: el componente usa `styles.algo` y `.algo` no está en el .module.css (queda sin estilo).
 *   - Aviso: el .module.css define una clase que ningún componente usa (CSS muerto).
 *
 *   node client/scripts/check-css-modules.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** Clases que aparecen en los selectores (no en los valores) de un CSS. */
export function classesInCss(css) {
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const classes = new Set();
  let prelude = '';
  for (const ch of noComments) {
    if (ch === '{') {
      if (!prelude.trim().startsWith('@')) {
        for (const m of prelude.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) classes.add(m[1]);
      }
      prelude = '';
    } else if (ch === '}' || ch === ';') {
      prelude = '';
    } else {
      prelude += ch;
    }
  }
  return classes;
}

const files = walk(SRC).filter((f) => /\.(tsx|ts)$/.test(f));
const usedByCss = new Map(); // css → { classes usadas, acceso dinámico }
let errors = 0;

// Módulos que re-exportan un CSS Module (ej. admin/helpers.ts: `export { s as styles }`).
const reexports = new Map(); // archivo sin extensión → { exportName, cssPath }
for (const file of files) {
  const code = readFileSync(file, 'utf8');
  for (const m of code.matchAll(/import\s+(\w+)\s+from\s+'([^']+\.module\.css)'/g)) {
    const re = new RegExp(`export\\s*\\{[^}]*\\b${m[1]}\\s+as\\s+(\\w+)`).exec(code);
    if (re) {
      reexports.set(file.replace(/\.tsx?$/, ''), {
        exportName: re[1],
        cssPath: path.resolve(path.dirname(file), m[2]),
      });
    }
  }
}

/** Imports de CSS en un archivo: directos y a través de un re-export. */
function cssImports(file, code) {
  const out = [];
  for (const m of code.matchAll(/import\s+(\w+)\s+from\s+'([^']+\.module\.css)'/g)) {
    out.push({ name: m[1], cssPath: path.resolve(path.dirname(file), m[2]) });
  }
  for (const m of code.matchAll(/import\s*\{([^}]*)\}\s*from\s*'(\.[^']+)'/g)) {
    const target = reexports.get(path.resolve(path.dirname(file), m[2]));
    if (!target) continue;
    const spec = new RegExp(`\\b${target.exportName}(?:\\s+as\\s+(\\w+))?\\b`).exec(m[1]);
    if (spec) out.push({ name: spec[1] ?? target.exportName, cssPath: target.cssPath });
  }
  return out;
}

for (const file of files) {
  const code = readFileSync(file, 'utf8');
  for (const { name, cssPath } of cssImports(file, code)) {
    if (reexports.has(file.replace(/\.tsx?$/, ''))) continue; // el propio helpers.ts
    const defined = classesInCss(readFileSync(cssPath, 'utf8'));
    const entry = usedByCss.get(cssPath) ?? { used: new Set(), dynamic: false };
    usedByCss.set(cssPath, entry);

    for (const u of code.matchAll(new RegExp(`\\b${name}\\.([A-Za-z_]\\w*)`, 'g'))) {
      entry.used.add(u[1]);
      if (!defined.has(u[1])) {
        errors++;
        console.error(
          `✖ ${path.relative(SRC, file)}: ${name}.${u[1]} no existe en ${path.relative(SRC, cssPath)}`,
        );
      }
    }
    for (const u of code.matchAll(new RegExp(`\\b${name}\\[\\s*'([^']+)'\\s*\\]`, 'g'))) {
      entry.used.add(u[1]);
      if (!defined.has(u[1])) {
        errors++;
        console.error(
          `✖ ${path.relative(SRC, file)}: ${name}['${u[1]}'] no existe en ${path.relative(SRC, cssPath)}`,
        );
      }
    }
    // styles[variable]: no se puede verificar; se marca para no reportar clases "sin usar".
    if (new RegExp(`\\b${name}\\[(?!\\s*')`).test(code)) entry.dynamic = true;
  }
}

let warnings = 0;
for (const [cssPath, { used, dynamic }] of usedByCss) {
  if (dynamic) continue;
  const unused = [...classesInCss(readFileSync(cssPath, 'utf8'))].filter((c) => !used.has(c));
  for (const c of unused) {
    warnings++;
    console.warn(`⚠ ${path.relative(SRC, cssPath)}: .${c} no se usa`);
  }
}

console.log(
  `CSS Modules: ${usedByCss.size} archivos revisados · ${errors} errores · ${warnings} avisos`,
);
process.exit(errors ? 1 : 0);
