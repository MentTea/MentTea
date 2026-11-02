// Generates the project cards in assets/cards/. Edit the data below and run:
//   node scripts/build-cards.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'cards');

// 24×24 stroke icons
const ICONS = {
  doc:     'M6 2h9l5 5v15H6z M15 2v5h5 M9 12h8 M9 16h8 M9 20h5',
  shield:  'M12 2l8 3.5v6c0 5-3.4 8.6-8 10.5-4.6-1.9-8-5.5-8-10.5v-6z M8.5 12l2.5 2.5 4.5-5',
  nodes:   'M9.5 2.5h5v5h-5z M2.5 16.5h5v5h-5z M16.5 16.5h5v5h-5z M12 7.5v4.5 M5 16.5V12h14v4.5',
  chart:   'M3 21h18 M4 16l5-6 4 3 7-9 M15 4h5v5',
  radar:   'M12 3a9 9 0 1 0 9 9 M12 7a5 5 0 1 0 5 5 M12 12l7-7 M12 12h.01',
  globe:   'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18 M3 12h18 M12 3c3.2 3 3.2 15 0 18 M12 3c-3.2 3-3.2 15 0 18',
  check:   'M4 6l1.5 1.5L8 5 M4 12l1.5 1.5L8 11 M4 18l1.5 1.5L8 17 M11 6.5h9 M11 12.5h9 M11 18.5h9',
  spark:   'M12 3v4 M12 17v4 M3 12h4 M17 12h4 M6 6l2.5 2.5 M15.5 15.5L18 18 M6 18l2.5-2.5 M15.5 8.5L18 6',
  truck:   'M2 6h11v10H2z M13 10h4l4 4v2h-8z M6 19a2 2 0 1 0 0-.01 M17 19a2 2 0 1 0 0-.01',
};

const CARDS = [
  {
    file: 'document-ai.svg', icon: 'doc', label: 'ESTEM · MVP',
    title: 'Document Processing Platform',
    subtitle: 'Distributed · Document AI · OCR',
    text: 'Automated extraction, validation and normalisation of structured data from PDFs and scanned documents, end to end.',
    tags: ['Spring Boot', 'FastAPI', 'Document AI', 'Tesseract OCR'],
  },
  {
    file: 'credit-risk.svg', icon: 'shield', label: 'ESTEM · FINTECH',
    title: 'Credit Risk & Scoring',
    subtitle: 'Regulated · third-party integrations',
    text: 'Consumer credit risk assessment wired to credit bureaus, fraud prevention and sanctions screening, plus a credit management system with scoring.',
    tags: ['Spring Boot', 'Apache Camel', 'Keycloak', 'PostgreSQL'],
  },
  {
    file: 'microservices.svg', icon: 'nodes', label: 'ESTEM · ARCHITECTURE',
    title: 'Legacy → Microservices',
    subtitle: 'Service boundaries · integration contracts',
    text: 'Re-engineered legacy applications into microservices on Apache Camel with new REST APIs, defining service boundaries and contracts.',
    tags: ['Apache Camel', 'OpenAPI', 'RabbitMQ', 'Helm', 'K8s'],
  },
  {
    file: 'trading.svg', icon: 'chart', label: 'WIZARDSDEV · REAL-TIME',
    title: 'Trading & Crypto Exchanges',
    subtitle: 'High-load · real-time streaming',
    text: 'Backend for trading platforms and crypto exchanges: led broker API integrations (IBKR, Beaxy) for reliable real-time trading.',
    tags: ['WebFlux', 'RxJava', 'Kafka', 'WebSocket', 'Infinispan'],
  },
  {
    file: 'deal-radar.svg', icon: 'radar', label: 'PET PROJECT',
    title: 'DealRadar',
    subtitle: 'Marketplace watcher → Telegram',
    text: 'Define a search once in a guided Telegram dialog; the engine polls marketplaces, stores what is new and sends one digest per cycle.',
    tags: ['Spring Boot', 'PostgreSQL', 'Flyway', 'Telegram'],
  },
  {
    file: 'multi-scraper.svg', icon: 'globe', label: 'PET PROJECT',
    title: 'multi-scraper-service',
    subtitle: 'Stateless extraction gateway',
    text: 'Domain-agnostic FastAPI service: parsing rules for JSON and HTML arrive with each request, so no site is hardcoded.',
    tags: ['Python 3.12', 'FastAPI', 'curl_cffi', 'BS4', 'Docker'],
  },
];

