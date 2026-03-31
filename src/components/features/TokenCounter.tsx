import React, { useState, useEffect } from 'react';
import { Cpu } from 'lucide-react';
import { tokenUsage } from '../../services/gemini';

export const TokenCounter: React.FC = () => {
  const [tokens, setTokens] = useState(tokenUsage.totalTokens);

  useEffect(() => {
    const handleTokenUpdate = (e: any) => {
      setTokens(e.detail.totalTokens);
    };

    window.addEventListener('token-update', handleTokenUpdate);
    return () => window.removeEventListener('token-update', handleTokenUpdate);
  }, []);

  if (tokens === 0) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-glass-muted border border-border/10 backdrop-blur-xl animate-in fade-in slide-in-from-right-4 duration-500">
      <Cpu size={12} className="text-blue-500/50" />
      <div className="flex flex-col">
        <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-muted/50 leading-none">Tokens</span>
        <span className="text-[10px] font-mono text-ink/60 font-medium">
          {tokens.toLocaleString()}
        </span>
      </div>
    </div>
  );
};
