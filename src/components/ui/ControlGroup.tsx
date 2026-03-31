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
  <div className={`flex flex-col gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5 transition-all hover:bg-white/[0.05] hover:border-white/10 ${className}`}>
    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">
      {icon}
      {label}
    </div>
    {children}
  </div>
);
