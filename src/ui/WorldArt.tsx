/** Hand-built SVG card art for each world — crisp, tiny, and no image downloads. */
export function WorldArt({ id, emoji }: { id: string; emoji: string }) {
  switch (id) {
    case 'solar-system':
      return <SolarArt />;
    case 'chandrayaan':
      return <MoonArt />;
    case 'human-heart':
      return <HeartArt />;
    default:
      return (
        <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <Stars seed={3} />
          <text x="200" y="130" textAnchor="middle" fontSize="110" className="emoji">
            {emoji}
          </text>
        </svg>
      );
  }
}

function Stars({ seed }: { seed: number }) {
  const pts = Array.from({ length: 40 }, (_, i) => {
    const x = (Math.sin(i * 12.9898 + seed) * 43758.5453) % 1;
    const y = (Math.sin(i * 78.233 + seed) * 12345.678) % 1;
    return { x: Math.abs(x) * 400, y: Math.abs(y) * 200, r: 0.6 + (i % 4) * 0.45 };
  });
  return (
    <g fill="#fff">
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={p.r} opacity={0.4 + (i % 5) * 0.12} />
      ))}
    </g>
  );
}

function SolarArt() {
  return (
    <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="sa-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF7C2" />
          <stop offset="45%" stopColor="#FFC93C" />
          <stop offset="100%" stopColor="#FF7B1C" />
        </radialGradient>
        <radialGradient id="sa-sunglow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFC93C" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#FFC93C" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sa-sat" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE3A3" />
          <stop offset="50%" stopColor="#E9B864" />
          <stop offset="100%" stopColor="#B7823B" />
        </linearGradient>
        <radialGradient id="sa-earth" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#9EE7FF" />
          <stop offset="60%" stopColor="#2F8BEF" />
          <stop offset="100%" stopColor="#123C8C" />
        </radialGradient>
      </defs>
      <Stars seed={1} />
      <circle cx="30" cy="170" r="120" fill="url(#sa-sunglow)" />
      <circle cx="10" cy="190" r="70" fill="url(#sa-sun)" />
      <g transform="translate(270 92) rotate(-18)">
        <ellipse cx="0" cy="0" rx="92" ry="20" fill="none" stroke="#F6D9A0" strokeWidth="9" opacity="0.85" />
        <circle cx="0" cy="0" r="48" fill="url(#sa-sat)" />
        <path d="M-46 -10 Q0 -2 46 -10" stroke="#C78F45" strokeWidth="5" fill="none" opacity="0.6" />
        <path d="M-47 8 Q0 16 47 8" stroke="#FFF1CF" strokeWidth="4" fill="none" opacity="0.5" />
        <path d="M-92 0 A92 20 0 0 0 92 0" fill="none" stroke="#FFE7B8" strokeWidth="9" />
      </g>
      <circle cx="140" cy="60" r="20" fill="url(#sa-earth)" />
      <path d="M128 52 q6 -6 12 0 q4 6 -2 10 q-8 2 -10 -10z" fill="#4CD27E" />
      <circle cx="190" cy="150" r="11" fill="#E0613F" />
      <g transform="translate(95 118) rotate(35)">
        <path d="M0 -26 C10 -16 10 8 6 16 L-6 16 C-10 8 -10 -16 0 -26z" fill="#FFFFFF" />
        <circle cx="0" cy="-6" r="5" fill="#4CC9F0" stroke="#7B61FF" strokeWidth="2" />
        <path d="M-6 10 L-13 20 L-6 17z M6 10 L13 20 L6 17z" fill="#FF6B6B" />
        <path d="M-4 17 Q0 34 4 17z" fill="#FFC93C" />
      </g>
    </svg>
  );
}

