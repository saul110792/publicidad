/**
 * Genera las ilustraciones SVG de los productos (client/public/img/productos/*.svg).
 * Son propias (sin fotos de stock) y usan los colores de la marca. Cuando el negocio suba
 * fotos reales en el admin, esas tienen prioridad.
 *
 *   node client/scripts/generate-illustrations.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, '../public/img/productos');

const C = {
  ink: '#16171B',
  ink2: '#2B2C32',
  red: '#C8321F',
  redSoft: '#F7E3DE',
  paper: '#FFFFFF',
  cream: '#F5F3EE',
  line: '#DDD9D0',
  gray: '#9A968D',
  green: '#2F8F5B',
  blue: '#2E5E8C',
  sand: '#E9C46A',
};

/** Fondo por categoría: degradado suave + dos círculos decorativos. */
const BG = {
  impresos: ['#F6E7DD', '#EFD8C8'],
  'gran-formato': ['#E3EAF1', '#CFDBE7'],
  promocionales: ['#F1E8D6', '#E6D6B6'],
  'identidad-de-marca': ['#ECE4F0', '#DCCDE6'],
  digital: ['#E2F0E8', '#CBE3D5'],
};

const FONT = `font-family="Archivo, 'Segoe UI', Roboto, Arial, sans-serif"`;

