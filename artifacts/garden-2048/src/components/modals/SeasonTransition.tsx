/* ============================================================
 * SeasonTransition.tsx
 * 옵션 C — 자연 현상 레이어 기반 계절 전환
 *
 * 이모지 파티클 대신 SVG path 로 그려서 일러스트 톤 통일
 *   summer → sunshine rays (radial gradient + sparkle)
 *   autumn → falling leaves (leaf path, 자연 낙하)
 *   winter → snowfall (snowflake path, 천천히)
 *   spring → drifting petals
 *
 * Phase 구조 (총 ≈ 4.0s)
 *   phase 0 (0 ~ 1.2s):  BG crossfade (이전 → 새 계절) + from 파티클 낙하
 *   phase 1 (1.2 ~ 3.5s): 새 계절 SVG 자연 현상 full play
 *   phase 2 (3.5 ~ 4.0s): 전체 fade-out → onDone
 *
 * 파티클 duration 2.2~3.4s + delay 음수 → 첫 파티클은 4s 안에 바닥 도달
 *
 * loopPhase 지정 시 자동 진행 안 함 (phase만 무한 반복 재생)
 * ============================================================ */

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Season } from "@/utils/seasonData";
import { useTranslation } from "@/i18n";

interface SeasonTransitionProps {
  from: Season;
  to:   Season;
  onDone: () => void;
  /** 디버그용: 특정 phase 만 무한 루프 재생 */
  loopPhase?: 0 | 1 | 2;
}

/* ── 계절 메타 (색 + 라벨 + 카피) ─────────────────── */
interface SeasonMeta {
  labelEn:  string;
  labelKo:  string;
  leaveKo:  string;    // "봄이 가고 있습니다."
  leaveEn:  string;    // "Spring is fading"
  arriveKo: string;    // "봄이 왔습니다."
  arriveEn: string;    // "Spring has arrived"
  bgTint:   string;
  glow:     string;    // 부드러운 후광 (밝은 톤)
  outline:  string;    // 텍스트 외곽선 (계절 톤의 진한 색)
  textCol:  string;
}

const SEASON_META: Record<Season, SeasonMeta> = {
  spring: {
    labelEn: "SPRING", labelKo: "봄",
    leaveKo: "봄이 가고 있습니다.",  leaveEn: "Spring is fading",
    arriveKo: "봄이 왔습니다.",      arriveEn: "Spring has arrived",
    bgTint:  "rgba(255, 210, 225, 0.35)",
    glow:    "rgba(255,150,180,0.7)",
    outline: "rgba(124, 24, 64, 0.9)",   /* 진한 로즈 */
    textCol: "#6B1F3D",
  },
  summer: {
    labelEn: "SUMMER", labelKo: "여름",
    leaveKo: "여름이 가고 있습니다.", leaveEn: "Summer is fading",
    arriveKo: "여름이 왔습니다.",     arriveEn: "Summer has arrived",
    bgTint:  "rgba(255, 220, 140, 0.30)",
    glow:    "rgba(255,190, 80,0.7)",
    outline: "rgba(110, 60,  0, 0.9)",   /* 진한 앰버/카라멜 */
    textCol: "#5A3200",
  },
  autumn: {
    labelEn: "AUTUMN", labelKo: "가을",
    leaveKo: "가을이 가고 있습니다.", leaveEn: "Autumn is fading",
    arriveKo: "가을이 왔습니다.",     arriveEn: "Autumn has arrived",
    bgTint:  "rgba(235, 140,  70, 0.32)",
    glow:    "rgba(220,110, 40,0.7)",
    outline: "rgba( 88, 26,  0, 0.92)",  /* 진한 러스트 */
    textCol: "#4A1E00",
  },
  winter: {
    labelEn: "WINTER", labelKo: "겨울",
    leaveKo: "겨울이 가고 있습니다.", leaveEn: "Winter is fading",
    arriveKo: "겨울이 왔습니다.",     arriveEn: "Winter has arrived",
    bgTint:  "rgba(190, 215, 240, 0.38)",
    glow:    "rgba(130,200,255,0.7)",
    outline: "rgba( 14, 40,  86, 0.92)", /* 진한 네이비 */
    textCol: "#12305A",
  },
};

/* ── SVG 파티클 정의 — 계절별 path + 색 팔레트 ──── */
type ParticleKind = "petal" | "leaf" | "snow" | "ray";

const PARTICLE_KIND: Record<Season, ParticleKind> = {
  spring: "petal",
  summer: "ray",
  autumn: "leaf",
  winter: "snow",
};

const PALETTES: Record<Season, string[]> = {
  spring: ["#FFB3C8", "#F48DAA", "#FFC9D7", "#E67BA0"],
  summer: ["#FFE28A", "#FFC857", "#FFB000", "#FFD76A"],
  autumn: ["#E97B2A", "#C24A14", "#D9632A", "#A63A10", "#E8A24A"],
  winter: ["#EAF4FF", "#C8DCF0", "#FFFFFF", "#B6CFE6"],
};

