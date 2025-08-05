import React, { forwardRef } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', className = '', children, ...props }, ref) => {
    const baseClasses =
      'inline-flex items-center justify-center gap-2 rounded border transition-colors focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-50';

    const variantClasses = {
      primary: 'border-[#0c3b46] bg-[#092c34] text-white hover:bg-[#0c3b46] focus:ring-[#1a5f6b]',
      secondary:
        'border-[#0c3b46] bg-[#08252c] text-white hover:border-[#1a5f6b] focus:ring-[#1a5f6b]',
      ghost:
        'border-[#0c3b46]/30 bg-transparent text-[#bfcbce] hover:bg-[#0c3b46]/50 hover:text-white',
      danger:
        'border-[#0c3b46]/30 bg-transparent text-[#bfcbce] hover:bg-red-500/40 hover:text-white',
    };

    const sizeClasses = {
      sm: 'h-6 px-2 text-xs',
      md: 'h-8 px-3 text-sm',
      lg: 'h-10 px-4 text-base',
    };

    const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

    return (
      <button
        ref={ref}
        className={classes}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
