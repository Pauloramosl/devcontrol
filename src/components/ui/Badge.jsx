import React from 'react';

export function Badge({ 
  children, 
  variant = 'active', 
  className = '' 
}) {
  const baseClasses = "inline-flex items-center justify-center font-semibold text-dn-label px-2 py-[3px] gap-1";
  
  const variants = {
    active: "bg-dn-accent-20 text-dn-accent border-[0.5px] border-dn-border-hover rounded-full",
    success: "bg-dn-success-bg text-dn-success border-[0.5px] border-dn-success/25 rounded-full",
    warning: "bg-dn-warning-bg text-dn-warning border-[0.5px] border-dn-warning/25 rounded-full",
    danger: "bg-dn-danger-bg text-dn-danger border-[0.5px] border-dn-danger/25 rounded-full",
    premium: "bg-dn-purple-bg text-dn-purple border-[0.5px] border-dn-purple/25 rounded-full",
  };

  const variantClass = variants[variant] || variants.active;

  return (
    <span className={`${baseClasses} ${variantClass} ${className}`}>
      {children}
    </span>
  );
}
