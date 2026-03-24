/* ============================================================
 * Modal.tsx
 * 범용 모달 컴포넌트
 *
 * React Portal을 사용해 document.body에 직접 렌더링합니다.
 * → transform 컨테이너의 영향을 받지 않아 항상 뷰포트 중앙에 표시됩니다.
 * ============================================================ */

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  primaryAction: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  type?: "success" | "danger" | "info";
}

export function Modal({
  isOpen,
  title,
  description,
  primaryAction,
  secondaryAction,
  type = "info",
}: ModalProps) {
  /* 모달 열릴 때 body 스크롤 잠금 */
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  const icon =
    type === "success" ? "🌸" :
    type === "danger"  ? "😢" : "🌱";

  const iconBg =
    type === "success" ? "bg-green-100" :
    type === "danger"  ? "bg-red-100"   : "bg-blue-100";

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-board animate-in zoom-in-95 duration-200 text-center">

        <div className={cn("w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-6 text-3xl", iconBg)}>
          {icon}
        </div>

        <h2 className="text-2xl font-display font-bold text-foreground mb-3">{title}</h2>

        {description && (
          <p className="text-foreground/60 mb-8">{description}</p>
        )}

        <div className="flex flex-col gap-3">
          <button onClick={primaryAction.onClick} className="btn-cute btn-primary w-full text-lg">
            {primaryAction.label}
          </button>
          {secondaryAction && (
            <button onClick={secondaryAction.onClick} className="btn-cute btn-secondary w-full">
              {secondaryAction.label}
            </button>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
}
