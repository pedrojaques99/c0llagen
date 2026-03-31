import React from 'react';

interface ControlGroupProps {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const ControlGroup: React.FC<ControlGroupProps> = ({ 
  label, 
  icon, 
  children, 
  className = '' 
}) => (
  <div className={`flex flex-col gap-3 p-4 rounded-2xl bg-glass border border-border transition-all hover:bg-glass-muted hover:border-ink/20 ${className}`}>
    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted font-bold">
      {icon}
      {label}
    </div>
    <div className="text-ink">
      {children}
    </div>
  </div>
);
