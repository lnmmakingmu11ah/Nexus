import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface AiErrorPanelProps {
  error: string | null;
  onDismiss?: () => void;
}

/** Compact, non-intrusive AI error readout for chat UIs */
export const AiErrorPanel: React.FC<AiErrorPanelProps> = ({ error, onDismiss }) => {
  if (!error) return null;

  return (
    <div className="mb-2 px-2.5 py-1.5 rounded-lg bg-rose-950/40 border border-rose-500/25 flex items-start gap-2">
      <AlertCircle className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-[9px] uppercase tracking-wider font-semibold text-rose-300/90">AI error</p>
        <p className="text-[10px] text-rose-100/80 font-mono leading-snug break-words line-clamp-3">
          {error}
        </p>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 p-0.5 rounded text-rose-300/70 hover:text-rose-100 hover:bg-rose-500/20"
          aria-label="Dismiss error"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};
