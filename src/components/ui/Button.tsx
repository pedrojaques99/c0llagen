import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  loading, 
  icon, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-300 active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-white text-black hover:bg-white/90 shadow-[0_10px_30px_rgba(255,255,255,0.1)]",
    secondary: "bg-white/5 text-white hover:bg-white/10 border border-white/10 backdrop-blur-xl",
    outline: "border border-white/10 hover:border-white/40 text-white bg-transparent",
    ghost: "text-white/40 hover:text-white hover:bg-white/5"
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
  className = '', 
  ...props 
}) => {
  const variants = {
    primary: "bg-white text-black hover:bg-white/90 shadow-[0_10px_30px_rgba(255,255,255,0.1)]",
    secondary: "bg-white/5 text-white hover:bg-white/10 border border-white/10 backdrop-blur-xl",
    outline: "border border-white/10 hover:border-white/40 text-white bg-transparent",
    ghost: "text-white/40 hover:text-white hover:bg-white/5"
  };

  return (
    <button 
      className={`p-2.5 rounded-full transition-all duration-300 active:scale-90 disabled:opacity-30 ${variants[variant]} ${className}`}
      {...props}
    >
      {icon}
    </button>
  );
};