function MoonArt() {
  return (
    <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="ma-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#B9B4C9" />
          <stop offset="100%" stopColor="#5E5A70" />
        </linearGradient>
        <radialGradient id="ma-earth" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#B6F0FF" />
          <stop offset="60%" stopColor="#2F8BEF" />
          <stop offset="100%" stopColor="#0E2F73" />
        </radialGradient>
      </defs>
      <Stars seed={5} />
      <circle cx="320" cy="50" r="26" fill="url(#ma-earth)" />
      <path d="M306 44 q8 -8 16 -2 q2 8 -6 10 q-8 0 -10 -8z" fill="#58CC7F" />
      <path d="M0 150 Q80 125 170 145 T400 138 L400 200 L0 200z" fill="url(#ma-ground)" />
      <ellipse cx="70" cy="172" rx="26" ry="7" fill="#4C485C" />
      <ellipse cx="300" cy="180" rx="34" ry="8" fill="#4C485C" />
      <ellipse cx="220" cy="160" rx="14" ry="4" fill="#57536A" />
      {/* Vikram-style lander */}
      <g transform="translate(160 104)">
        <path d="M-30 30 L-40 48 M30 30 L40 48 M-14 34 L-18 50 M14 34 L18 50" stroke="#D8D8E0" strokeWidth="4" strokeLinecap="round" />
        <rect x="-32" y="-6" width="64" height="40" rx="6" fill="#E8B64C" />
        <rect x="-32" y="-6" width="64" height="12" rx="4" fill="#F5D27A" />
        <rect x="-22" y="-26" width="44" height="22" rx="4" fill="#2A3C8E" />
        <path d="M-22 -20 H22 M-22 -12 H22 M-6 -26 V-4 M8 -26 V-4" stroke="#6C83FF" strokeWidth="1.5" />
        <rect x="-10" y="10" width="20" height="4" fill="#FF9933" />
        <rect x="-10" y="14" width="20" height="4" fill="#FFFFFF" />
        <rect x="-10" y="18" width="20" height="4" fill="#138808" />
      </g>
      {/* Pragyan rover */}
      <g transform="translate(250 146)">
        <rect x="-20" y="-12" width="40" height="14" rx="3" fill="#E9C46A" />
        <rect x="-16" y="-24" width="32" height="10" rx="2" fill="#2A3C8E" />
        <circle cx="-14" cy="4" r="5" fill="#555" />
        <circle cx="0" cy="4" r="5" fill="#555" />
        <circle cx="14" cy="4" r="5" fill="#555" />
      </g>
      <path d="M205 150 q20 2 26 -2" stroke="#8C88A0" strokeWidth="3" strokeDasharray="3 4" fill="none" />
    </svg>
  );
}

function HeartArt() {
  return (
    <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="ha-heart" cx="38%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#FF9CB0" />
          <stop offset="50%" stopColor="#F0395E" />
          <stop offset="100%" stopColor="#8C0F2E" />
        </radialGradient>
        <radialGradient id="ha-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF5A7A" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FF5A7A" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="200" cy="100" r="130" fill="url(#ha-glow)" />
      {/* vessels */}
      <path d="M186 44 C184 20 206 12 222 22 C236 30 236 44 230 52" stroke="#E0304F" strokeWidth="16" fill="none" strokeLinecap="round" />
      <path d="M170 50 C166 30 160 20 150 16" stroke="#3E6BE0" strokeWidth="13" fill="none" strokeLinecap="round" />
      <path d="M210 52 C220 36 246 36 258 42" stroke="#3E6BE0" strokeWidth="10" fill="none" strokeLinecap="round" />
      {/* heart */}
      <path
        d="M200 176 C140 140 118 108 124 80 C130 50 164 42 184 60 C192 67 196 74 200 80 C204 74 210 64 222 58 C246 46 278 60 278 92 C278 120 250 146 200 176z"
        fill="url(#ha-heart)"
      />
      <path d="M150 78 q10 -18 30 -14" stroke="#FFD0DA" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.8" />
      <path d="M200 84 C198 110 204 140 214 160" stroke="#B51D40" strokeWidth="3" fill="none" opacity="0.7" />
      {/* face */}
      <ellipse cx="180" cy="106" rx="6" ry="8" fill="#3A0A18" />
      <ellipse cx="222" cy="106" rx="6" ry="8" fill="#3A0A18" />
      <circle cx="182" cy="103" r="2" fill="#fff" />
      <circle cx="224" cy="103" r="2" fill="#fff" />
      <path d="M190 124 q11 10 22 0" stroke="#3A0A18" strokeWidth="4" strokeLinecap="round" fill="none" />
      <ellipse cx="168" cy="120" rx="8" ry="5" fill="#FF9CB0" opacity="0.8" />
      <ellipse cx="234" cy="120" rx="8" ry="5" fill="#FF9CB0" opacity="0.8" />
      {/* blood cells */}
      <g fill="#FF3B5C">
        <ellipse cx="60" cy="60" rx="14" ry="10" />
        <ellipse cx="340" cy="150" rx="16" ry="11" />
        <ellipse cx="330" cy="40" rx="10" ry="7" />
      </g>
      <g fill="#4A76F0">
        <ellipse cx="70" cy="160" rx="13" ry="9" />
        <ellipse cx="360" cy="95" rx="9" ry="6" />
      </g>
      <path d="M20 100 H90 l10 -24 l14 50 l12 -34 l8 8 H150" stroke="#FFD0DA" strokeWidth="4" fill="none" strokeLinejoin="round" opacity="0.8" />
      <path d="M250 100 H290 l10 -24 l14 50 l12 -34 l8 8 H400" stroke="#FFD0DA" strokeWidth="4" fill="none" strokeLinejoin="round" opacity="0.8" />
    </svg>
  );
}
