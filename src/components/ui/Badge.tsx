import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent' | 'gemini';
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'sm',
  className = '' 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-full font-bold uppercase tracking-widest";
  
  const variants = {
    primary: "bg-ink/5 text-ink/30 border border-ink/5 px-1.2 py-0.2",
    secondary: "bg-black/5 text-ink/20 border border-border/5 px-1.2 py-0.2",
    accent: "bg-emerald-500/5 text-emerald-500/40 border border-emerald-500/10 px-1.5 py-0.5",
    gemini: "bg-blue-500/5 text-blue-500/40 border border-blue-500/10 px-1.5 py-0.5"
  };

  const sizes = {
    xs: "text-[7px]",
    sm: "text-[8px]",
    md: "text-[10px]"
  };

  return (
    <span className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
};