/* ── 파티클 geometry ─────────────────────────────── */
interface Particle {
  id:       number;
  left:     number;   // %
  startTop: number;   // vh — 시작 수직 위치 (-30 ~ -200 으로 분산)
  size:     number;   // px
  color:    string;
  delay:    number;   // s — 음수 가능 (이미 떨어지는 중인 효과)
  duration: number;   // s
  drift:    number;   // px horizontal sway
  rotate:   number;   // deg initial
}

function makeParticles(season: Season, count: number, seed: number): Particle[] {
  const palette = PALETTES[season];
  const rand = (i: number) => {
    const x = Math.sin(seed * 9301 + i * 49297) * 233280;
    return x - Math.floor(x);
  };
  return Array.from({ length: count }, (_, i) => ({
    id:       i,
    left:     rand(i * 3) * 100,
    /* 일부는 화면 위쪽, 일부는 훨씬 위에서 시작 → 항상 전체 화면에 분포 */
    startTop: -30 - rand(i * 23) * 160,
    size:     16 + rand(i * 5) * 26,
    color:    palette[Math.floor(rand(i * 7) * palette.length)],
    /* 음수 delay 사용 → 일부는 이미 진행 중인 상태로 시작 (즉시 화면 전체에 분포)
       총 4s 영상 안에 첫 파티클이 바닥까지 도달하도록 delay·duration 단축 */
    delay:    -rand(i * 11) * 1.8,
    duration: 2.2 + rand(i * 13) * 1.2,
    drift:    (rand(i * 17) - 0.5) * 220,
    rotate:   rand(i * 19) * 360,
  }));
}

