import React from 'react';

export function Select({
  className = '',
  error = false,
  children,
  ...props
}) {
  const baseClasses = "appearance-none bg-dn-bg-card border-[0.5px] border-dn-border rounded-dn-md px-3 py-2 pr-8 text-dn-mono text-dn-text-primary h-9 w-full transition-dn placeholder:text-dn-text-muted cursor-pointer";
  
  const focusClasses = "focus:border-dn-border-hover focus:outline focus:outline-2 focus:outline-dn-accent/20";
  const errorClasses = error ? "border-dn-danger focus:border-dn-danger focus:outline-dn-danger/20" : "";
  const disabledClasses = "disabled:opacity-50 disabled:bg-dn-bg-elevated disabled:cursor-not-allowed";

  // Ícone de chevron-down em SVG embutido em background-image para não precisar de wrappers
  const chevronSvg = `data:image/svg+xml;charset=US-ASCII,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%234A5F7A' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E`;

  return (
    <select
      className={`${baseClasses} ${focusClasses} ${errorClasses} ${disabledClasses} ${className}`}
      style={{
        backgroundImage: `url("${chevronSvg}")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 8px center',
        backgroundSize: '16px 16px',
      }}
      {...props}
    >
      {children}
    </select>
  );
}
