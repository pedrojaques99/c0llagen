import React, { useState, useEffect } from 'react';
import { Cpu, ChevronDown, Video, Image as ImageIcon, Search } from 'lucide-react';
import { tokenUsage } from '../../services/gemini';

export const TokenCounter: React.FC = () => {
  const [data, setData] = useState({ ...tokenUsage });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleTokenUpdate = (e: any) => {
      setData({ ...e.detail });
    };

    window.addEventListener('token-update', handleTokenUpdate);
    return () => window.removeEventListener('token-update', handleTokenUpdate);
  }, []);

  if (data.totalTokens === 0) return null;

  const getUsageLabel = (key: string) => {
    switch (key) {
      case 'image': return 'Image Upscale';
      case 'video': return 'Video Generation';
      case 'analysis': return 'Smart Analysis';
      default: return key;
    }
  };

  const getUsageIcon = (key: string) => {
    switch (key) {
      case 'image': return <ImageIcon size={14} className="text-blue-500" />;
      case 'video': return <Video size={14} className="text-purple-500" />;
      case 'analysis': return <Search size={14} className="text-amber-500" />;
      default: return <Cpu size={14} className="text-muted" />;
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-3 px-4 py-2 rounded-2xl glass-heavy border border-border/10 backdrop-blur-xl transition-all duration-300 hover:bg-glass-muted active:scale-[0.98] cursor-pointer group ${isOpen ? 'ring-2 ring-blue-500/20' : ''}`}
      >
        <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
          <Cpu size={14} strokeWidth={2.5} />
        </div>
        <div className="flex flex-col items-start pr-1">
          <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-muted leading-none mb-1">Session Usage</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono text-ink font-semibold">
              {data.totalTokens.toLocaleString()}
            </span>
            <ChevronDown size={10} className={`text-muted transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </button>

      {isOpen && (
        <>
          <div className="absolute top-full right-0 mt-4 w-72 glass-heavy rounded-[2rem] border border-border shadow-3xl p-6 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted mb-4 px-1">Detailed Consumption</h3>
            
            <div className="space-y-4">
              {Object.entries(data.breakdown).map(([key, usage]) => {
                const u = usage as any; // Cast to avoid unknown type issues with Object.entries
                if (u.totalTokens === 0) return null;
                
                return (
                   <div key={key} className="flex flex-col gap-2 p-3 rounded-2xl bg-glass-muted/50 border border-border/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-ink">
                          {getUsageIcon(key)}
                          <span className="text-[11px] font-medium">{getUsageLabel(key)}</span>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-ink">
                          {u.totalTokens.toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 pl-6 opacity-60">
                        <div className="flex flex-col">
                          <span className="text-[8px] uppercase tracking-wider text-muted leading-tight">Prompt</span>
                          <span className="text-[9px] font-mono font-medium">{u.promptTokens.toLocaleString()}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] uppercase tracking-wider text-muted leading-tight">Response</span>
                          <span className="text-[9px] font-mono font-medium">{u.completionTokens.toLocaleString()}</span>
                        </div>
                      </div>
                   </div>
                );
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-border/30 flex items-center justify-between px-1">
              <span className="text-[10px] font-bold text-muted uppercase tracking-widest">Total Billable</span>
              <span className="text-sm font-mono font-bold text-blue-500">
                {data.totalTokens.toLocaleString()}
              </span>
            </div>
          </div>
          
          <div 
            className="fixed inset-0 z-[90] cursor-default" 
            onClick={() => setIsOpen(false)}
          />
        </>
      )}
    </div>
  );
};
