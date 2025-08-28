import React, { forwardRef } from 'react';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'danger';
  size?: 'sm' | 'md';
  icon: React.ReactNode;
  'aria-label'?: string;
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ variant = 'default', size = 'sm', icon, className = '', ...props }, ref) => {
    const baseClasses =
      'inline-flex items-center justify-center rounded transition-colors focus:outline-none';

    const variantClasses = {
      default: 'bg-[#0c3b46]/30 text-[#bfcbce] hover:bg-[#0c3b46] hover:text-white',
      danger: 'bg-[#0c3b46]/30 text-[#bfcbce] hover:bg-red-500/40 hover:text-white',
    };

    const sizeClasses = {
      sm: 'h-5 w-5 p-1',
      md: 'h-6 w-6 p-1.5',
    };

    const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

    return (
      <button
        ref={ref}
        className={classes}
        {...props}
      >
        {icon}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

export default IconButton;
