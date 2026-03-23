import { RefreshCw } from "lucide-react";

interface HeaderProps {
  score: number;
  bestScore: number;
  onReset: () => void;
}

export function Header({ score, bestScore, onReset }: HeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row justify-between items-center sm:items-end gap-6 mb-8 mt-4">
      <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
        <h1 className="text-4xl md:text-5xl font-display font-bold text-primary mb-2">식물 2048</h1>
        <p className="text-muted-foreground font-medium text-sm md:text-base">
          같은 타일을 합쳐 전설의 꽃을 피워요 🌸
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex gap-2">
          <ScoreBox label="현재 점수" score={score} />
          <ScoreBox label="최고 점수" score={bestScore} />
        </div>
        <button 
          onClick={onReset}
          className="h-14 w-14 flex items-center justify-center bg-primary text-white rounded-2xl hover:bg-primary-hover active:scale-95 transition-all shadow-md"
          aria-label="새 게임"
        >
          <RefreshCw className="w-6 h-6" />
        </button>
      </div>
    </header>
  );
}

function ScoreBox({ label, score }: { label: string; score: number }) {
  return (
    <div className="bg-board px-4 py-2 rounded-xl flex flex-col items-center min-w-[80px]">
      <span className="text-[10px] md:text-xs font-bold text-foreground/60 uppercase tracking-wider mb-0.5">{label}</span>
      <span className="text-lg md:text-xl font-display font-bold text-foreground leading-none">
        {score}
      </span>
    </div>
  );
}