const W = 480, H = 250, PAD = 28;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function wrap(text, max) {
  const lines = [''];
  for (const word of text.split(' ')) {
    const cur = lines[lines.length - 1];
    if ((cur + ' ' + word).trim().length > max) lines.push(word);
    else lines[lines.length - 1] = (cur + ' ' + word).trim();
  }
  return lines;
}

function card({ icon, label, title, subtitle, text, tags }) {
  const lines = wrap(text, 58).slice(0, 3);
  let x = PAD;
  const chips = tags.map((t) => {
    const w = Math.round(t.length * 7.4 + 22);
    const out = `<rect x="${x}" y="198" width="${w}" height="26" rx="13" fill="#3ddc97" fill-opacity=".1" stroke="#3ddc97" stroke-opacity=".35"/>` +
                `<text x="${x + w / 2}" y="215.5" text-anchor="middle" class="chip">${esc(t)}</text>`;
    x += w + 8;
    return out;
  });
  if (x - 8 > W - PAD) console.warn(`! tags overflow in "${title}": ${x - 8}px > ${W - PAD}px`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d">
  <title id="t">${esc(title)}</title>
  <desc id="d">${esc(text)} Tech: ${esc(tags.join(', '))}.</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0f2019"/><stop offset="1" stop-color="#08110d"/></linearGradient>
    <linearGradient id="tile" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9ff5c9"/><stop offset="1" stop-color="#22b8a6"/></linearGradient>
    <linearGradient id="edge" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3ddc97" stop-opacity="0"/><stop offset=".5" stop-color="#9ff5c9"/><stop offset="1" stop-color="#3ddc97" stop-opacity="0"/></linearGradient>
    <radialGradient id="glow" cx="1" cy="0" r="1"><stop offset="0" stop-color="#3ddc97" stop-opacity=".16"/><stop offset="1" stop-color="#3ddc97" stop-opacity="0"/></radialGradient>
    <clipPath id="c"><rect width="${W}" height="${H}" rx="18"/></clipPath>
  </defs>
  <style>
    .sans { font-family: 'Segoe UI', Inter, -apple-system, 'Helvetica Neue', Arial, sans-serif; }
    .chip { font-family: 'JetBrains Mono', 'Cascadia Code', Consolas, Menlo, monospace; font-size: 12px; font-weight: 600; fill: #9ff5c9; }
    .sweep { animation: sweep 5s ease-in-out infinite; }
    @keyframes sweep { 0% { transform: translateX(-${W}px); } 60%,100% { transform: translateX(${W}px); } }
  </style>
  <g clip-path="url(#c)">
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect width="${W}" height="${H}" fill="url(#glow)"/>
    <rect class="sweep" width="${W}" height="2" fill="url(#edge)"/>
  </g>
  <rect x=".75" y=".75" width="${W - 1.5}" height="${H - 1.5}" rx="17.5" fill="none" stroke="#1f3a2e" stroke-width="1.5"/>

  <rect x="${PAD}" y="${PAD}" width="48" height="48" rx="13" fill="url(#tile)"/>
  <path transform="translate(${PAD + 10} ${PAD + 10})" d="${ICONS[icon]}" fill="none" stroke="#0b1813" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>

  <text x="${PAD + 64}" y="${PAD + 10}" class="sans" font-size="10.5" font-weight="700" letter-spacing="1.4" fill="#f2b84b">${esc(label)}</text>
  <text x="${PAD + 64}" y="${PAD + 33}" class="sans" font-size="21" font-weight="700" fill="#eafaf2">${esc(title)}</text>
  <text x="${PAD + 64}" y="${PAD + 52}" class="sans" font-size="13.5" fill="#7fa894">${esc(subtitle)}</text>

  ${lines.map((l, i) => `<text x="${PAD}" y="${120 + i * 22}" class="sans" font-size="14.5" fill="#c7e6d6">${esc(l)}</text>`).join('\n  ')}

  ${chips.join('\n  ')}
</svg>
`;
}

fs.mkdirSync(OUT, { recursive: true });
for (const c of CARDS) {
  fs.writeFileSync(path.join(OUT, c.file), card(c));
  console.log('wrote', c.file);
}
