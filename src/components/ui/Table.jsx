import React from 'react';

export function Table({ children, className = '' }) {
  return (
    <div className={`bg-dn-bg-card border-[0.5px] border-dn-border rounded-dn-lg overflow-hidden ${className}`}>
      <div className="w-full overflow-x-auto hide-scrollbar">
        <table className="w-full text-left border-collapse">
          {children}
        </table>
      </div>
    </div>
  );
}

export function TableHeader({ children, className = '' }) {
  return (
    <thead className={`bg-dn-bg-elevated text-dn-label text-dn-text-muted uppercase border-b-[0.5px] border-dn-border ${className}`}>
      <tr>{children}</tr>
    </thead>
  );
}

export function TableHead({ children, className = '' }) {
  return (
    <th className={`px-4 py-2.5 font-medium whitespace-nowrap ${className}`}>
      {children}
    </th>
  );
}

export function TableBody({ children, className = '' }) {
  return (
    <tbody className={`divide-y-[0.5px] divide-white/5 ${className}`}>
      {children}
    </tbody>
  );
}

export function TableRow({ children, className = '', onClick }) {
  const interactionClasses = onClick ? "cursor-pointer hover:bg-dn-bg-hover transition-colors" : "hover:bg-dn-bg-hover transition-colors";
  return (
    <tr onClick={onClick} className={`${interactionClasses} ${className}`}>
      {children}
    </tr>
  );
}

export function TableCell({ children, className = '' }) {
  return (
    <td className={`px-4 py-3 text-dn-body text-dn-text-primary ${className}`}>
      {children}
    </td>
  );
}

export function TableValueCell({ children, className = '' }) {
  return (
    <td className={`px-4 py-3 text-dn-mono text-dn-accent ${className}`}>
      {children}
    </td>
  );
}

export function TableActionCell({ children, className = '' }) {
  return (
    <td className={`px-4 py-3 text-right`}>
      <div className={`flex items-center justify-end gap-2 ${className}`}>
        {children}
      </div>
    </td>
  );
}
