/* ============================================================
 * PolicyModal.tsx
 * 개인정보 처리방침·이용약관 본문 모달 (앱 내 표시)
 * ============================================================ */

import type { ReactElement } from "react";
import { BaseModal } from "./BaseModal";
import type { Season } from "@/utils/seasonData";
import { SEASON_THEMES } from "@/utils/seasonTheme";
import {
  POLICY_CONTENT,
  POLICY_TITLES,
  type PolicyType,
  type PolicyLang,
} from "@/utils/policyContent";

interface PolicyModalProps {
  type:    PolicyType;
  lang:    PolicyLang;
  season?: Season;
  onClose: () => void;
}

export function PolicyModal({ type, lang, season = "spring", onClose }: PolicyModalProps) {
  const theme   = SEASON_THEMES[season];
  const title   = POLICY_TITLES[type][lang];
  const content = POLICY_CONTENT[type][lang];

  return (
    <BaseModal
      iconSrc={type === "privacy" ? "/menu-settings.png" : "/menu-settings.png"}
      title={title}
      onClose={onClose}
      closeOnBackdrop
      season={season}
    >
      <div
        className="rounded-2xl px-4 py-4 mb-2 max-h-[60vh] overflow-y-auto"
        style={{
          background: theme.panelColor,
          border: `1px solid ${theme.borderColor}50`,
        }}
      >
        <PolicyText content={content} theme={theme} />
      </div>
    </BaseModal>
  );
}

/* ── 마크다운 약식 렌더링 (## 헤더, **bold**, 표, 리스트) */
function PolicyText({
  content,
  theme,
}: {
  content: string;
  theme: ReturnType<typeof getThemeType>;
}) {
  const lines = content.split("\n");
  const blocks: ReactElement[] = [];
  let tableBuffer: string[] = [];

  const flushTable = (key: number) => {
    if (tableBuffer.length === 0) return;
    const rows = tableBuffer.map((l) =>
      l.split("|").map((c) => c.trim()).filter((c, i, arr) => !(i === 0 && c === "") && !(i === arr.length - 1 && c === "")),
    );
    const header = rows[0];
    const body = rows.slice(2); // skip separator row
    blocks.push(
      <div key={`tbl-${key}`} className="my-2 overflow-x-auto">
        <table className="w-full text-[11px]" style={{ color: theme.textSecondary }}>
          <thead>
            <tr>
              {header.map((h, i) => (
                <th
                  key={i}
                  className="text-left font-bold py-1 px-2"
                  style={{ borderBottom: `1px solid ${theme.borderColor}80`, color: theme.textPrimary }}
                >
                  {renderInline(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j} className="py-1 px-2 align-top" style={{ borderBottom: `1px solid ${theme.borderColor}30` }}>
                    {renderInline(c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    );
    tableBuffer = [];
  };

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();

    /* 표 행 누적 */
    if (line.startsWith("|")) {
      tableBuffer.push(line);
      return;
    }
    flushTable(idx);

    /* 빈 줄 */
    if (line.trim() === "") {
      blocks.push(<div key={idx} className="h-2" />);
      return;
    }

    /* 구분선 */
    if (line.trim() === "---") {
      blocks.push(<div key={idx} className="h-px my-2" style={{ background: theme.borderColor + "60" }} />);
      return;
    }

    /* H2 */
    if (line.startsWith("## ")) {
      blocks.push(
        <h3 key={idx} className="text-sm font-bold mt-3 mb-1" style={{ color: theme.textPrimary }}>
          {renderInline(line.slice(3))}
        </h3>,
      );
      return;
    }

    /* H3 */
    if (line.startsWith("### ")) {
      blocks.push(
        <h4 key={idx} className="text-xs font-bold mt-2 mb-0.5" style={{ color: theme.textPrimary }}>
          {renderInline(line.slice(4))}
        </h4>,
      );
      return;
    }

    /* 리스트 */
    if (/^\s*[-*]\s+/.test(line)) {
      const indent = (line.match(/^\s*/)?.[0].length ?? 0) >= 2 ? 16 : 8;
      blocks.push(
        <div key={idx} className="flex gap-1.5 text-[11px] leading-snug" style={{ paddingLeft: indent, color: theme.textSecondary }}>
          <span style={{ color: theme.btnPrimary }}>•</span>
          <span className="flex-1">{renderInline(line.replace(/^\s*[-*]\s+/, ""))}</span>
        </div>,
      );
      return;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const m = line.match(/^\s*(\d+)\.\s+(.*)$/);
      if (m) {
        blocks.push(
          <div key={idx} className="flex gap-1.5 text-[11px] leading-snug pl-2" style={{ color: theme.textSecondary }}>
            <span className="font-bold" style={{ color: theme.btnPrimary }}>{m[1]}.</span>
            <span className="flex-1">{renderInline(m[2])}</span>
          </div>,
        );
        return;
      }
    }

    /* 일반 단락 */
    blocks.push(
      <p key={idx} className="text-[11px] leading-snug" style={{ color: theme.textSecondary }}>
        {renderInline(line)}
      </p>,
    );
  });
  flushTable(lines.length);

  return <div className="flex flex-col">{blocks}</div>;
}

/* ── **bold** 인라인 */
function renderInline(text: string): ReactElement {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={i}>{p.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

/* helper for theme typing */
function getThemeType() {
  return SEASON_THEMES.spring;
}
