import { useEffect } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  primaryAction: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  type?: 'success' | 'danger' | 'info';
}

export function Modal({ isOpen, title, description, primaryAction, secondaryAction, type = 'info' }: ModalProps) {
  
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-board animate-in zoom-in-95 duration-200 text-center">
        
        <div className={cn(
          "w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-6 text-3xl",
          type === 'success' ? "bg-green-100" : 
          type === 'danger' ? "bg-red-100" : "bg-blue-100"
        )}>
          {type === 'success' ? '🌸' : type === 'danger' ? '😢' : '🌱'}
        </div>

        <h2 className="text-2xl font-display font-bold text-foreground mb-3">{title}</h2>
        
        {description && (
          <p className="text-muted-foreground mb-8">{description}</p>
        )}

        <div className="flex flex-col gap-3">
          <button 
            onClick={primaryAction.onClick}
            className="btn-cute btn-primary w-full text-lg"
          >
            {primaryAction.label}
          </button>
          
          {secondaryAction && (
            <button 
              onClick={secondaryAction.onClick}
              className="btn-cute btn-secondary w-full"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