function svg(cat, body) {
  const [a, b] = BG[cat];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>
<filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#16171B" flood-opacity=".18"/></filter>
<filter id="sh2" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#16171B" flood-opacity=".16"/></filter>
</defs>
<rect width="800" height="600" fill="url(#bg)"/>
<circle cx="690" cy="90" r="150" fill="#fff" opacity=".28"/>
<circle cx="90" cy="540" r="190" fill="#fff" opacity=".22"/>
${body}
</svg>`;
}

// --- Piezas reutilizables ---

const lines = (x, y, w, n, gap = 18, color = C.line, h = 8) =>
  Array.from(
    { length: n },
    (_, i) =>
      `<rect x="${x}" y="${y + i * gap}" width="${i === n - 1 ? w * 0.6 : w}" height="${h}" rx="${h / 2}" fill="${color}"/>`,
  ).join('');

/** Marca genérica: cuadro rojo + barra (no es el logo de nadie). */
const mark = (x, y, s = 1, color = C.red) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><rect width="34" height="34" rx="8" fill="${color}"/><rect x="9" y="9" width="16" height="16" rx="3" fill="#fff" opacity=".9"/></g>`;

const card = (x, y, w, h, rot, fill, inner = '', filter = 'sh') =>
  `<g transform="rotate(${rot} ${x + w / 2} ${y + h / 2})" filter="url(#${filter})"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${fill}"/>${inner}</g>`;

const text = (x, y, size, content, color = C.ink, weight = 800, anchor = 'start') =>
  `<text x="${x}" y="${y}" ${FONT} font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}">${content}</text>`;

// --- Escenas por producto ---

const scenes = {
  'tarjetas-de-presentacion': () =>
    svg(
      'impresos',
      card(170, 250, 340, 200, -8, C.paper, mark(200, 290) + lines(200, 360, 180, 3)) +
        card(
          300,
          170,
          340,
          200,
          6,
          C.ink,
          mark(560, 200) +
            text(330, 300, 30, 'Tu negocio', '#fff') +
            lines(330, 325, 160, 2, 18, '#55575f'),
        ) +
        card(
          250,
          380,
          340,
          200,
          -2,
          C.red,
          text(280, 470, 26, 'Hola', '#fff') + lines(280, 500, 140, 2, 18, '#e9a597'),
          'sh2',
        ),
    ),

  flyers: () =>
    svg(
      'impresos',
      card(
        150,
        110,
        260,
        370,
        -7,
        C.paper,
        `<rect x="170" y="130" width="220" height="150" rx="6" fill="${C.redSoft}"/><circle cx="280" cy="205" r="46" fill="${C.red}"/>` +
          text(170, 320, 30, 'PROMO') +
          lines(170, 340, 200, 4),
      ) +
        card(
          380,
          90,
          260,
          370,
          6,
          C.red,
          text(405, 180, 46, '2x1', '#fff') +
            text(405, 225, 20, 'Solo este mes', '#fff', 600) +
            `<rect x="405" y="380" width="120" height="40" rx="20" fill="#fff"/>` +
            text(465, 407, 16, 'Visítanos', C.red, 700, 'middle'),
        ),
    ),

  menus: () =>
    svg(
      'impresos',
      card(
        200,
        80,
        400,
        470,
        -3,
        C.paper,
        text(400, 150, 38, 'Menú', C.ink, 800, 'middle') +
          `<rect x="330" y="168" width="140" height="4" rx="2" fill="${C.red}"/>` +
          [0, 1, 2, 3, 4]
            .map(
              (i) =>
                `<rect x="250" y="${215 + i * 60}" width="200" height="10" rx="5" fill="${C.ink2}"/><rect x="250" y="${233 + i * 60}" width="150" height="7" rx="3.5" fill="${C.line}"/><rect x="510" y="${213 + i * 60}" width="40" height="12" rx="6" fill="${C.red}"/>`,
            )
            .join(''),
      ),
    ),

  talonarios: () =>
    svg(
      'impresos',
      card(240, 120, 320, 400, 4, '#FFF8E6', '', 'sh2') +
        card(
          225,
          105,
          320,
          400,
          -2,
          C.paper,
          mark(255, 135, 0.9) +
            text(300, 160, 22, 'Nota de venta') +
            `<rect x="430" y="140" width="90" height="26" rx="4" fill="${C.redSoft}"/>` +
            text(475, 159, 15, 'N.º 0125', C.red, 700, 'middle') +
            [0, 1, 2, 3, 4, 5]
              .map(
                (i) =>
                  `<line x1="255" y1="${220 + i * 38}" x2="515" y2="${220 + i * 38}" stroke="${C.line}" stroke-width="2"/>`,
              )
              .join('') +
            `<line x1="420" y1="200" x2="420" y2="410" stroke="${C.line}" stroke-width="2"/>`,
        ) +
        `<g filter="url(#sh2)"><rect x="540" y="380" width="18" height="150" rx="6" transform="rotate(30 549 455)" fill="${C.blue}"/></g>`,
    ),

  recetarios: () =>
    svg(
      'impresos',
      card(
        230,
        90,
        340,
        440,
        -3,
        C.paper,
        `<rect x="230" y="90" width="340" height="80" rx="10" fill="${C.blue}"/>` +
          text(260, 140, 24, 'Consultorio', '#fff') +
          `<g fill="${C.blue}"><rect x="510" y="112" width="12" height="40" rx="3" fill="#fff"/><rect x="496" y="126" width="40" height="12" rx="3" fill="#fff"/></g>` +
          text(260, 215, 40, 'Rx', C.blue) +
          lines(260, 250, 260, 6, 30),
      ),
    ),

  'tarjetas-de-cita': () =>
    svg(
      'impresos',
      card(
        160,
        200,
        330,
        200,
        -6,
        C.paper,
        text(190, 250, 22, 'Tu próxima cita') +
          [0, 1, 2]
            .map(
              (i) =>
                `<rect x="190" y="${275 + i * 34}" width="80" height="22" rx="4" fill="${C.cream}"/><rect x="290" y="${275 + i * 34}" width="80" height="22" rx="4" fill="${C.cream}"/>`,
            )
            .join(''),
      ) +
        card(
          330,
          170,
          330,
          200,
          5,
          C.red,
          text(360, 220, 22, 'Tarjeta de lealtad', '#fff') +
            [0, 1, 2, 3, 4]
              .map(
                (i) =>
                  `<circle cx="${385 + i * 55}" cy="300" r="20" fill="${i < 3 ? '#fff' : 'none'}" stroke="#fff" stroke-width="3"/>`,
              )
              .join(''),
        ),
    ),

  etiquetas: () =>
    svg(
      'impresos',
      card(
        170,
        100,
        460,
        400,
        -3,
        C.paper,
        [0, 1, 2]
          .flatMap((r) =>
            [0, 1, 2].map((c) => {
              const cx = 250 + c * 150;
              const cy = 175 + r * 125;
              const fill = (r + c) % 3 === 0 ? C.red : (r + c) % 3 === 1 ? C.ink : C.sand;
              return `<circle cx="${cx}" cy="${cy}" r="52" fill="${fill}"/><circle cx="${cx}" cy="${cy}" r="40" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="4 5"/>${mark(cx - 13, cy - 13, 0.75, '#fff')}`;
            }),
          )
          .join(''),
      ),
    ),

  lonas: () =>
    svg(
      'gran-formato',
      `<rect x="120" y="470" width="560" height="14" rx="7" fill="${C.ink2}" opacity=".25"/>` +
        `<g filter="url(#sh)"><rect x="120" y="140" width="560" height="280" rx="6" fill="${C.red}"/>` +
        [140, 410]
          .flatMap((y) =>
            [140, 400, 660].map(
              (x) =>
                `<circle cx="${x}" cy="${y}" r="8" fill="#fff" stroke="${C.ink2}" stroke-width="3"/>`,
            ),
          )
          .join('') +
        text(400, 270, 64, '¡ABRIMOS!', '#fff', 900, 'middle') +
        text(400, 325, 26, 'Ven a conocernos', '#fff', 600, 'middle') +
        `</g>` +
        `<line x1="140" y1="140" x2="100" y2="80" stroke="${C.ink2}" stroke-width="3"/><line x1="660" y1="140" x2="700" y2="80" stroke="${C.ink2}" stroke-width="3"/>`,
    ),

  'vinil-vitrina': () =>
    svg(
      'gran-formato',
      `<g filter="url(#sh)"><rect x="140" y="90" width="520" height="430" rx="8" fill="${C.ink2}"/><rect x="160" y="110" width="480" height="390" rx="4" fill="#BFD3E6"/>` +
        `<path d="M160 110 L330 110 L160 330 Z" fill="#fff" opacity=".35"/><path d="M380 500 L640 160 L640 260 L460 500 Z" fill="#fff" opacity=".2"/>` +
        text(400, 250, 52, 'ABIERTO', C.red, 900, 'middle') +
        text(400, 300, 22, 'Lun a Sáb · 9 a 19 h', C.ink, 700, 'middle') +
        `<rect x="300" y="340" width="200" height="56" rx="28" fill="${C.red}"/>` +
        text(400, 376, 22, '20% OFF', '#fff', 800, 'middle') +
        `</g>`,
    ),

  'letrero-exterior': () =>
    svg(
      'gran-formato',
      `<rect x="0" y="430" width="800" height="170" fill="${C.ink2}" opacity=".12"/>` +
        `<g filter="url(#sh)"><rect x="150" y="150" width="500" height="150" rx="14" fill="${C.ink}"/>` +
        mark(190, 205, 1.2) +
        text(260, 245, 44, 'Tu negocio', '#fff') +
        text(262, 275, 18, 'Desde 2026', '#bdbab3', 600) +
        `</g>` +
        `<rect x="250" y="300" width="14" height="190" fill="${C.ink2}"/><rect x="536" y="300" width="14" height="190" fill="${C.ink2}"/>` +
        `<g fill="${C.sand}" opacity=".9"><circle cx="200" cy="140" r="8"/><circle cx="400" cy="140" r="8"/><circle cx="600" cy="140" r="8"/></g>`,
    ),

  'rotulacion-vehicular': () =>
    svg(
      'gran-formato',
      `<rect x="80" y="470" width="640" height="14" rx="7" fill="${C.ink2}" opacity=".25"/>` +
        `<g filter="url(#sh)"><path d="M110 430 V250 Q110 200 160 200 H480 L600 280 H660 Q700 280 700 320 V430 Z" fill="#fff"/>` +
        `<path d="M490 215 L585 280 H490 Z" fill="#9FB8CE"/><rect x="110" y="330" width="590" height="40" fill="${C.red}"/>` +
        mark(140, 230, 1.1) +
        text(195, 265, 34, 'Tu negocio') +
        text(140, 315, 18, 'Servicio a domicilio', C.gray, 600) +
        text(140, 358, 22, 'Pide por WhatsApp', '#fff', 700) +
        `</g><circle cx="230" cy="435" r="42" fill="${C.ink}"/><circle cx="230" cy="435" r="18" fill="${C.gray}"/><circle cx="580" cy="435" r="42" fill="${C.ink}"/><circle cx="580" cy="435" r="18" fill="${C.gray}"/>`,
    ),

  playeras: () =>
    svg(
      'promocionales',
      `<g filter="url(#sh)"><path d="M280 120 L340 100 Q400 140 460 100 L520 120 L620 190 L570 270 L520 240 V500 H280 V240 L230 270 L180 190 Z" fill="${C.ink}"/>` +
        `<path d="M340 100 Q400 150 460 100" fill="none" stroke="${C.ink2}" stroke-width="10"/>` +
        mark(373, 230, 1.6) +
        text(400, 340, 22, 'TU MARCA', '#fff', 800, 'middle') +
        `</g>`,
    ),

  uniformes: () =>
    svg(
      'promocionales',
      `<g filter="url(#sh)"><path d="M280 120 L350 100 L400 150 L450 100 L520 120 L620 190 L570 270 L520 240 V500 H280 V240 L230 270 L180 190 Z" fill="#fff"/>` +
        `<path d="M350 100 L400 150 L450 100 L430 95 L400 125 L370 95 Z" fill="${C.red}"/><line x1="400" y1="150" x2="400" y2="230" stroke="${C.line}" stroke-width="3"/>` +
        `<circle cx="400" cy="175" r="5" fill="${C.line}"/><circle cx="400" cy="205" r="5" fill="${C.line}"/>` +
        mark(445, 200, 0.9) +
        `</g>`,
    ),

  bolsas: () =>
    svg(
      'promocionales',
      card(
        170,
        200,
        260,
        300,
        -5,
        '#D9B98C',
        `<path d="M240 200 Q240 130 300 130 Q360 130 360 200" fill="none" stroke="#8a6a3f" stroke-width="10"/>` +
          mark(278, 300, 1.3, C.ink) +
          text(300, 400, 20, 'Gracias por tu compra', C.ink, 700, 'middle'),
      ) +
        card(
          380,
          170,
          250,
          320,
          6,
          C.red,
          `<path d="M450 170 Q450 105 505 105 Q560 105 560 170" fill="none" stroke="${C.ink}" stroke-width="10"/>` +
            mark(483, 280, 1.3, '#fff') +
            text(505, 380, 22, 'TU MARCA', '#fff', 800, 'middle'),
        ),
    ),

  logotipo: () =>
    svg(
      'identidad-de-marca',
      card(
        150,
        110,
        500,
        380,
        -2,
        C.paper,
        `<circle cx="300" cy="260" r="70" fill="${C.red}"/><rect x="265" y="225" width="70" height="70" rx="12" fill="#fff"/>` +
          text(400, 245, 38, 'Tu marca') +
          text(400, 280, 18, 'Propuesta A', C.gray, 600) +
          [C.red, C.ink, C.sand, C.cream]
            .map(
              (c, i) =>
                `<rect x="${200 + i * 70}" y="380" width="56" height="56" rx="10" fill="${c}" stroke="${C.line}"/>`,
            )
            .join('') +
          text(500, 420, 16, 'Paleta de color', C.gray, 600),
      ) +
        `<g filter="url(#sh2)"><rect x="560" y="400" width="18" height="160" rx="6" transform="rotate(-35 569 480)" fill="${C.ink}"/></g>`,
    ),

  'perfil-instagram': () =>
    svg(
      'identidad-de-marca',
      phone(
        280,
        `<circle cx="345" cy="150" r="30" fill="url(#ig)"/><circle cx="345" cy="150" r="24" fill="${C.red}"/>` +
          text(390, 145, 16, 'tumarca', C.ink, 800) +
          text(390, 165, 12, 'Negocio local', C.gray, 600) +
          [0, 1, 2]
            .flatMap((r) =>
              [0, 1, 2].map(
                (c) =>
                  `<rect x="${308 + c * 64}" y="${200 + r * 64}" width="60" height="60" rx="4" fill="${[C.red, C.ink, C.sand, C.redSoft, C.blue][(r * 3 + c) % 5]}"/>`,
              ),
            )
            .join(''),
        `<linearGradient id="ig" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#F2A93B"/><stop offset=".5" stop-color="#D6336C"/><stop offset="1" stop-color="#7B3FC4"/></linearGradient>`,
      ),
    ),

  'google-maps': () =>
    svg(
      'digital',
      phone(
        280,
        `<rect x="302" y="110" width="196" height="230" fill="#E8EEE6"/>` +
          `<path d="M302 200 H498 M380 110 V340 M302 290 L498 150" stroke="#fff" stroke-width="12"/>` +
          `<path d="M400 170 C380 170 368 186 368 202 C368 228 400 258 400 258 C400 258 432 228 432 202 C432 186 420 170 400 170 Z" fill="${C.red}"/><circle cx="400" cy="202" r="11" fill="#fff"/>` +
          text(310, 370, 16, 'Tu negocio', C.ink, 800) +
          text(310, 392, 13, '★★★★★  4.9', '#C58A00', 700) +
          lines(310, 410, 170, 2, 16, C.line, 7),
      ),
    ),

  'landing-page': () => svg('digital', laptop(landingScreen('Tu negocio en línea'))),
  'landing-agenda': () =>
    svg(
      'digital',
      laptop(
        text(260, 200, 22, 'Agenda tu cita') +
          [0, 1, 2, 3, 4]
            .flatMap((r) =>
              [0, 1, 2, 3, 4, 5, 6].map(
                (c) =>
                  `<rect x="${260 + c * 40}" y="${220 + r * 30}" width="32" height="22" rx="4" fill="${r === 2 && c === 3 ? C.red : C.cream}"/>`,
              ),
            )
            .join(''),
      ),
    ),
  'catalogo-web': () =>
    svg(
      'digital',
      laptop(
        text(260, 195, 20, 'Catálogo') +
          [0, 1, 2]
            .map(
              (i) =>
                `<rect x="${260 + i * 95}" y="215" width="85" height="80" rx="6" fill="${[C.redSoft, '#E3EAF1', '#F1E8D6'][i]}"/><rect x="${260 + i * 95}" y="302" width="60" height="8" rx="4" fill="${C.ink2}"/><rect x="${260 + i * 95}" y="316" width="40" height="8" rx="4" fill="${C.red}"/>`,
            )
            .join(''),
      ),
    ),

  'redes-sociales-mes': () =>
    svg(
      'digital',
      card(
        150,
        140,
        240,
        300,
        -7,
        C.paper,
        `<rect x="165" y="155" width="210" height="200" rx="6" fill="${C.red}"/>` +
          text(270, 270, 30, 'Promo', '#fff', 800, 'middle') +
          lines(165, 375, 180, 2, 18),
      ) +
        card(
          410,
          120,
          240,
          300,
          6,
          C.paper,
          `<rect x="425" y="135" width="210" height="200" rx="6" fill="${C.ink}"/>` +
            text(530, 245, 26, 'Nuevo', '#fff', 800, 'middle') +
            lines(425, 355, 180, 2, 18),
        ) +
        `<g filter="url(#sh2)"><circle cx="560" cy="470" r="44" fill="#fff"/><path d="M542 468 l12 12 l24 -26" fill="none" stroke="${C.green}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></g>` +
        `<g filter="url(#sh2)"><rect x="200" y="455" width="150" height="50" rx="25" fill="#fff"/>` +
        text(275, 487, 18, '♥ 1,248', C.red, 800, 'middle') +
        `</g>`,
    ),
};

function phone(x, screen, defs = '') {
  return `<defs>${defs}</defs><g filter="url(#sh)"><rect x="${x}" y="70" width="240" height="470" rx="34" fill="${C.ink}"/><rect x="${x + 14}" y="90" width="212" height="430" rx="22" fill="#fff"/><rect x="${x + 90}" y="98" width="60" height="8" rx="4" fill="${C.ink}"/>${screen}</g>`;
}

function laptop(screen) {
  return `<g filter="url(#sh)"><rect x="210" y="120" width="380" height="250" rx="14" fill="${C.ink}"/><rect x="226" y="136" width="348" height="218" rx="4" fill="#fff"/>${screen}<path d="M150 380 H650 L620 410 H180 Z" fill="${C.ink2}"/></g>`;
}

function landingScreen(title) {
  return (
    `<rect x="226" y="136" width="348" height="30" fill="${C.cream}"/>` +
    mark(240, 143, 0.5) +
    lines(470, 147, 90, 1, 0, C.line, 7) +
    text(250, 215, 24, title) +
    lines(250, 235, 180, 2, 16) +
    `<rect x="250" y="285" width="110" height="34" rx="17" fill="${C.red}"/>` +
    `<rect x="420" y="190" width="130" height="130" rx="8" fill="${C.redSoft}"/><circle cx="485" cy="255" r="34" fill="${C.red}"/>`
  );
}

mkdirSync(OUT, { recursive: true });
for (const [slug, make] of Object.entries(scenes)) {
  const out = make().replace(/\n+/g, '\n');
  writeFileSync(path.join(OUT, `${slug}.svg`), out);
}
console.log(`${Object.keys(scenes).length} ilustraciones en ${path.relative(process.cwd(), OUT)}`);
