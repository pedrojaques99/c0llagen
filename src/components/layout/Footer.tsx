import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-32 pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between gap-8 text-[10px] font-bold uppercase tracking-[0.3em] text-white/20">
      <div className="flex gap-12">
        <a href="#" className="hover:text-white transition-colors">Privacy</a>
        <a href="#" className="hover:text-white transition-colors">Terms</a>
      </div>
      <span>© 2026 C0LLAGEN</span>
    </footer>
  );
};
