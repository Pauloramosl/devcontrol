import React from 'react';

export function Button({ 
  children, 
  variant = 'primary', 
  iconOnly = false,
  className = '', 
  disabled = false,
  ...props 
}) {
  const baseClasses = "inline-flex items-center justify-center transition-dn font-semibold rounded-dn-md outline-none focus:ring-2 focus:ring-dn-accent/50 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer hover:opacity-85";
  
  const textClasses = "text-[13px] leading-[1.2]";
  const paddingClasses = iconOnly ? "w-9 h-9 p-0" : "px-[18px] py-[8px]";

  const variants = {
    primary: "bg-dn-accent-strong text-dn-text-100 border-none",
    ghost: "bg-transparent text-dn-accent border border-dn-border-hover",
    danger: "bg-dn-danger-bg text-dn-danger border-[0.5px] border-dn-danger/30",
    success: "bg-dn-success-bg text-dn-success border-[0.5px] border-dn-success/30",
  };

  const variantClass = variants[variant] || variants.primary;

  return (
    <button
      disabled={disabled}
      className={`${baseClasses} ${textClasses} ${paddingClasses} ${variantClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
