/**
 * Example: "The Agent Loop" — a cinematic, seamlessly looping hero diagram.
 *
 * Design goals:
 *  - Legible at README width (1280x800 at 25fps, 8s loop)
 *  - Dark "aurora glass" visual language: deep navy, glass cards, three accents
 *  - Every animation is periodic over 8s so the GIF loops without a seam
 *
 * All motion is native CSS/SMIL. The pipeline seeks both timelines to exact
 * frame times, so output is deterministic instead of wall-clock dependent.
 */

import { SVGAnimationPipeline } from '../src/pipeline';
import { ProgressInfo } from '../src/types';

const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 800" width="1280" height="800">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#070B14"/>
      <stop offset="0.55" stop-color="#080D18"/>
      <stop offset="1" stop-color="#05070E"/>
    </linearGradient>

    <radialGradient id="auroraViolet" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#7C3AED" stop-opacity="0.30"/>
      <stop offset="0.45" stop-color="#6D28D9" stop-opacity="0.12"/>
      <stop offset="1" stop-color="#6D28D9" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="auroraEmerald" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#10B981" stop-opacity="0.20"/>
      <stop offset="0.5" stop-color="#059669" stop-opacity="0.07"/>
      <stop offset="1" stop-color="#059669" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="auroraRose" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#F43F5E" stop-opacity="0.18"/>
      <stop offset="0.5" stop-color="#BE123C" stop-opacity="0.06"/>
      <stop offset="1" stop-color="#BE123C" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="auroraBlue" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#3B82F6" stop-opacity="0.14"/>
      <stop offset="1" stop-color="#3B82F6" stop-opacity="0"/>
    </radialGradient>

    <linearGradient id="cardFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.062"/>
      <stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0.030"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0.012"/>
    </linearGradient>

    <linearGradient id="titleGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="0.7" stop-color="#E0E7FF"/>
      <stop offset="1" stop-color="#A5B4FC"/>
    </linearGradient>

    <linearGradient id="violetGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#A78BFA"/>
      <stop offset="1" stop-color="#7C3AED"/>
    </linearGradient>
    <linearGradient id="emeraldGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6EE7B7"/>
      <stop offset="1" stop-color="#10B981"/>
    </linearGradient>
    <linearGradient id="roseGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FDA4AF"/>
      <stop offset="1" stop-color="#F43F5E"/>
    </linearGradient>

    <linearGradient id="flowViolet" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#8B5CF6" stop-opacity="0.15"/>
      <stop offset="0.5" stop-color="#A78BFA" stop-opacity="0.75"/>
      <stop offset="1" stop-color="#34D399" stop-opacity="0.55"/>
    </linearGradient>
    <linearGradient id="flowEmerald" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#34D399" stop-opacity="0.55"/>
      <stop offset="0.5" stop-color="#6EE7B7" stop-opacity="0.75"/>
      <stop offset="1" stop-color="#FB7185" stop-opacity="0.55"/>
    </linearGradient>
    <linearGradient id="railGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#8B5CF6" stop-opacity="0.55"/>
      <stop offset="0.5" stop-color="#64748B" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#FB7185" stop-opacity="0.55"/>
    </linearGradient>
    <linearGradient id="divider" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0"/>
      <stop offset="0.12" stop-color="#FFFFFF" stop-opacity="0.16"/>
      <stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0.07"/>
      <stop offset="0.88" stop-color="#FFFFFF" stop-opacity="0.16"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>

    <radialGradient id="iconViolet" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#8B5CF6" stop-opacity="0.34"/>
      <stop offset="1" stop-color="#8B5CF6" stop-opacity="0.03"/>
    </radialGradient>
    <radialGradient id="iconEmerald" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#10B981" stop-opacity="0.30"/>
      <stop offset="1" stop-color="#10B981" stop-opacity="0.03"/>
    </radialGradient>
    <radialGradient id="iconRose" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#F43F5E" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#F43F5E" stop-opacity="0.03"/>
    </radialGradient>

    <pattern id="dotGrid" width="32" height="32" patternUnits="userSpaceOnUse">
      <circle cx="1.4" cy="1.4" r="1.15" fill="#FFFFFF" opacity="0.045"/>
    </pattern>
  </defs>

  <style>
    text {
      font-family: 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      text-rendering: geometricPrecision;
    }
    .mono {
      font-family: 'SF Mono', 'JetBrains Mono', 'Roboto Mono', Menlo, Consolas, monospace;
    }
    .stage-glow { animation: stageGlow 8s ease-in-out infinite; }
    .g1 { animation-delay: 0s; }
    .g2 { animation-delay: -5.3333s; }
    .g3 { animation-delay: -2.6667s; }
    @keyframes stageGlow {
      0%   { opacity: 0.92; }
      16%  { opacity: 0.16; }
      82%  { opacity: 0.10; }
      100% { opacity: 0.92; }
    }
    .halo { animation: haloPulse 8s ease-in-out infinite; }
    @keyframes haloPulse {
      0%   { opacity: 0.55; }
      16%  { opacity: 0.12; }
      82%  { opacity: 0.10; }
      100% { opacity: 0.55; }
    }
    .flow { stroke-dasharray: 4 10; animation: dashFlow 1.6s linear infinite; }
    @keyframes dashFlow { to { stroke-dashoffset: -56; } }
    .signal { animation: signalPulse 2s ease-in-out infinite; }
    @keyframes signalPulse {
      0%, 100% { opacity: 0.24; }
      50%      { opacity: 1; }
    }
    .s0 { animation-delay: -0.10s; }
    .s1 { animation-delay: -0.30s; }
    .s2 { animation-delay: -0.50s; }
    .s3 { animation-delay: -0.70s; }
    .s4 { animation-delay: -0.90s; }
    .s5 { animation-delay: -1.10s; }
    .s6 { animation-delay: -1.30s; }
    .s7 { animation-delay: -1.50s; }
    .s8 { animation-delay: -1.70s; }
    .aurora { animation: auroraBreathe 8s ease-in-out infinite; }
    @keyframes auroraBreathe {
      0%, 100% { opacity: 0.72; }
      50%      { opacity: 1; }
    }
    .status-dot { animation: statusPulse 2s ease-in-out infinite; }
    @keyframes statusPulse {
      0%, 100% { opacity: 1; }
      50%      { opacity: 0.35; }
    }
  </style>

  <!-- Background -->
  <rect width="1280" height="800" fill="url(#bg)"/>
  <g class="aurora">
    <ellipse cx="210" cy="130" rx="500" ry="320" fill="url(#auroraViolet)"/>
    <ellipse cx="1110" cy="250" rx="430" ry="300" fill="url(#auroraEmerald)"/>
    <ellipse cx="820" cy="790" rx="560" ry="280" fill="url(#auroraRose)"/>
    <ellipse cx="640" cy="420" rx="460" ry="300" fill="url(#auroraBlue)"/>
  </g>
  <rect width="1280" height="800" fill="url(#dotGrid)"/>

  <!-- Framing marks -->
  <g stroke="#8FA3BF" stroke-opacity="0.22" stroke-width="1" fill="none">
    <path d="M40 54 V40 H54"/>
    <path d="M1226 40 H1240 V54"/>
    <path d="M40 746 V760 H54"/>
    <path d="M1226 760 H1240 V746"/>
  </g>
  <path d="M64 196 H1216" stroke="url(#divider)" stroke-width="1"/>

  <!-- Header -->
  <g>
    <rect x="64" y="54" width="26" height="26" rx="8" fill="url(#violetGrad)" opacity="0.92"/>
    <path d="M77 59.5 L79 69 L88.5 71 L79 73 L77 82.5 L75 73 L65.5 71 L75 69 Z" fill="#F8FAFC" opacity="0.95"/>
    <text x="102" y="72" class="mono" font-size="10.5" letter-spacing="2.6" fill="#7C8BA1">ATLAS / AGENT SYSTEMS</text>

    <text x="64" y="138" font-size="47" font-weight="600" letter-spacing="-1.5" fill="url(#titleGrad)">The Agent Loop</text>
    <text x="64" y="171" font-size="16.5" letter-spacing="0.1" fill="#94A3B8">A reasoning system that thinks, acts, and learns — one turn at a time.</text>

    <g>
      <rect x="982" y="54" width="234" height="36" rx="18" fill="#0B1220" fill-opacity="0.62" stroke="#94A3B8" stroke-opacity="0.16"/>
      <circle cx="1002" cy="72" r="4" fill="#34D399"/>
      <circle cx="1002" cy="72" r="7.5" fill="none" stroke="#34D399" stroke-opacity="0.32"/>
      <text x="1018" y="76" class="mono" font-size="10.5" letter-spacing="1.9" fill="#A7F3D0">AUTONOMOUS RUN</text>
    </g>
    <text x="1216" y="112" text-anchor="end" class="mono" font-size="10" letter-spacing="1.6" fill="#5C6B82">8.0 SEC · SEAMLESS LOOP</text>
  </g>

  <!-- Orbit guide -->
  <ellipse cx="640" cy="356" rx="592" ry="296" fill="none" stroke="#FFFFFF" stroke-opacity="0.028"/>

  <!-- Connectors -->
  <g>
    <path d="M394 350 H452" stroke="#FFFFFF" stroke-opacity="0.12" stroke-width="1.4"/>
    <path d="M394 350 H452" stroke="url(#flowViolet)" stroke-width="1.6" class="flow"/>
    <path d="M446 343 L456 350 L446 357" fill="none" stroke="#A78BFA" stroke-opacity="0.9" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="423" y="332" text-anchor="middle" class="mono" font-size="8.5" letter-spacing="1.7" fill="#6D7C92">CONTEXT</text>

    <path d="M810 350 H868" stroke="#FFFFFF" stroke-opacity="0.12" stroke-width="1.4"/>
    <path d="M810 350 H868" stroke="url(#flowEmerald)" stroke-width="1.6" class="flow"/>
    <path d="M862 343 L872 350 L862 357" fill="none" stroke="#6EE7B7" stroke-opacity="0.9" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="839" y="332" text-anchor="middle" class="mono" font-size="8.5" letter-spacing="1.7" fill="#6D7C92">OUTCOME</text>
  </g>

  <!-- Stage 01: Think -->
  <g>
    <rect x="64" y="224" width="320" height="252" rx="22" fill="url(#cardFill)" stroke="#FFFFFF" stroke-opacity="0.10"/>
    <rect x="64" y="224" width="320" height="252" rx="22" fill="none" stroke="#A78BFA" stroke-width="1.5" class="stage-glow g1"/>
    <path d="M92 224.5 H172" stroke="url(#violetGrad)" stroke-width="2" stroke-linecap="round"/>
    <text x="360" y="253" text-anchor="end" class="mono" font-size="10.5" letter-spacing="1.4" fill="#5E6D82">STEP 01</text>

    <rect x="88" y="248" width="44" height="44" rx="12" fill="#8B5CF6" fill-opacity="0.13" stroke="#A78BFA" stroke-opacity="0.34"/>
    <circle cx="110" cy="270" r="34" fill="url(#iconViolet)" class="halo g1"/>
    <path d="M110 257 L112.4 267.6 L123 270 L112.4 272.4 L110 283 L107.6 272.4 L97 270 L107.6 267.6 Z" fill="#C4B5FD"/>

    <text x="146" y="272" font-size="23" font-weight="600" letter-spacing="-0.3" fill="#F1F5F9">Think</text>
    <text x="147" y="294" font-size="12" letter-spacing="0.2" fill="#7C8BA1">Reasoning &amp; planning</text>

    <text x="88" y="334" font-size="14" letter-spacing="0.05" fill="#A9B6CA">Decompose the goal. Weigh evidence.</text>
    <text x="88" y="356" font-size="14" letter-spacing="0.05" fill="#A9B6CA">Choose the next best action.</text>

    <g>
      <rect x="88" y="380" width="54" height="24" rx="8" fill="#FFFFFF" fill-opacity="0.035" stroke="#FFFFFF" stroke-opacity="0.09"/>
      <text x="115" y="396" text-anchor="middle" class="mono" font-size="9" letter-spacing="1.1" fill="#9CA9BC">PLAN</text>
      <rect x="150" y="380" width="66" height="24" rx="8" fill="#FFFFFF" fill-opacity="0.035" stroke="#FFFFFF" stroke-opacity="0.09"/>
      <text x="183" y="396" text-anchor="middle" class="mono" font-size="9" letter-spacing="1.1" fill="#9CA9BC">REASON</text>
      <rect x="224" y="380" width="70" height="24" rx="8" fill="#FFFFFF" fill-opacity="0.035" stroke="#FFFFFF" stroke-opacity="0.09"/>
      <text x="259" y="396" text-anchor="middle" class="mono" font-size="9" letter-spacing="1.1" fill="#9CA9BC">REFLECT</text>
    </g>

    <text x="88" y="452" class="mono" font-size="8.5" letter-spacing="1.5" fill="#56657A">SIGNAL</text>
    <g fill="#A78BFA">
      <rect x="132" y="443" width="2.5" height="10" rx="1.2" class="signal s0"/>
      <rect x="140" y="439" width="2.5" height="14" rx="1.2" class="signal s1"/>
      <rect x="148" y="441" width="2.5" height="12" rx="1.2" class="signal s2"/>
      <rect x="156" y="433" width="2.5" height="20" rx="1.2" class="signal s3"/>
      <rect x="164" y="436" width="2.5" height="17" rx="1.2" class="signal s4"/>
      <rect x="172" y="430" width="2.5" height="23" rx="1.2" class="signal s5"/>
      <rect x="180" y="440" width="2.5" height="13" rx="1.2" class="signal s6"/>
      <rect x="188" y="434" width="2.5" height="19" rx="1.2" class="signal s7"/>
      <rect x="196" y="442" width="2.5" height="11" rx="1.2" class="signal s8"/>
    </g>
    <text x="360" y="452" text-anchor="end" class="mono" font-size="9" letter-spacing="0.8" fill="#C4B5FD">0.8s</text>
  </g>

  <!-- Stage 02: Act -->
  <g>
    <rect x="480" y="224" width="320" height="252" rx="22" fill="url(#cardFill)" stroke="#FFFFFF" stroke-opacity="0.10"/>
    <rect x="480" y="224" width="320" height="252" rx="22" fill="none" stroke="#34D399" stroke-width="1.5" class="stage-glow g2"/>
    <path d="M508 224.5 H588" stroke="url(#emeraldGrad)" stroke-width="2" stroke-linecap="round"/>
    <text x="776" y="253" text-anchor="end" class="mono" font-size="10.5" letter-spacing="1.4" fill="#5E6D82">STEP 02</text>

    <rect x="504" y="248" width="44" height="44" rx="12" fill="#10B981" fill-opacity="0.12" stroke="#6EE7B7" stroke-opacity="0.32"/>
    <circle cx="526" cy="270" r="34" fill="url(#iconEmerald)" class="halo g2"/>
    <path d="M530 256 L517 272 H525 L521 284 L535 267 H527 Z" fill="#6EE7B7"/>

    <text x="562" y="272" font-size="23" font-weight="600" letter-spacing="-0.3" fill="#F1F5F9">Act</text>
    <text x="563" y="294" font-size="12" letter-spacing="0.2" fill="#7C8BA1">Tool use &amp; execution</text>

    <text x="504" y="334" font-size="14" letter-spacing="0.05" fill="#A9B6CA">Call tools and write code with</text>
    <text x="504" y="356" font-size="14" letter-spacing="0.05" fill="#A9B6CA">precise, sandboxed side effects.</text>

    <g>
      <rect x="504" y="380" width="58" height="24" rx="8" fill="#FFFFFF" fill-opacity="0.035" stroke="#FFFFFF" stroke-opacity="0.09"/>
      <text x="533" y="396" text-anchor="middle" class="mono" font-size="9" letter-spacing="1.1" fill="#9CA9BC">TOOLS</text>
      <rect x="570" y="380" width="54" height="24" rx="8" fill="#FFFFFF" fill-opacity="0.035" stroke="#FFFFFF" stroke-opacity="0.09"/>
      <text x="597" y="396" text-anchor="middle" class="mono" font-size="9" letter-spacing="1.1" fill="#9CA9BC">CODE</text>
      <rect x="632" y="380" width="52" height="24" rx="8" fill="#FFFFFF" fill-opacity="0.035" stroke="#FFFFFF" stroke-opacity="0.09"/>
      <text x="658" y="396" text-anchor="middle" class="mono" font-size="9" letter-spacing="1.1" fill="#9CA9BC">API</text>
    </g>

    <text x="504" y="452" class="mono" font-size="8.5" letter-spacing="1.5" fill="#56657A">SIGNAL</text>
    <g fill="#34D399">
      <rect x="548" y="440" width="2.5" height="13" rx="1.2" class="signal s2"/>
      <rect x="556" y="434" width="2.5" height="19" rx="1.2" class="signal s3"/>
      <rect x="564" y="437" width="2.5" height="16" rx="1.2" class="signal s4"/>
      <rect x="572" y="430" width="2.5" height="23" rx="1.2" class="signal s5"/>
      <rect x="580" y="435" width="2.5" height="18" rx="1.2" class="signal s6"/>
      <rect x="588" y="432" width="2.5" height="21" rx="1.2" class="signal s7"/>
      <rect x="596" y="442" width="2.5" height="11" rx="1.2" class="signal s8"/>
      <rect x="604" y="438" width="2.5" height="15" rx="1.2" class="signal s0"/>
      <rect x="612" y="441" width="2.5" height="12" rx="1.2" class="signal s1"/>
    </g>
    <text x="776" y="452" text-anchor="end" class="mono" font-size="9" letter-spacing="0.8" fill="#6EE7B7">1.6s</text>
  </g>

  <!-- Stage 03: Observe -->
  <g>
    <rect x="896" y="224" width="320" height="252" rx="22" fill="url(#cardFill)" stroke="#FFFFFF" stroke-opacity="0.10"/>
    <rect x="896" y="224" width="320" height="252" rx="22" fill="none" stroke="#FB7185" stroke-width="1.5" class="stage-glow g3"/>
    <path d="M924 224.5 H1004" stroke="url(#roseGrad)" stroke-width="2" stroke-linecap="round"/>
    <text x="1192" y="253" text-anchor="end" class="mono" font-size="10.5" letter-spacing="1.4" fill="#5E6D82">STEP 03</text>

    <rect x="920" y="248" width="44" height="44" rx="12" fill="#F43F5E" fill-opacity="0.11" stroke="#FDA4AF" stroke-opacity="0.30"/>
    <circle cx="942" cy="270" r="34" fill="url(#iconRose)" class="halo g3"/>
    <path d="M930 270 C933 264 937 261 942 261 C947 261 951 264 954 270 C951 276 947 279 942 279 C937 279 933 276 930 270 Z" fill="none" stroke="#FDA4AF" stroke-width="1.6"/>
    <circle cx="942" cy="270" r="3.2" fill="#FDA4AF"/>

    <text x="978" y="272" font-size="23" font-weight="600" letter-spacing="-0.3" fill="#F1F5F9">Observe</text>
    <text x="979" y="294" font-size="12" letter-spacing="0.2" fill="#7C8BA1">Verification &amp; learning</text>

    <text x="920" y="334" font-size="14" letter-spacing="0.05" fill="#A9B6CA">Read the result. Verify the goal.</text>
    <text x="920" y="356" font-size="14" letter-spacing="0.05" fill="#A9B6CA">Update the plan and iterate.</text>

    <g>
      <rect x="920" y="380" width="62" height="24" rx="8" fill="#FFFFFF" fill-opacity="0.035" stroke="#FFFFFF" stroke-opacity="0.09"/>
      <text x="951" y="396" text-anchor="middle" class="mono" font-size="9" letter-spacing="1.1" fill="#9CA9BC">VERIFY</text>
      <rect x="990" y="380" width="58" height="24" rx="8" fill="#FFFFFF" fill-opacity="0.035" stroke="#FFFFFF" stroke-opacity="0.09"/>
      <text x="1019" y="396" text-anchor="middle" class="mono" font-size="9" letter-spacing="1.1" fill="#9CA9BC">TRACE</text>
      <rect x="1056" y="380" width="58" height="24" rx="8" fill="#FFFFFF" fill-opacity="0.035" stroke="#FFFFFF" stroke-opacity="0.09"/>
      <text x="1085" y="396" text-anchor="middle" class="mono" font-size="9" letter-spacing="1.1" fill="#9CA9BC">LEARN</text>
    </g>

    <text x="920" y="452" class="mono" font-size="8.5" letter-spacing="1.5" fill="#56657A">SIGNAL</text>
    <g fill="#FB7185">
      <rect x="964" y="441" width="2.5" height="12" rx="1.2" class="signal s4"/>
      <rect x="972" y="436" width="2.5" height="17" rx="1.2" class="signal s5"/>
      <rect x="980" y="432" width="2.5" height="21" rx="1.2" class="signal s6"/>
      <rect x="988" y="437" width="2.5" height="16" rx="1.2" class="signal s7"/>
      <rect x="996" y="430" width="2.5" height="23" rx="1.2" class="signal s8"/>
      <rect x="1004" y="434" width="2.5" height="19" rx="1.2" class="signal s0"/>
      <rect x="1012" y="440" width="2.5" height="13" rx="1.2" class="signal s1"/>
      <rect x="1020" y="435" width="2.5" height="18" rx="1.2" class="signal s2"/>
      <rect x="1028" y="442" width="2.5" height="11" rx="1.2" class="signal s3"/>
    </g>
    <text x="1192" y="452" text-anchor="end" class="mono" font-size="9" letter-spacing="0.8" fill="#FDA4AF">2.4s</text>
  </g>

  <!-- Loop rail -->
  <g>
    <path id="loopRail" d="M1056 476 L1056 508 Q1056 536 1028 536 L252 536 Q224 536 224 508 L224 486" fill="none" stroke="#FFFFFF" stroke-opacity="0.10" stroke-width="1.4"/>
    <path d="M1056 476 L1056 508 Q1056 536 1028 536 L252 536 Q224 536 224 508 L224 486" fill="none" stroke="url(#railGrad)" stroke-width="1.6" class="flow"/>
    <path d="M224 478 L218 488 L230 488 Z" fill="#A78BFA" opacity="0.95"/>

    <g>
      <circle r="9" fill="#A78BFA" opacity="0.12"/>
      <circle r="3.2" fill="#DDD6FE"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.05;0.95;1" dur="8s" repeatCount="indefinite"/>
      <animateMotion dur="8s" repeatCount="indefinite">
        <mpath href="#loopRail"/>
      </animateMotion>
    </g>
    <g>
      <circle r="6" fill="#F43F5E" opacity="0.12"/>
      <circle r="2.2" fill="#FDA4AF"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.05;0.95;1" dur="8s" repeatCount="indefinite" begin="-4s"/>
      <animateMotion dur="8s" repeatCount="indefinite" begin="-4s">
        <mpath href="#loopRail"/>
      </animateMotion>
    </g>

    <rect x="536" y="520" width="208" height="32" rx="16" fill="#0A101C" stroke="#FFFFFF" stroke-opacity="0.13"/>
    <path d="M556 536 A7 7 0 1 1 562 542" fill="none" stroke="#94A3B8" stroke-width="1.3" stroke-linecap="round"/>
    <path d="M562 536 L562 542 L556 542" fill="none" stroke="#94A3B8" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="575" y="540" class="mono" font-size="9.5" letter-spacing="1.8" fill="#94A3B8">REPEAT UNTIL DONE</text>
  </g>

  <!-- Capability panels -->
  <g>
    <rect x="64" y="584" width="320" height="122" rx="16" fill="#FFFFFF" fill-opacity="0.028" stroke="#FFFFFF" stroke-opacity="0.075"/>
    <rect x="64" y="600" width="2" height="90" rx="1" fill="#A78BFA" opacity="0.55"/>
    <rect x="88" y="604" width="32" height="32" rx="9" fill="#8B5CF6" fill-opacity="0.10" stroke="#A78BFA" stroke-opacity="0.22"/>
    <g fill="none" stroke="#C4B5FD" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="104" cy="611" rx="7" ry="3"/>
      <path d="M97 611 V617 C97 618.7 100.1 620 104 620 C107.9 620 111 618.7 111 617 V611"/>
      <path d="M97 617 V623 C97 624.7 100.1 626 104 626 C107.9 626 111 624.7 111 623 V617"/>
    </g>
    <text x="132" y="617" font-size="14.5" font-weight="600" letter-spacing="0.1" fill="#E2E8F0">Memory</text>
    <text x="132" y="638" font-size="11.5" letter-spacing="0.1" fill="#74839A">Artifacts, skills, context</text>
    <text x="360" y="620" text-anchor="end" class="mono" font-size="20" fill="#C4B5FD">12</text>
    <path d="M88 676 H360" stroke="#FFFFFF" stroke-opacity="0.06" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M88 676 H244" stroke="#A78BFA" stroke-opacity="0.42" stroke-width="1.5" stroke-linecap="round"/>
  </g>

  <g>
    <rect x="480" y="584" width="320" height="122" rx="16" fill="#FFFFFF" fill-opacity="0.028" stroke="#FFFFFF" stroke-opacity="0.075"/>
    <rect x="480" y="600" width="2" height="90" rx="1" fill="#34D399" opacity="0.50"/>
    <rect x="504" y="604" width="32" height="32" rx="9" fill="#10B981" fill-opacity="0.10" stroke="#6EE7B7" stroke-opacity="0.20"/>
    <path d="M520 608 L527 611 V616 C527 620.5 524 623.5 520 625 C516 623.5 513 620.5 513 616 V611 Z" fill="none" stroke="#6EE7B7" stroke-width="1.3" stroke-linejoin="round"/>
    <path d="M517.5 616 L519.5 618 L523 614.5" fill="none" stroke="#6EE7B7" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="548" y="617" font-size="14.5" font-weight="600" letter-spacing="0.1" fill="#E2E8F0">Safety</text>
    <text x="548" y="638" font-size="11.5" letter-spacing="0.1" fill="#74839A">Policy gates and review</text>
    <circle cx="742" cy="614" r="4" fill="#34D399" class="status-dot"/>
    <text x="776" y="620" text-anchor="end" class="mono" font-size="9" letter-spacing="1.1" fill="#6EE7B7">ON</text>
    <path d="M504 676 H776" stroke="#FFFFFF" stroke-opacity="0.06" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M504 676 H716" stroke="#34D399" stroke-opacity="0.38" stroke-width="1.5" stroke-linecap="round"/>
  </g>

  <g>
    <rect x="896" y="584" width="320" height="122" rx="16" fill="#FFFFFF" fill-opacity="0.028" stroke="#FFFFFF" stroke-opacity="0.075"/>
    <rect x="896" y="600" width="2" height="90" rx="1" fill="#FB7185" opacity="0.48"/>
    <rect x="920" y="604" width="32" height="32" rx="9" fill="#F43F5E" fill-opacity="0.09" stroke="#FDA4AF" stroke-opacity="0.20"/>
    <g fill="none" stroke="#FDA4AF" stroke-width="1.3" stroke-linecap="round">
      <path d="M929 612 H943"/>
      <circle cx="932" cy="612" r="1.6" fill="#FDA4AF"/>
      <path d="M929 618 H943"/>
      <circle cx="938" cy="618" r="1.6" fill="#FDA4AF"/>
      <path d="M929 624 H943"/>
      <circle cx="934" cy="624" r="1.6" fill="#FDA4AF"/>
    </g>
    <text x="964" y="617" font-size="14.5" font-weight="600" letter-spacing="0.1" fill="#E2E8F0">Tools</text>
    <text x="964" y="638" font-size="11.5" letter-spacing="0.1" fill="#74839A">Sandboxed tools and APIs</text>
    <text x="1192" y="620" text-anchor="end" class="mono" font-size="20" fill="#FDA4AF">42</text>
    <path d="M920 676 H1192" stroke="#FFFFFF" stroke-opacity="0.06" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M920 676 H1052" stroke="#FB7185" stroke-opacity="0.36" stroke-width="1.5" stroke-linecap="round"/>
  </g>

  <!-- Footer -->
  <g class="mono" font-size="9.5" letter-spacing="1.5" fill="#475569">
    <text x="64" y="752">SVG ANIMATION PIPELINE</text>
    <text x="640" y="752" text-anchor="middle" fill="#5C6B82">THINK → ACT → OBSERVE → REPEAT</text>
    <text x="1216" y="752" text-anchor="end">1280×800 / 25 FPS / 8.0S</text>
  </g>
</svg>
`;

async function main() {
  const format = (process.argv[2] || 'gif').toLowerCase();
  const output = `./output/agent-loop.${format === 'mp4' ? 'mp4' : 'gif'}`;

  const pipeline = new SVGAnimationPipeline({
    input: svgContent,
    output,
    fps: 25,
    duration: 8000,
    width: 1280,
    height: 800,
    background: '#05070E',
    quality: 'high',
    pixelRatio: 1,
    preserveNativeAnimations: true,
  });

  pipeline.on('progress', (progress: ProgressInfo) => {
    if (progress.phase === 'rendering') {
      const bar = '█'.repeat(Math.floor(progress.percent / 5)) + '░'.repeat(20 - Math.floor(progress.percent / 5));
      process.stdout.write(`\r[${bar}] ${progress.percent}% ${progress.message || ''}`);
    } else if (progress.message) {
      process.stdout.write(`\r${progress.message}                    `);
    }
  });

  const result = await pipeline.render();
  process.stdout.write('\n');
  console.log(`✅ ${result.output} (${result.frames} frames in ${result.duration.toFixed(2)}s)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
