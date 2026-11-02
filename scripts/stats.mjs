// Builds dist/stats.svg from the GitHub GraphQL API. No dependencies, Node 20+.
//   GH_TOKEN=... GH_USER=MentTea node scripts/stats.mjs
// GITHUB_TOKEN from Actions sees public data only. Set a METRICS_TOKEN secret
// (classic PAT: read:user + repo) to include private repos in the language chart.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TOKEN = process.env.GH_TOKEN;
const USER = process.env.GH_USER || 'MentTea';
// the profile repo's own scripts shouldn't count as a language
const SELF = (process.env.GITHUB_REPOSITORY || '').split('/')[1] || 'github-profile';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
if (!TOKEN) throw new Error('GH_TOKEN is not set');

async function gql(query, variables = {}) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { authorization: `bearer ${TOKEN}`, 'content-type': 'application/json', 'user-agent': 'menttea-stats' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

// ─── fetch ───────────────────────────────────────────────────────────────────

const { user } = await gql(`query($login: String!) {
  user(login: $login) {
    createdAt
    followers { totalCount }
    pullRequests { totalCount }
    issues { totalCount }
    repositories(ownerAffiliations: OWNER, isFork: false, first: 100) {
      totalCount
      nodes {
        name
        stargazerCount
        languages(first: 10, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name color } } }
      }
    }
  }
}`, { login: USER });

const days = [];
let commitsThisYear = 0;
const thisYear = new Date().getUTCFullYear();
for (let y = new Date(user.createdAt).getUTCFullYear(); y <= thisYear; y++) {
  const { user: u } = await gql(`query($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        totalCommitContributions
        restrictedContributionsCount
        contributionCalendar { weeks { contributionDays { date contributionCount } } }
      }
    }
  }`, { login: USER, from: `${y}-01-01T00:00:00Z`, to: `${y}-12-31T23:59:59Z` });
  const c = u.contributionsCollection;
  for (const w of c.contributionCalendar.weeks) days.push(...w.contributionDays);
  if (y === thisYear) commitsThisYear = c.totalCommitContributions + c.restrictedContributionsCount;
}

// ─── derive ──────────────────────────────────────────────────────────────────

const today = new Date().toISOString().slice(0, 10);
const past = days.filter((d) => d.date <= today).sort((a, b) => a.date.localeCompare(b.date));
const totalContributions = past.reduce((s, d) => s + d.contributionCount, 0);

let longest = 0, run = 0;
for (const d of past) { run = d.contributionCount > 0 ? run + 1 : 0; longest = Math.max(longest, run); }
// today without contributions yet doesn't break the streak
let current = 0;
for (let i = past.length - 1; i >= 0; i--) {
  if (past[i].contributionCount > 0) current++;
  else if (i === past.length - 1) continue;
  else break;
}

const weeks = [];
for (let i = Math.max(0, past.length - 52 * 7); i < past.length; i += 7) {
  weeks.push(past.slice(i, i + 7).reduce((s, d) => s + d.contributionCount, 0));
}

const langs = new Map();
for (const r of user.repositories.nodes) {
  if (r.name === SELF) continue;
  for (const e of r.languages.edges) {
    const l = langs.get(e.node.name) || { size: 0, color: e.node.color };
    l.size += e.size;
    langs.set(e.node.name, l);
  }
}
const langTotal = [...langs.values()].reduce((s, l) => s + l.size, 0) || 1;
const topLangs = [...langs.entries()].sort((a, b) => b[1].size - a[1].size).slice(0, 5)
  .map(([name, l]) => ({ name, color: l.color || '#3ddc97', pct: (l.size / langTotal) * 100 }));

const stars = user.repositories.nodes.reduce((s, r) => s + r.stargazerCount, 0);
const years = Math.max(1, Math.floor((Date.now() - new Date(user.createdAt)) / (365.25 * 864e5)));

// ─── render ──────────────────────────────────────────────────────────────────

const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k' : String(n));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const W = 1000, H = 430;

const tiles = [
  ['Contributions', fmt(totalContributions), 'all time'],
  [`Commits ${thisYear}`, fmt(commitsThisYear), 'incl. private'],
  ['Pull requests', fmt(user.pullRequests.totalCount), 'opened'],
  ['Repositories', fmt(user.repositories.totalCount), 'owned'],
  ['Stars earned', fmt(stars), 'across repos'],
  ['On GitHub', `${years}y`, `since ${new Date(user.createdAt).getUTCFullYear()}`],
].map(([label, value, hint], i) => {
  const x = 24 + (i % 3) * 148, y = 64 + Math.floor(i / 3) * 86;
  return `<g class="up" style="animation-delay:${(0.1 + i * 0.08).toFixed(2)}s">
    <rect x="${x}" y="${y}" width="136" height="74" rx="12" fill="#0b1813" stroke="#1f3a2e"/>
    <text x="${x + 14}" y="${y + 22}" class="lbl">${esc(label)}</text>
    <text x="${x + 14}" y="${y + 50}" class="num">${esc(value)}</text>
    <text x="${x + 14}" y="${y + 65}" class="hint">${esc(hint)}</text>
  </g>`;
}).join('\n  ');

const R = 58, C = 2 * Math.PI * R;
const ratio = longest ? Math.min(1, current / longest) : 0;
const ring = `
  <g transform="translate(600 140)">
    <circle r="${R}" fill="none" stroke="#10211a" stroke-width="12"/>
    <circle r="${R}" fill="none" stroke="url(#mint)" stroke-width="12" stroke-linecap="round"
            stroke-dasharray="${(C * ratio).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90)" class="ring" opacity="${ratio ? 1 : 0}"
            style="--len:${(C * ratio).toFixed(1)}"/>
    <text y="8" text-anchor="middle" class="big">${current}</text>
    <text y="30" text-anchor="middle" class="hint">day streak</text>
  </g>
  <text x="600" y="232" text-anchor="middle" class="lbl">Longest: <tspan class="hl">${longest} days</tspan></text>`;

const bars = topLangs.map((l, i) => {
  const y = 74 + i * 34, w = Math.max(4, (l.pct / 100) * 220);
  return `<g class="up" style="animation-delay:${(0.3 + i * 0.08).toFixed(2)}s">
    <circle cx="${734}" cy="${y - 4}" r="5" fill="${l.color}"/>
    <text x="746" y="${y}" class="lang">${esc(l.name)}</text>
    <text x="976" y="${y}" text-anchor="end" class="pct">${l.pct.toFixed(1)}%</text>
    <rect x="730" y="${y + 8}" width="246" height="6" rx="3" fill="#10211a"/>
    <rect x="730" y="${y + 8}" width="${(w * 246 / 220).toFixed(1)}" height="6" rx="3" fill="url(#mint)" class="grow"/>
  </g>`;
}).join('\n  ');

// weekly area chart
const cx0 = 24, cx1 = W - 24, cy0 = 300, cy1 = 404;
const max = Math.max(1, ...weeks);
const pts = weeks.map((v, i) => [cx0 + (i / Math.max(1, weeks.length - 1)) * (cx1 - cx0), cy1 - (v / max) * (cy1 - cy0)]);
const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
const area = `${line} L${cx1} ${cy1} L${cx0} ${cy1} Z`;
const peak = pts[weeks.indexOf(max)];

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d">
  <title id="t">${esc(USER)} · GitHub activity</title>
  <desc id="d">${totalContributions} contributions all time, ${commitsThisYear} commits in ${thisYear}, current streak ${current} days, longest ${longest} days. Top languages: ${esc(topLangs.map((l) => `${l.name} ${l.pct.toFixed(0)}%`).join(', '))}.</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0f2019"/><stop offset="1" stop-color="#08110d"/></linearGradient>
    <linearGradient id="mint" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22b8a6"/><stop offset="1" stop-color="#9ff5c9"/></linearGradient>
    <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3ddc97" stop-opacity=".45"/><stop offset="1" stop-color="#3ddc97" stop-opacity="0"/></linearGradient>
  </defs>
  <style>
    text { font-family: 'Segoe UI', Inter, -apple-system, 'Helvetica Neue', Arial, sans-serif; }
    .h    { font-size: 15px; font-weight: 700; fill: #eafaf2; }
    .lbl  { font-size: 12px; font-weight: 600; fill: #7fa894; }
    .num  { font-size: 24px; font-weight: 800; fill: #eafaf2; }
    .big  { font-size: 38px; font-weight: 800; fill: #eafaf2; }
    .hint { font-size: 11px; fill: #5f8a76; }
    .hl   { fill: #3ddc97; font-weight: 700; }
    .lang { font-size: 13px; font-weight: 600; fill: #c7e6d6; }
    .pct  { font-family: 'JetBrains Mono', Consolas, Menlo, monospace; font-size: 12px; fill: #9ff5c9; }
    .up   { animation: up .6s cubic-bezier(.2,.7,.2,1) both; }
    @keyframes up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    .grow { transform-box: fill-box; transform-origin: left; animation: grow 1.1s cubic-bezier(.6,.1,.3,1) both .5s; }
    @keyframes grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    .ring { animation: ring 1.4s cubic-bezier(.6,.1,.3,1) both .3s; }
    @keyframes ring { from { stroke-dasharray: 0 ${C.toFixed(1)}; } }
    .area { animation: fade 1.2s ease-out both .6s; }
    @keyframes fade { from { opacity: 0; } }
    .draw { stroke-dasharray: 3000; animation: draw 2s ease-out both .4s; }
    @keyframes draw { from { stroke-dashoffset: 3000; } to { stroke-dashoffset: 0; } }
    .pulse { animation: pulse 1.6s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
    @keyframes pulse { 50% { transform: scale(1.8); opacity: .3; } }
  </style>

  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="18" fill="url(#bg)" stroke="#1f3a2e" stroke-width="1.5"/>

  <text x="24" y="40" class="h">Activity</text>
  <text x="510" y="40" class="h">Streak</text>
  <text x="730" y="40" class="h">Top languages</text>
  <line x1="490" y1="28" x2="490" y2="236" stroke="#1f3a2e"/>
  <line x1="710" y1="28" x2="710" y2="236" stroke="#1f3a2e"/>

  ${tiles}
  ${ring}
  ${bars}

  <line x1="24" y1="256" x2="${W - 24}" y2="256" stroke="#1f3a2e"/>
  <text x="24" y="284" class="h">Last 52 weeks</text>
  <text x="${W - 24}" y="284" text-anchor="end" class="hint">peak: ${max} / week · updated ${today}</text>
  <path d="${area}" fill="url(#fill)" class="area"/>
  <path d="${line}" fill="none" stroke="#3ddc97" stroke-width="2.2" stroke-linejoin="round" class="draw"/>
  ${peak && max > 0 ? `<circle cx="${peak[0].toFixed(1)}" cy="${peak[1].toFixed(1)}" r="4" fill="#9ff5c9" class="pulse"/>` : ''}
</svg>
`;

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'stats.svg'), svg);
console.log(`stats.svg: ${totalContributions} contributions, streak ${current}/${longest}, langs ${topLangs.map((l) => l.name).join(', ')}`);
