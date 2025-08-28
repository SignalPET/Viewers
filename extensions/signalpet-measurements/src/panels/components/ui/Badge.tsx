import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary';
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className = '' }) => {
  const baseClasses =
    'inline-flex items-center justify-center gap-1 rounded-full px-2 text-xs font-normal text-white';

  const variantClasses = {
    default: 'bg-[#092c34] h-5',
    primary: 'bg-[#0c3b46] h-6',
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${className}`;

  return <div className={classes}>{children}</div>;
};

export default Badge;
