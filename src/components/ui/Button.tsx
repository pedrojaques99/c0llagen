import React from 'react';
import { Badge } from './Badge';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  badge?: string;
  badgeVariant?: 'primary' | 'secondary' | 'accent' | 'gemini';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  loading, 
  icon, 
  badge,
  badgeVariant = 'secondary',
  className = '', 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-300 active:scale-[0.98] cursor-pointer disabled:opacity-30 disabled:pointer-events-none relative overflow-visible";
  
  const variants = {
    primary: "bg-ink text-bg hover:opacity-90 shadow-2xl",
    secondary: "bg-glass text-ink hover:bg-glass-muted border border-border backdrop-blur-xl",
    outline: "border border-border hover:border-ink/40 text-ink bg-transparent",
    ghost: "text-muted hover:text-ink hover:bg-glass"
  };

  const sizes = {
    sm: "px-4 py-2 text-[10px] uppercase tracking-widest",
    md: "px-6 py-2.5 text-xs uppercase tracking-widest",
    lg: "px-10 py-4 text-sm uppercase tracking-widest"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {badge && (
        <span className="absolute -top-1.5 -right-1.5 z-10 scale-90">
          <Badge variant={badgeVariant} size="xs">{badge}</Badge>
        </span>
      )}
      {loading ? (
        <span className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
      ) : icon && (
        <span className="shrink-0">{icon}</span>
      )}
      {children}
    </button>
  );
};

interface IconButtonProps extends Omit<ButtonProps, 'children'> {
  icon: React.ReactNode;
}

export const IconButton: React.FC<IconButtonProps> = ({ 
  icon, 
  variant = 'ghost', 
  badge,
  badgeVariant = 'secondary',
  className = '', 
  ...props 
}) => {
  const variants = {
    primary: "bg-ink text-bg hover:opacity-90 shadow-2xl",
    secondary: "bg-glass text-ink hover:bg-glass-muted border border-border backdrop-blur-xl",
    outline: "border border-border hover:border-ink/40 text-ink bg-transparent",
    ghost: "text-muted hover:text-ink hover:bg-glass"
  };

  return (
    <button 
      className={`p-2.5 rounded-full transition-all duration-300 active:scale-90 cursor-pointer disabled:opacity-30 relative overflow-visible ${variants[variant]} ${className}`}
      {...props}
    >
      {badge && (
        <span className="absolute -top-1 -right-1 z-10 scale-75">
          <Badge variant={badgeVariant} size="xs">{badge}</Badge>
        </span>
      )}
      {icon}
    </button>
  );
};
