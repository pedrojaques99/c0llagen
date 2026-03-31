import React from 'react';
import { motion } from 'motion/react';
import { Key, ExternalLink } from 'lucide-react';
import { Button } from '../ui/Button';

interface ApiKeyModalProps {
  onSelectKey: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSelectKey }) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-bg">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full glass p-8 rounded-3xl text-center"
      >
        <h2 className="text-2xl font-bold tracking-tight mb-4">Access</h2>
        <p className="text-white/40 text-sm mb-10 leading-relaxed max-w-[280px] mx-auto">
          Select an API key to unlock professional features.
        </p>
        <div className="flex flex-col gap-4">
          <Button onClick={onSelectKey} variant="primary" size="lg" className="w-full">
            Select API Key
          </Button>
          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[10px] uppercase tracking-widest text-muted hover:text-ink flex items-center justify-center gap-1 transition-colors"
          >
            Billing Documentation <ExternalLink size={10} />
          </a>
        </div>
      </motion.div>
    </div>
  );
};
