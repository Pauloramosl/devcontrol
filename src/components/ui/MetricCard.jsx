import React from 'react';

export function MetricCard({
  label,
  value,
  delta,
  deltaType = 'neutral', // 'positive' | 'negative' | 'neutral'
  className = '',
}) {
  const renderDelta = () => {
    if (!delta) return null;

    let deltaClasses = "text-[11px] font-semibold rounded px-1.5 py-0.5 ";
    
    if (deltaType === 'positive') {
      deltaClasses += "bg-dn-success-bg text-dn-success";
    } else if (deltaType === 'negative') {
      deltaClasses += "bg-dn-danger-bg text-dn-danger";
    } else {
      deltaClasses += "bg-dn-accent-10 text-dn-accent";
    }

    return <span className={deltaClasses}>{delta}</span>;
  };

  return (
    <div className={`bg-dn-bg-card border-[0.5px] border-dn-border rounded-dn-lg p-4 hover:border-dn-border-hover transition-dn ${className}`}>
      <div className="text-dn-label text-dn-text-muted uppercase mb-1.5 flex justify-between items-center">
        {label}
        {renderDelta()}
      </div>
      <div className="text-dn-display text-dn-text-100">
        {value}
      </div>
    </div>
  );
}