/* ── 개별 파티클 SVG ─────────────────────────────── */
function ParticleSVG({ kind, color, size }: { kind: ParticleKind; color: string; size: number }) {
  if (kind === "leaf") {
    /* 단풍잎 — tear-drop 형태로 단순화 */
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
        <path
          d="M12 2 C 6 6, 4 14, 12 22 C 20 14, 18 6, 12 2 Z"
          fill={color}
          opacity="0.92"
        />
        <path d="M12 4 L12 20" stroke="rgba(0,0,0,0.18)" strokeWidth="0.8" />
      </svg>
    );
  }
  if (kind === "petal") {
    /* 벚꽃잎 — 한 장 */
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
        <path
          d="M12 3 C 7 7, 7 15, 12 21 C 17 15, 17 7, 12 3 Z"
          fill={color}
          opacity="0.88"
        />
      </svg>
    );
  }
  if (kind === "snow") {
    /* 눈송이 — 6각 별 단순화 */
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
        <g stroke={color} strokeWidth="1.6" strokeLinecap="round" opacity="0.95">
          <line x1="12" y1="3" x2="12" y2="21" />
          <line x1="4.2" y1="7.5" x2="19.8" y2="16.5" />
          <line x1="4.2" y1="16.5" x2="19.8" y2="7.5" />
        </g>
        <circle cx="12" cy="12" r="1.6" fill={color} />
      </svg>
    );
  }
  /* ray — 햇살 한 줄기 */
  return (
    <svg width={size * 1.3} height={size * 1.3} viewBox="0 0 24 24" style={{ display: "block" }}>
      <defs>
        <radialGradient id={`ray-${color}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={color} stopOpacity="0.95" />
          <stop offset="70%"  stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill={`url(#ray-${color})`} />
    </svg>
  );
}

/* ============================================================
 * 메인 컴포넌트
 * ============================================================ */
export function SeasonTransition({ from, to, onDone, loopPhase }: SeasonTransitionProps) {
  const { lang } = useTranslation();
  const fromMeta = SEASON_META[from];
  const toMeta   = SEASON_META[to];

  const [phase, setPhase] = useState<0 | 1 | 2>(loopPhase ?? 0);

  useEffect(() => {
    if (loopPhase !== undefined) return;
    const t1 = setTimeout(() => setPhase(1), 1200);
    const t2 = setTimeout(() => setPhase(2), 3500);
    const t3 = setTimeout(() => onDone(),    4000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone, loopPhase]);

  const fromParticles = useMemo(() => makeParticles(from, 28, 1), [from]);
  const toParticles   = useMemo(() => makeParticles(to,   55, 2), [to]);

  /* phase 0/1에서만 파티클 렌더
     loop 모드면 해당 phase의 파티클만 반복 */
  const showFromParticles = phase === 0 || (loopPhase === 0);
  const showToParticles   = phase === 1 || (loopPhase === 1);

  /* fade-out phase의 투명도 */
  const overlayOpacity = phase === 2 ? 0 : 1;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] pointer-events-none overflow-hidden"
      style={{
        opacity:    overlayOpacity,
        transition: loopPhase !== undefined ? "none" : "opacity 0.5s ease-out",
      }}
    >
      {/* ── 배경 틴트 crossfade (이전 → 새 계절) ───────── */}
      <div style={{
        position: "absolute", inset: 0,
        background: fromMeta.bgTint,
        opacity:    phase === 0 ? 1 : 0,
        transition: loopPhase !== undefined ? "none" : "opacity 1.0s ease-in-out",
        mixBlendMode: "multiply",
      }} />
      <div style={{
        position: "absolute", inset: 0,
        background: toMeta.bgTint,
        opacity:    phase === 0 ? 0 : 1,
        transition: loopPhase !== undefined ? "none" : "opacity 1.0s ease-in-out",
        mixBlendMode: "multiply",
      }} />

      {/* ── 이전 계절 파티클 (위→아래 천천히 낙하하며 사라짐) ──
           startTop 분산 + 음수 delay → 화면 전체에 즉시 분포      */}
      {showFromParticles && fromParticles.map((p) => {
        const kind = PARTICLE_KIND[from];
        const anim = kind === "ray"
          ? `seasonRayPulse ${p.duration * 0.5}s ease-in-out ${p.delay}s ${loopPhase === 0 ? "infinite" : "forwards"}`
          : `seasonParticleFall ${p.duration}s linear ${p.delay}s ${loopPhase === 0 ? "infinite" : "forwards"}`;
        return (
          <span
            key={`from-${p.id}`}
            style={{
              position:  "absolute",
              left:      `${p.left}%`,
              top:       kind === "ray" ? `${(p.id * 11) % 100}%` : `${p.startTop}vh`,
              animation: anim,
              ["--drift" as any]: `${p.drift}px`,
              ["--rot"   as any]: `${p.rotate}deg`,
            }}
          >
            <ParticleSVG kind={kind} color={p.color} size={p.size} />
          </span>
        );
      })}

      {/* ── 새 계절 파티클 (위→아래 낙하, 화면 전체 분포) ── */}
      {showToParticles && toParticles.map((p) => {
        const kind = PARTICLE_KIND[to];
        const anim = kind === "ray"
          ? `seasonRayPulse ${p.duration * 0.5}s ease-in-out ${p.delay}s ${loopPhase === 1 ? "infinite" : "forwards"}`
          : `seasonParticleFall ${p.duration}s linear ${p.delay}s ${loopPhase === 1 ? "infinite" : "forwards"}`;
        return (
          <span
            key={`to-${p.id}`}
            style={{
              position:  "absolute",
              left:      `${p.left}%`,
              top:       kind === "ray" ? `${(p.id * 7) % 100}%` : `${p.startTop}vh`,
              animation: anim,
              ["--drift" as any]: `${p.drift}px`,
              ["--rot"   as any]: `${p.rotate}deg`,
            }}
          >
            <ParticleSVG kind={kind} color={p.color} size={p.size} />
          </span>
        );
      })}

      {/* ── 중앙 라벨 (현재 언어만 표시, 외곽선은 계절색으로 동적 변화) ── */}
      {(() => {
        const meta    = phase === 0 ? fromMeta : toMeta;
        const outline = meta.outline;
        const glow    = meta.glow;
        const text = lang === "ko"
          ? (phase === 0 ? fromMeta.leaveKo : toMeta.arriveKo)
          : (phase === 0 ? fromMeta.leaveEn : toMeta.arriveEn);
        return (
          <div
            style={{
              position:  "absolute",
              top:       "44%",
              left:      "50%",
              transform: `translate(-50%, -50%) scale(${phase === 0 ? 0.96 : 1})`,
              textAlign: "center",
              opacity:   phase === 0 ? 0.92 : phase === 1 ? 1 : 0.85,
              transition: loopPhase !== undefined ? "none" : "opacity 0.8s ease, transform 0.8s ease",
              whiteSpace: "nowrap",
            }}
          >
            <div
              style={{
                fontSize:      lang === "ko" ? 28 : 26,
                fontWeight:    900,
                letterSpacing: lang === "ko" ? "0.01em" : "0.04em",
                lineHeight:    1.2,
                color:         "#FFFFFF",
                whiteSpace:    "nowrap",
                textShadow: [
                  /* 8방향 외곽선 (계절색) — 두께 2px */
                  `-2px -2px 0 ${outline}`,
                  ` 2px -2px 0 ${outline}`,
                  `-2px  2px 0 ${outline}`,
                  ` 2px  2px 0 ${outline}`,
                  ` 0   -2px 0 ${outline}`,
                  ` 0    2px 0 ${outline}`,
                  `-2px  0   0 ${outline}`,
                  ` 2px  0   0 ${outline}`,
                  /* 1px AA 보강 layer */
                  `-1px -1px 0 ${outline}`,
                  ` 1px  1px 0 ${outline}`,
                  /* 어둠 그림자 + 계절 글로우 */
                  `0 4px 14px rgba(0,0,0,0.45)`,
                  `0 0 26px ${glow}`,
                ].join(", "),
                transition:    loopPhase !== undefined ? "none" : "text-shadow 1s ease",
              }}
            >
              {text}
            </div>
          </div>
        );
      })()}
    </div>,
    document.body,
  );
}
