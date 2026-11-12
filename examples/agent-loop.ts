/**
 * Example: "The Agent Loop" — a bright, seamlessly looping hero diagram.
 *
 * Design goals:
 *  - Legible at README width (1280x800 at 25fps, 8s loop)
 *  - Light "aurora paper" visual language: white canvas, pastel light, crisp ink
 *  - More life without clutter: floating motes, orbiting accents, stage lift,
 *    connector pulses and a breathing active card
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
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="0.52" stop-color="#FDFDFF"/>
      <stop offset="1" stop-color="#F7F9FE"/>
    </linearGradient>

    <radialGradient id="auroraViolet" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#A78BFA" stop-opacity="0.20"/>
      <stop offset="0.45" stop-color="#C4B5FD" stop-opacity="0.09"/>
      <stop offset="1" stop-color="#DDD6FE" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="auroraEmerald" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#6EE7B7" stop-opacity="0.16"/>
      <stop offset="0.5" stop-color="#A7F3D0" stop-opacity="0.07"/>
      <stop offset="1" stop-color="#D1FAE5" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="auroraRose" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#FDA4AF" stop-opacity="0.14"/>
      <stop offset="0.5" stop-color="#FECDD3" stop-opacity="0.06"/>
      <stop offset="1" stop-color="#FFE4E6" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="auroraBlue" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#93C5FD" stop-opacity="0.14"/>
      <stop offset="1" stop-color="#DBEAFE" stop-opacity="0"/>
    </radialGradient>

    <filter id="cardShadow" x="-15%" y="-15%" width="130%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#0F172A" flood-opacity="0.07"/>
    </filter>
    <filter id="panelShadow" x="-12%" y="-12%" width="124%" height="132%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#0F172A" flood-opacity="0.05"/>
    </filter>

    <linearGradient id="titleGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#0B1220"/>
      <stop offset="0.58" stop-color="#1E1B4B"/>
      <stop offset="1" stop-color="#4338CA"/>
    </linearGradient>

    <linearGradient id="violetGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#A78BFA"/>
      <stop offset="1" stop-color="#7C3AED"/>
    </linearGradient>
    <linearGradient id="emeraldGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6EE7B7"/>
      <stop offset="1" stop-color="#059669"/>
    </linearGradient>
    <linearGradient id="roseGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FDA4AF"/>
      <stop offset="1" stop-color="#E11D48"/>
    </linearGradient>

    <linearGradient id="flowViolet" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#8B5CF6" stop-opacity="0.16"/>
      <stop offset="0.5" stop-color="#8B5CF6" stop-opacity="0.80"/>
      <stop offset="1" stop-color="#10B981" stop-opacity="0.62"/>
    </linearGradient>
    <linearGradient id="flowEmerald" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#10B981" stop-opacity="0.62"/>
      <stop offset="0.5" stop-color="#059669" stop-opacity="0.80"/>
      <stop offset="1" stop-color="#F43F5E" stop-opacity="0.62"/>
    </linearGradient>
    <linearGradient id="railGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#8B5CF6" stop-opacity="0.65"/>
      <stop offset="0.5" stop-color="#64748B" stop-opacity="0.30"/>
      <stop offset="1" stop-color="#F43F5E" stop-opacity="0.65"/>
    </linearGradient>
    <linearGradient id="divider" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#0F172A" stop-opacity="0"/>
      <stop offset="0.12" stop-color="#0F172A" stop-opacity="0.12"/>
      <stop offset="0.5" stop-color="#0F172A" stop-opacity="0.05"/>
      <stop offset="0.88" stop-color="#0F172A" stop-opacity="0.12"/>
      <stop offset="1" stop-color="#0F172A" stop-opacity="0"/>
    </linearGradient>

    <radialGradient id="iconViolet" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#8B5CF6" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#8B5CF6" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="iconEmerald" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#10B981" stop-opacity="0.26"/>
      <stop offset="1" stop-color="#10B981" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="iconRose" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#F43F5E" stop-opacity="0.24"/>
      <stop offset="1" stop-color="#F43F5E" stop-opacity="0"/>
    </radialGradient>

    <linearGradient id="barViolet" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#A78BFA"/>
      <stop offset="1" stop-color="#7C3AED"/>
    </linearGradient>
    <linearGradient id="barEmerald" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#6EE7B7"/>
      <stop offset="1" stop-color="#059669"/>
    </linearGradient>
    <linearGradient id="barRose" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#FDA4AF"/>
      <stop offset="1" stop-color="#E11D48"/>
    </linearGradient>

    <pattern id="dotGrid" width="32" height="32" patternUnits="userSpaceOnUse">
      <circle cx="1.4" cy="1.4" r="1.1" fill="#334155" opacity="0.055"/>
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
    .stage-card { animation: cardLift 8s cubic-bezier(.4, 0, .2, 1) infinite; }
    @keyframes cardLift {
      0%   { transform: translateY(-4px); }
      30%  { transform: translateY(-4px); }
      38%  { transform: translateY(0); }
      90%  { transform: translateY(0); }
      100% { transform: translateY(-4px); }
    }
    .p1 { animation-delay: 0s; }
    .p2 { animation-delay: -5.3333s; }
    .p3 { animation-delay: -2.6667s; }
    .stage-glow { animation: stageGlow 8s ease-in-out infinite; }
    .g1 { animation-delay: 0s; }
    .g2 { animation-delay: -5.3333s; }
    .g3 { animation-delay: -2.6667s; }
    @keyframes stageGlow {
      0%   { opacity: 0.96; }
      30%  { opacity: 0.96; }
      38%  { opacity: 0.16; }
      90%  { opacity: 0.12; }
      100% { opacity: 0.96; }
    }
    .stage-wash { animation: stageWash 8s ease-in-out infinite; }
    @keyframes stageWash {
      0%   { opacity: 0.07; }
      30%  { opacity: 0.07; }
      38%  { opacity: 0; }
      90%  { opacity: 0; }
      100% { opacity: 0.07; }
    }
    .halo { animation: haloPulse 8s ease-in-out infinite; }
    @keyframes haloPulse {
      0%   { opacity: 0.70; }
      30%  { opacity: 0.70; }
      38%  { opacity: 0.16; }
      90%  { opacity: 0.12; }
      100% { opacity: 0.70; }
    }
    .icon-bob { animation: iconBob 8s cubic-bezier(.4, 0, .2, 1) infinite; }
    @keyframes iconBob {
      0%   { transform: translateY(-3px); }
      30%  { transform: translateY(-3px); }
      38%  { transform: translateY(0); }
      90%  { transform: translateY(0); }
      100% { transform: translateY(-3px); }
    }
    .orbit {
      transform-box: fill-box;
      transform-origin: center;
      animation: orbitSpin 8s linear infinite;
    }
    @keyframes orbitSpin { to { transform: rotate(360deg); } }
    .flow { stroke-dasharray: 4 10; animation: dashFlow 1.6s linear infinite; }
    @keyframes dashFlow { to { stroke-dashoffset: -56; } }
    .signal { animation: signalPulse 2s ease-in-out infinite; }
    @keyframes signalPulse {
      0%, 100% { opacity: 0.26; }
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
      0%, 100% { opacity: 0.74; }
      50%      { opacity: 1; }
    }
    .blob {
      transform-box: fill-box;
      transform-origin: center;
      animation: blobDrift 8s ease-in-out infinite;
    }
    @keyframes blobDrift {
      0%, 100% { transform: translate(0, 0) scale(1); }
      50%      { transform: translate(10px, -8px) scale(1.035); }
    }
    .b1 { animation-delay: 0s; }
    .b2 { animation-delay: -2s; }
    .b3 { animation-delay: -4s; }
    .b4 { animation-delay: -6s; }
    .mote { animation: moteFloat 8s ease-in-out infinite; }
    @keyframes moteFloat {
      0%, 100% { transform: translate(0, 0); }
      25%      { transform: translate(6px, -10px); }
      50%      { transform: translate(-4px, -16px); }
      75%      { transform: translate(-8px, -6px); }
    }
    .m1 { animation-delay: 0s; }
    .m2 { animation-delay: -1s; }
    .m3 { animation-delay: -2s; }
    .m4 { animation-delay: -3s; }
    .m5 { animation-delay: -4s; }
    .m6 { animation-delay: -5s; }
    .m7 { animation-delay: -6s; }
    .m8 { animation-delay: -7s; }
    .spark {
      transform-box: fill-box;
      transform-origin: center;
      animation: twinkle 2s ease-in-out infinite;
    }
    @keyframes twinkle {
      0%, 100% { opacity: 0.16; transform: scale(0.72); }
      50%      { opacity: 0.92; transform: scale(1.12); }
    }
    .t1 { animation-delay: -0.2s; }
    .t2 { animation-delay: -0.8s; }
    .t3 { animation-delay: -1.4s; }
    .status-dot { animation: statusPulse 2s ease-in-out infinite; }
    @keyframes statusPulse {
      0%, 100% { opacity: 1; }
      50%      { opacity: 0.35; }
    }
    /* Re-apply stage offsets after the shorthand declarations above. */
    .stage-wash.g1, .icon-bob.p1 { animation-delay: 0s; }
    .stage-wash.g2, .icon-bob.p2 { animation-delay: -5.3333s; }
    .stage-wash.g3, .icon-bob.p3 { animation-delay: -2.6667s; }
  </style>

  <!-- Background -->
  <rect width="1280" height="800" fill="#FFFFFF"/>
  <g>
    <ellipse cx="142" cy="108" rx="430" ry="280" fill="url(#auroraViolet)" opacity="0.95"/>
    <ellipse cx="1136" cy="250" rx="410" ry="270" fill="url(#auroraEmerald)" opacity="0.90"/>
    <ellipse cx="900" cy="790" rx="470" ry="250" fill="url(#auroraRose)" opacity="0.85"/>
    <ellipse cx="706" cy="408" rx="380" ry="250" fill="url(#auroraBlue)" opacity="0.75"/>
  </g>

  <!-- Floating motes -->
  <g>
    <circle class="mote m1" cx="168" cy="122" r="2.6" fill="#A78BFA" opacity="0.42"/>
    <circle class="mote m2" cx="342" cy="84" r="2" fill="#FDA4AF" opacity="0.48"/>
    <circle class="mote m3" cx="522" cy="148" r="2.2" fill="#6EE7B7" opacity="0.48"/>
    <circle class="mote m4" cx="766" cy="98" r="2.8" fill="#93C5FD" opacity="0.42"/>
    <circle class="mote m5" cx="1008" cy="132" r="2" fill="#A78BFA" opacity="0.46"/>
    <circle class="mote m6" cx="1174" cy="174" r="2.5" fill="#6EE7B7" opacity="0.40"/>
    <circle class="mote m7" cx="112" cy="690" r="2.1" fill="#FDA4AF" opacity="0.38"/>
    <circle class="mote m8" cx="432" cy="732" r="2.2" fill="#A78BFA" opacity="0.36"/>
    <circle class="mote m1" cx="904" cy="740" r="2" fill="#6EE7B7" opacity="0.36"/>
    <circle class="mote m5" cx="1182" cy="708" r="2.4" fill="#93C5FD" opacity="0.38"/>
  </g>

  <!-- Framing marks -->
  <g stroke="#94A3B8" stroke-opacity="0.40" stroke-width="1" fill="none">
    <path d="M40 54 V40 H54"/>
    <path d="M1226 40 H1240 V54"/>
    <path d="M40 746 V760 H54"/>
    <path d="M1226 760 H1240 V746"/>
  </g>
  <path d="M64 196 H1216" stroke="url(#divider)" stroke-width="1"/>

  <!-- Header -->
  <g>
    <rect x="64" y="52" width="32" height="32" rx="10" fill="url(#violetGrad)"/>
    <path d="M80 58 L82.4 66.6 L91 69 L82.4 71.4 L80 80 L77.6 71.4 L69 69 L77.6 66.6 Z" fill="#FFFFFF" opacity="0.97"/>
    <g class="orbit">
      <circle cx="80" cy="68" r="23" fill="none" stroke="#C4B5FD" stroke-width="1" stroke-dasharray="3 7" opacity="0.75"/>
      <circle cx="80" cy="45" r="2.2" fill="#7C3AED"/>
    </g>
    <text x="108" y="73" class="mono" font-size="10.5" letter-spacing="2.6" fill="#64748B">ATLAS / AGENT SYSTEMS</text>

    <text x="64" y="138" font-size="47" font-weight="600" letter-spacing="-1.4" fill="url(#titleGrad)">The Agent Loop</text>
    <text x="64" y="171" font-size="16.5" letter-spacing="0.1" fill="#64748B">A reasoning system that thinks, acts, and learns — one turn at a time.</text>

    <g class="spark t1">
      <path d="M436 86 L438 92 L444 94 L438 96 L436 102 L434 96 L428 94 L434 92 Z" fill="#8B5CF6"/>
    </g>
    <g class="spark t2">
      <path d="M474 116 L475.6 120 L480 121.6 L475.6 123.2 L474 127 L472.4 123.2 L468 121.6 L472.4 120 Z" fill="#10B981"/>
    </g>
    <g class="spark t3">
      <path d="M404 118 L405.4 122 L409 123.4 L405.4 124.8 L404 129 L402.6 124.8 L399 123.4 L402.6 122 Z" fill="#F43F5E"/>
    </g>

    <g>
      <rect x="982" y="54" width="234" height="36" rx="18" fill="#ECFDF5" stroke="#A7F3D0" stroke-opacity="0.85"/>
      <circle cx="1002" cy="72" r="4" fill="#10B981"/>
      <circle cx="1002" cy="72" r="7.5" fill="none" stroke="#10B981" stroke-opacity="0.30"/>
      <text x="1018" y="76" class="mono" font-size="10.5" letter-spacing="1.9" fill="#047857">AUTONOMOUS RUN</text>
    </g>
    <text x="1216" y="112" text-anchor="end" class="mono" font-size="10" letter-spacing="1.6" fill="#94A3B8">8.0 SEC · SEAMLESS LOOP</text>
  </g>

  <!-- Orbit guide -->
  <ellipse cx="640" cy="356" rx="592" ry="296" fill="none" stroke="#0F172A" stroke-opacity="0.035"/>

  <!-- Connectors -->
  <g>
    <path id="linkThinkAct" d="M394 350 H452" stroke="#CBD5E1" stroke-opacity="0.75" stroke-width="1.4"/>
    <path d="M394 350 H452" stroke="url(#flowViolet)" stroke-width="1.7" class="flow"/>
    <path d="M446 343 L456 350 L446 357" fill="none" stroke="#7C3AED" stroke-opacity="0.9" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    <circle r="3" fill="#7C3AED" opacity="0.95">
      <animateMotion dur="4s" repeatCount="indefinite"><mpath href="#linkThinkAct"/></animateMotion>
    </circle>
    <circle r="1.8" fill="#10B981" opacity="0.9">
      <animateMotion dur="4s" begin="-2s" repeatCount="indefinite"><mpath href="#linkThinkAct"/></animateMotion>
    </circle>
    <text x="423" y="332" text-anchor="middle" class="mono" font-size="8.5" letter-spacing="1.7" fill="#94A3B8">CONTEXT</text>

    <path id="linkActObserve" d="M810 350 H868" stroke="#CBD5E1" stroke-opacity="0.75" stroke-width="1.4"/>
    <path d="M810 350 H868" stroke="url(#flowEmerald)" stroke-width="1.7" class="flow"/>
    <path d="M862 343 L872 350 L862 357" fill="none" stroke="#059669" stroke-opacity="0.9" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    <circle r="3" fill="#059669" opacity="0.95">
      <animateMotion dur="4s" repeatCount="indefinite"><mpath href="#linkActObserve"/></animateMotion>
    </circle>
    <circle r="1.8" fill="#E11D48" opacity="0.9">
      <animateMotion dur="4s" begin="-2s" repeatCount="indefinite"><mpath href="#linkActObserve"/></animateMotion>
    </circle>
    <text x="839" y="332" text-anchor="middle" class="mono" font-size="8.5" letter-spacing="1.7" fill="#94A3B8">OUTCOME</text>
  </g>

  <!-- Stage 01: Think -->
  <g class="stage-card p1">
    <rect x="64" y="224" width="320" height="252" rx="22" fill="#FFFFFF" stroke="#E2E8F0"/>
    <rect x="64" y="224" width="320" height="252" rx="22" fill="#7C3AED" class="stage-wash g1"/>
    <rect x="64" y="224" width="320" height="252" rx="22" fill="none" stroke="#7C3AED" stroke-width="1.5" class="stage-glow g1"/>
    <path d="M92 224.5 H172" stroke="url(#violetGrad)" stroke-width="2.4" stroke-linecap="round"/>
    <text x="360" y="253" text-anchor="end" class="mono" font-size="10.5" letter-spacing="1.4" fill="#94A3B8">STEP 01</text>

    <g class="icon-bob p1">
      <rect x="88" y="248" width="46" height="46" rx="13" fill="#F5F3FF" stroke="#DDD6FE"/>
      <g class="orbit">
        <circle cx="111" cy="271" r="31" fill="none" stroke="#C4B5FD" stroke-width="1" stroke-dasharray="3 7" opacity="0.85"/>
        <circle cx="111" cy="240" r="2.6" fill="#7C3AED"/>
        <circle cx="136" cy="284" r="1.7" fill="#A78BFA"/>
      </g>
      <path d="M111 257 L113.4 267.6 L124 270 L113.4 272.4 L111 283 L108.6 272.4 L98 270 L108.6 267.6 Z" fill="#7C3AED"/>
    </g>
    <g class="spark t2">
      <path d="M145 243 L146.4 247 L150 248.4 L146.4 249.8 L145 254 L143.6 249.8 L140 248.4 L143.6 247 Z" fill="#A78BFA"/>
    </g>

    <text x="148" y="272" font-size="23" font-weight="600" letter-spacing="-0.3" fill="#0F172A">Think</text>
    <text x="149" y="294" font-size="12" letter-spacing="0.2" fill="#64748B">Reasoning &amp; planning</text>

    <text x="88" y="334" font-size="14" letter-spacing="0.05" fill="#475569">Decompose the goal. Weigh evidence.</text>
    <text x="88" y="356" font-size="14" letter-spacing="0.05" fill="#475569">Choose the next best action.</text>

    <g>
      <rect x="88" y="380" width="54" height="24" rx="8" fill="#F8FAFC" stroke="#E2E8F0"/>
      <text x="115" y="396" text-anchor="middle" class="mono" font-size="9" letter-spacing="1.1" fill="#64748B">PLAN</text>
      <rect x="150" y="380" width="66" height="24" rx="8" fill="#F8FAFC" stroke="#E2E8F0"/>
      <text x="183" y="396" text-anchor="middle" class="mono" font-size="9" letter-spacing="1.1" fill="#64748B">REASON</text>
      <rect x="224" y="380" width="70" height="24" rx="8" fill="#F8FAFC" stroke="#E2E8F0"/>
      <text x="259" y="396" text-anchor="middle" class="mono" font-size="9" letter-spacing="1.1" fill="#64748B">REFLECT</text>
    </g>

    <text x="88" y="452" class="mono" font-size="8.5" letter-spacing="1.5" fill="#94A3B8">SIGNAL</text>
    <g fill="#7C3AED">
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
    <text x="360" y="452" text-anchor="end" class="mono" font-size="9" letter-spacing="0.8" fill="#6D28D9">0.8s</text>
  </g>

  <!-- Stage 02: Act -->
  <g class="stage-card p2">
    <rect x="480" y="224" width="320" height="252" rx="22" fill="#FFFFFF" stroke="#E2E8F0"/>
    <rect x="480" y="224" width="320" height="252" rx="22" fill="#059669" class="stage-wash g2"/>
    <rect x="480" y="224" width="320" height="252" rx="22" fill="none" stroke="#059669" stroke-width="1.5" class="stage-glow g2"/>
    <path d="M508 224.5 H588" stroke="url(#emeraldGrad)" stroke-width="2.4" stroke-linecap="round"/>
    <text x="776" y="253" text-anchor="end" class="mono" font-size="10.5" letter-spacing="1.4" fill="#94A3B8">STEP 02</text>

    <g class="icon-bob p2">
      <rect x="504" y="248" width="46" height="46" rx="13" fill="#ECFDF5" stroke="#A7F3D0"/>
      <g class="orbit">
        <circle cx="527" cy="271" r="31" fill="none" stroke="#6EE7B7" stroke-width="1" stroke-dasharray="3 7" opacity="0.85"/>
        <circle cx="527" cy="240" r="2.6" fill="#059669"/>
        <circle cx="552" cy="284" r="1.7" fill="#34D399"/>
      </g>
      <path d="M531 257 L518 273 H526 L522 285 L536 268 H528 Z" fill="#059669"/>
    </g>
    <g class="spark t3">
      <path d="M561 243 L562.4 247 L566 248.4 L562.4 249.8 L561 254 L559.6 249.8 L556 248.4 L559.6 247 Z" fill="#34D399"/>
    </g>

    <text x="564" y="272" font-size="23" font-weight="600" letter-spacing="-0.3" fill="#0F172A">Act</text>
    <text x="565" y="294" font-size="12" letter-spacing="0.2" fill="#64748B">Tool use &amp; execution</text>

    <text x="504" y="334" font-size="14" letter-spacing="0.05" fill="#475569">Call tools and write code with</text>
    <text x="504" y="356" font-size="14" letter-spacing="0.05" fill="#475569">precise, sandboxed side effects.</text>

    <g>
      <rect x="504" y="380" width="58" height="24" rx="8" fill="#F8FAFC" stroke="#E2E8F0"/>
      <text x="533" y="396" text-anchor="middle" class="mono" font-size="9" letter-spacing="1.1" fill="#64748B">TOOLS</text>
      <rect x="570" y="380" width="54" height="24" rx="8" fill="#F8FAFC" stroke="#E2E8F0"/>
      <text x="597" y="396" text-anchor="middle" class="mono" font-size="9" letter-spacing="1.1" fill="#64748B">CODE</text>
      <rect x="632" y="380" width="52" height="24" rx="8" fill="#F8FAFC" stroke="#E2E8F0"/>
      <text x="658" y="396" text-anchor="middle" class="mono" font-size="9" letter-spacing="1.1" fill="#64748B">API</text>
    </g>

    <text x="504" y="452" class="mono" font-size="8.5" letter-spacing="1.5" fill="#94A3B8">SIGNAL</text>
    <g fill="#059669">
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
    <text x="776" y="452" text-anchor="end" class="mono" font-size="9" letter-spacing="0.8" fill="#047857">1.6s</text>
  </g>

  <!-- Stage 03: Observe -->
  <g class="stage-card p3">
    <rect x="896" y="224" width="320" height="252" rx="22" fill="#FFFFFF" stroke="#E2E8F0"/>
    <rect x="896" y="224" width="320" height="252" rx="22" fill="#E11D48" class="stage-wash g3"/>
    <rect x="896" y="224" width="320" height="252" rx="22" fill="none" stroke="#E11D48" stroke-width="1.5" class="stage-glow g3"/>
    <path d="M924 224.5 H1004" stroke="url(#roseGrad)" stroke-width="2.4" stroke-linecap="round"/>
    <text x="1192" y="253" text-anchor="end" class="mono" font-size="10.5" letter-spacing="1.4" fill="#94A3B8">STEP 03</text>

    <g class="icon-bob p3">
      <rect x="920" y="248" width="46" height="46" rx="13" fill="#FFF1F2" stroke="#FECDD3"/>
      <g class="orbit">
        <circle cx="943" cy="271" r="31" fill="none" stroke="#FDA4AF" stroke-width="1" stroke-dasharray="3 7" opacity="0.85"/>
        <circle cx="943" cy="240" r="2.6" fill="#E11D48"/>
        <circle cx="968" cy="284" r="1.7" fill="#FB7185"/>
      </g>
      <path d="M931 271 C934 265 938 262 943 262 C948 262 952 265 955 271 C952 277 948 280 943 280 C938 280 934 277 931 271 Z" fill="none" stroke="#E11D48" stroke-width="1.7"/>
      <circle cx="943" cy="271" r="3.4" fill="#E11D48"/>
    </g>
    <g class="spark t1">
      <path d="M977 243 L978.4 247 L982 248.4 L978.4 249.8 L977 254 L975.6 249.8 L972 248.4 L975.6 247 Z" fill="#FB7185"/>
    </g>

    <text x="980" y="272" font-size="23" font-weight="600" letter-spacing="-0.3" fill="#0F172A">Observe</text>
    <text x="981" y="294" font-size="12" letter-spacing="0.2" fill="#64748B">Verification &amp; learning</text>

    <text x="920" y="334" font-size="14" letter-spacing="0.05" fill="#475569">Read the result. Verify the goal.</text>
    <text x="920" y="356" font-size="14" letter-spacing="0.05" fill="#475569">Update the plan and iterate.</text>

    <g>
      <rect x="920" y="380" width="62" height="24" rx="8" fill="#F8FAFC" stroke="#E2E8F0"/>
      <text x="951" y="396" text-anchor="middle" class="mono" font-size="9" letter-spacing="1.1" fill="#64748B">VERIFY</text>
      <rect x="990" y="380" width="58" height="24" rx="8" fill="#F8FAFC" stroke="#E2E8F0"/>
      <text x="1019" y="396" text-anchor="middle" class="mono" font-size="9" letter-spacing="1.1" fill="#64748B">TRACE</text>
      <rect x="1056" y="380" width="58" height="24" rx="8" fill="#F8FAFC" stroke="#E2E8F0"/>
      <text x="1085" y="396" text-anchor="middle" class="mono" font-size="9" letter-spacing="1.1" fill="#64748B">LEARN</text>
    </g>

    <text x="920" y="452" class="mono" font-size="8.5" letter-spacing="1.5" fill="#94A3B8">SIGNAL</text>
    <g fill="#E11D48">
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
    <text x="1192" y="452" text-anchor="end" class="mono" font-size="9" letter-spacing="0.8" fill="#BE123C">2.4s</text>
  </g>

  <!-- Loop rail -->
  <g>
    <path id="loopRail" d="M1056 476 L1056 508 Q1056 536 1028 536 L252 536 Q224 536 224 508 L224 486" fill="none" stroke="#CBD5E1" stroke-opacity="0.75" stroke-width="1.4"/>
    <path d="M1056 476 L1056 508 Q1056 536 1028 536 L252 536 Q224 536 224 508 L224 486" fill="none" stroke="url(#railGrad)" stroke-width="1.7" class="flow"/>
    <path d="M224 478 L218 488 L230 488 Z" fill="#7C3AED" opacity="0.95"/>

    <g>
      <circle r="10" fill="#7C3AED" opacity="0.12"/>
      <circle r="3.2" fill="#7C3AED"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.05;0.95;1" dur="8s" repeatCount="indefinite"/>
      <animateMotion dur="8s" repeatCount="indefinite">
        <mpath href="#loopRail"/>
      </animateMotion>
    </g>
    <g>
      <circle r="7" fill="#E11D48" opacity="0.12"/>
      <circle r="2.4" fill="#E11D48"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.05;0.95;1" dur="8s" repeatCount="indefinite" begin="-4s"/>
      <animateMotion dur="8s" repeatCount="indefinite" begin="-4s">
        <mpath href="#loopRail"/>
      </animateMotion>
    </g>

    <rect x="536" y="520" width="208" height="32" rx="16" fill="#FFFFFF" stroke="#E2E8F0"/>
    <path d="M556 536 A7 7 0 1 1 562 542" fill="none" stroke="#64748B" stroke-width="1.3" stroke-linecap="round"/>
    <path d="M562 536 L562 542 L556 542" fill="none" stroke="#64748B" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="575" y="540" class="mono" font-size="9.5" letter-spacing="1.8" fill="#475569">REPEAT UNTIL DONE</text>
  </g>

  <!-- Capability panels -->
  <g>
    <rect x="64" y="584" width="320" height="122" rx="16" fill="#FFFFFF" stroke="#E2E8F0"/>
    <rect x="64" y="600" width="2" height="90" rx="1" fill="#7C3AED" opacity="0.72"/>
    <rect x="88" y="604" width="32" height="32" rx="9" fill="#F5F3FF" stroke="#DDD6FE"/>
    <g fill="none" stroke="#7C3AED" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="104" cy="611" rx="7" ry="3"/>
      <path d="M97 611 V617 C97 618.7 100.1 620 104 620 C107.9 620 111 618.7 111 617 V611"/>
      <path d="M97 617 V623 C97 624.7 100.1 626 104 626 C107.9 626 111 624.7 111 623 V617"/>
    </g>
    <text x="132" y="617" font-size="14.5" font-weight="600" letter-spacing="0.1" fill="#0F172A">Memory</text>
    <text x="132" y="638" font-size="11.5" letter-spacing="0.1" fill="#64748B">Artifacts, skills, context</text>
    <text x="360" y="620" text-anchor="end" class="mono" font-size="20" fill="#6D28D9">12</text>
    <path d="M88 676 H360" stroke="#EEF2F7" stroke-width="3" stroke-linecap="round"/>
    <path d="M88 676 H244" stroke="url(#barViolet)" stroke-width="3" stroke-linecap="round"/>
    <circle cx="244" cy="676" r="3" fill="#7C3AED" class="status-dot"/>
  </g>

  <g>
    <rect x="480" y="584" width="320" height="122" rx="16" fill="#FFFFFF" stroke="#E2E8F0"/>
    <rect x="480" y="600" width="2" height="90" rx="1" fill="#059669" opacity="0.66"/>
    <rect x="504" y="604" width="32" height="32" rx="9" fill="#ECFDF5" stroke="#A7F3D0"/>
    <path d="M520 608 L527 611 V616 C527 620.5 524 623.5 520 625 C516 623.5 513 620.5 513 616 V611 Z" fill="none" stroke="#059669" stroke-width="1.3" stroke-linejoin="round"/>
    <path d="M517.5 616 L519.5 618 L523 614.5" fill="none" stroke="#059669" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="548" y="617" font-size="14.5" font-weight="600" letter-spacing="0.1" fill="#0F172A">Safety</text>
    <text x="548" y="638" font-size="11.5" letter-spacing="0.1" fill="#64748B">Policy gates and review</text>
    <circle cx="742" cy="614" r="4" fill="#10B981" class="status-dot"/>
    <circle cx="742" cy="614" r="7.5" fill="none" stroke="#10B981" stroke-opacity="0.25"/>
    <text x="776" y="620" text-anchor="end" class="mono" font-size="9" letter-spacing="1.1" fill="#047857">ON</text>
    <path d="M504 676 H776" stroke="#EEF2F7" stroke-width="3" stroke-linecap="round"/>
    <path d="M504 676 H716" stroke="url(#barEmerald)" stroke-width="3" stroke-linecap="round"/>
    <circle cx="716" cy="676" r="3" fill="#059669" class="status-dot"/>
  </g>

  <g>
    <rect x="896" y="584" width="320" height="122" rx="16" fill="#FFFFFF" stroke="#E2E8F0"/>
    <rect x="896" y="600" width="2" height="90" rx="1" fill="#E11D48" opacity="0.62"/>
    <rect x="920" y="604" width="32" height="32" rx="9" fill="#FFF1F2" stroke="#FECDD3"/>
    <g fill="none" stroke="#E11D48" stroke-width="1.3" stroke-linecap="round">
      <path d="M929 612 H943"/>
      <circle cx="932" cy="612" r="1.6" fill="#E11D48"/>
      <path d="M929 618 H943"/>
      <circle cx="938" cy="618" r="1.6" fill="#E11D48"/>
      <path d="M929 624 H943"/>
      <circle cx="934" cy="624" r="1.6" fill="#E11D48"/>
    </g>
    <text x="964" y="617" font-size="14.5" font-weight="600" letter-spacing="0.1" fill="#0F172A">Tools</text>
    <text x="964" y="638" font-size="11.5" letter-spacing="0.1" fill="#64748B">Sandboxed tools and APIs</text>
    <text x="1192" y="620" text-anchor="end" class="mono" font-size="20" fill="#BE123C">42</text>
    <path d="M920 676 H1192" stroke="#EEF2F7" stroke-width="3" stroke-linecap="round"/>
    <path d="M920 676 H1052" stroke="url(#barRose)" stroke-width="3" stroke-linecap="round"/>
    <circle cx="1052" cy="676" r="3" fill="#E11D48" class="status-dot"/>
  </g>

  <!-- Footer -->
  <g class="mono" font-size="9.5" letter-spacing="1.5" fill="#94A3B8">
    <text x="64" y="752">SVG ANIMATION PIPELINE</text>
    <text x="640" y="752" text-anchor="middle" fill="#64748B">THINK → ACT → OBSERVE → REPEAT</text>
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
    background: '#FFFFFF',
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
