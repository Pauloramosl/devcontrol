import React from 'react';

export function Input({
  className = '',
  error = false,
  ...props
}) {
  const baseClasses = "bg-dn-bg-card border-[0.5px] border-dn-border rounded-dn-md px-3 py-2 text-dn-mono text-dn-text-primary h-9 w-full transition-dn placeholder:text-dn-text-muted";
  
  const focusClasses = "focus:border-dn-border-hover focus:outline focus:outline-2 focus:outline-dn-accent/20";
  const errorClasses = error ? "border-dn-danger focus:border-dn-danger focus:outline-dn-danger/20" : "";
  const disabledClasses = "disabled:opacity-50 disabled:bg-dn-bg-elevated disabled:cursor-not-allowed";

  return (
    <input
      className={`${baseClasses} ${focusClasses} ${errorClasses} ${disabledClasses} ${className}`}
      {...props}
    />
  );
}
