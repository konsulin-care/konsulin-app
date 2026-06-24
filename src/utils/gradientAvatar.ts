/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, unicorn/number-literal-case */
const TEAL = '#13c2c2';
const PARTNER_COLORS = ['#2c2f35', '#5E81AC', '#08979C'] as const;

const DIRECTIONS = [
  { x1: '0%', y1: '0%', x2: '100%', y2: '0%' },
  { x1: '100%', y1: '0%', x2: '0%', y2: '0%' },
  { x1: '0%', y1: '0%', x2: '0%', y2: '100%' },
  { x1: '0%', y1: '100%', x2: '0%', y2: '0%' },
  { x1: '0%', y1: '0%', x2: '100%', y2: '100%' },
  { x1: '100%', y1: '0%', x2: '0%', y2: '100%' },
  { x1: '0%', y1: '100%', x2: '100%', y2: '0%' },
  { x1: '100%', y1: '100%', x2: '0%', y2: '0%' }
];

/** Hash a string using the djb2 algorithm. */
function djb2(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + (str.codePointAt(i) ?? 0);
    hash = Math.trunc(hash);
  }
  return Math.abs(hash);
}

/** Create a seeded pseudo-random number generator. */
function seeded(hash: number): () => number {
  let seed = hash;
  return () => {
    seed = Math.trunc(seed * 1_103_515_245 + 12_345);
    return Math.abs(seed) / 0x7f_ff_ff_ff;
  };
}

/** Escape XML special characters. */
function escapeXml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

/**
 *
 */
export function generateAvatarSvgDataUrl(
  seed: string,
  initials: string
): string | null {
  if (!seed || !initials) return null;

  const hash = djb2(seed);
  const rng = seeded(hash);

  const dirIdx = hash % DIRECTIONS.length;
  const colorIdx = Math.floor(hash / DIRECTIONS.length) % PARTNER_COLORS.length;
  const dir = DIRECTIONS[dirIdx];
  const partnerColor = PARTNER_COLORS[colorIdx];

  const pathCount =
    2 + (Math.floor(hash / (DIRECTIONS.length * PARTNER_COLORS.length)) % 2);
  const paths: string[] = [];

  for (let i = 0; i < pathCount; i++) {
    const isFirst = i === 0;

    let x1, y1, x2, y2;
    if (isFirst) {
      x1 = 5 + rng() * 25;
      y1 = 5 + rng() * 25;
      x2 = 70 + rng() * 25;
      y2 = 70 + rng() * 25;
    } else {
      x1 = 70 + rng() * 25;
      y1 = 5 + rng() * 25;
      x2 = 5 + rng() * 25;
      y2 = 70 + rng() * 25;
    }

    const cx1 = rng() * 100;
    const cy1 = rng() * 100;
    const cx2 = rng() * 100;
    const cy2 = rng() * 100;
    const opacity = 0.08 + rng() * 0.08;
    const sw = 1.5 + rng() * 1.5;

    paths.push(
      `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} C${cx1.toFixed(1)},${cy1.toFixed(1)} ${cx2.toFixed(1)},${cy2.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}" stroke="rgba(255,255,255,${opacity.toFixed(2)})" stroke-width="${sw.toFixed(1)}" fill="none" stroke-linecap="round"/>`
    );
  }

  let fontSize: number;
  if (initials.length <= 1) {
    fontSize = 42;
  } else if (initials.length >= 3) {
    fontSize = 28;
  } else {
    fontSize = 36;
  }

  const svg = `<svg xmlns="https://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="g" x1="${dir.x1}" y1="${dir.y1}" x2="${dir.x2}" y2="${dir.y2}">
      <stop offset="0%" stop-color="${TEAL}"/>
      <stop offset="100%" stop-color="${partnerColor}"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" fill="url(#g)"/>
  ${paths.join('\n  ')}
  <text x="50" y="50" text-anchor="middle" dy=".35em" font-family="system-ui,-apple-system,sans-serif" font-size="${fontSize}" font-weight="700" fill="#ffffff">${escapeXml(initials)}</text>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
