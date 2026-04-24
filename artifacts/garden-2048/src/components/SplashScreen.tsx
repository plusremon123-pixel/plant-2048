/* ============================================================
 * SplashScreen.tsx
 * 앱 실행 시마다 표시되는 스플래시 화면 (~2.5s)
 *
 * - /title.svg 로고 페이드인 + 스케일 업
 * - 플로팅 꽃잎 파티클 (핑크 톤 SVG)
 * - 하단 진행 바 (2.5s 채움)
 * - 2.0s에 전체 페이드아웃, 2.5s에 onDone() 호출
 * ============================================================ */

import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";

interface SplashScreenProps {
  onDone: () => void;
}

/* ── 꽃잎 파티클 데이터 ────────────────────────────── */
interface Petal {
  id: number;
  left: number;    // %
  size: number;    // px
  color: string;
  delay: number;   // s
  duration: number; // s
  drift: number;   // px
}

const PETAL_COLORS = ["#FFB3C8", "#F48DAA", "#FFC9D7", "#E67BA0", "#FFCDE0"];

function makePetals(): Petal[] {
  const rand = (i: number) => {
    const x = Math.sin(42 * 9301 + i * 49297) * 233280;
    return x - Math.floor(x);
  };
  return Array.from({ length: 18 }, (_, i) => ({
    id: i,
    left: rand(i * 3) * 100,
    size: 14 + rand(i * 5) * 20,
    color: PETAL_COLORS[Math.floor(rand(i * 7) * PETAL_COLORS.length)],
    delay: rand(i * 11) * 1.8,
    duration: 2.0 + rand(i * 13) * 1.2,
    drift: (rand(i * 17) - 0.5) * 200,
  }));
}

/* ── 꽃잎 SVG ─────────────────────────────────────── */
function PetalSVG({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
      <path
        d="M12 3 C 7 7, 7 15, 12 21 C 17 15, 17 7, 12 3 Z"
        fill={color}
        opacity="0.85"
      />
    </svg>
  );
}

/* ============================================================
 * 메인 컴포넌트
 * ============================================================ */
export function SplashScreen({ onDone }: SplashScreenProps) {
  const petals = useMemo(() => makePetals(), []);

  useEffect(() => {
    const t = setTimeout(() => onDone(), 2500);
    return () => clearTimeout(t);
  }, [onDone]);

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#F5E6C8",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        animation: "splashFadeOut 0.5s ease-out 2.0s forwards",
      }}
    >
      {/* ── 꽃잎 파티클 ───────────────────────────── */}
      {petals.map((p) => (
        <span
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            top: "-40px",
            animation: `splashPetalDrift ${p.duration}s linear ${p.delay}s forwards`,
            ["--pdrift" as string]: `${p.drift}px`,
          }}
        >
          <PetalSVG color={p.color} size={p.size} />
        </span>
      ))}

      {/* ── 로고 ──────────────────────────────────── */}
      <div
        style={{
          animation: "splashFadeIn 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "24px",
        }}
      >
        <img
          src="/title.svg"
          alt="Garden 2048"
          style={{
            width: "220px",
            maxWidth: "70vw",
            height: "auto",
            userSelect: "none",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* ── 하단 진행 바 ──────────────────────────── */}
      <div
        style={{
          position: "absolute",
          bottom: "48px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "180px",
          height: "4px",
          borderRadius: "999px",
          background: "rgba(212, 167, 106, 0.35)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: "999px",
            background: "linear-gradient(to right, #F59E0B, #D97706)",
            animation: "splashProgress 2.5s linear 0s forwards",
          }}
        />
      </div>
    </div>,
    document.body,
  );
}
