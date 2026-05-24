import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value ?? 0));
}

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/**
 * RevenueChart — A fully functional SVG area chart with draw-line animation.
 *
 * Props:
 *  - data: Array of { month: string (YYYY-MM), revenue: number, expenses: number }
 *  - mode: 'revenue' | 'expenses' | 'balance'
 */
export function RevenueChart({ data = [], mode = 'revenue' }) {
  const svgRef = useRef(null);
  const lineRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const [activeIdx, setActiveIdx] = useState(null);
  const [animReady, setAnimReady] = useState(false);

  // Unique key to force re-animation on data/mode change
  const animKey = useMemo(() => `${mode}-${data.map(d => `${d.month}${d.revenue}${d.expenses}`).join(',')}`, [data, mode]);

  const chartWidth = 800;
  const chartHeight = 200;
  const paddingX = 10;
  const paddingTop = 20;
  const paddingBottom = 10;
  const usableW = chartWidth - paddingX * 2;
  const usableH = chartHeight - paddingTop - paddingBottom;

  const color = mode === 'expenses' ? '#EF4444' : mode === 'balance' ? '#10B981' : '#3ABFFF';
  const colorFaded = mode === 'expenses' ? 'rgba(239,68,68,0.35)' : mode === 'balance' ? 'rgba(16,185,129,0.35)' : 'rgba(58,191,255,0.35)';

  const valueKey = mode === 'expenses' ? 'expenses' : mode === 'balance' ? 'balance' : 'revenue';

  const points = useMemo(() => {
    if (!data.length) return [];

    const values = data.map(d => {
      if (valueKey === 'balance') return (d.revenue ?? 0) - (d.expenses ?? 0);
      return d[valueKey] ?? 0;
    });

    const maxVal = Math.max(...values, 1);
    const minVal = Math.min(...values, 0);
    const range = maxVal - minVal || 1;

    return data.map((d, i) => {
      const v = values[i];
      const x = paddingX + (i / Math.max(data.length - 1, 1)) * usableW;
      const y = paddingTop + (1 - (v - minVal) / range) * usableH;
      return { x, y, value: v, month: d.month, revenue: d.revenue, expenses: d.expenses };
    });
  }, [data, valueKey, usableW, usableH]);

  // Build smooth curve path using catmull-rom to bezier (with clamping to prevent overshoot)
  const linePath = useMemo(() => {
    if (points.length < 2) return '';
    if (points.length === 2) {
      return `M${points[0].x} ${points[0].y} L${points[1].x} ${points[1].y}`;
    }

    // Calculate Y bounds for clamping
    const allY = points.map(p => p.y);
    const minY = Math.min(...allY);
    const maxY = Math.max(...allY);

    let path = `M${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(i - 1, 0)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(i + 2, points.length - 1)];

      const tension = 0.25;
      let cp1x = p1.x + (p2.x - p0.x) * tension;
      let cp1y = p1.y + (p2.y - p0.y) * tension;
      let cp2x = p2.x - (p3.x - p1.x) * tension;
      let cp2y = p2.y - (p3.y - p1.y) * tension;

      // Clamp control points to data range to prevent overshoot / undershoot
      cp1y = Math.max(minY, Math.min(maxY, cp1y));
      cp2y = Math.max(minY, Math.min(maxY, cp2y));

      path += ` C${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return path;
  }, [points]);

  const areaPath = useMemo(() => {
    if (!linePath) return '';
    const bottomY = paddingTop + usableH;
    return `${linePath} L${points[points.length - 1].x} ${bottomY} L${points[0].x} ${bottomY} Z`;
  }, [linePath, points, usableH]);

  // Trigger draw animation on mount / data change
  useEffect(() => {
    setAnimReady(false);

    // Small delay so the DOM has the new path before we measure
    const frame = requestAnimationFrame(() => {
      const lineEl = lineRef.current;
      if (lineEl) {
        const totalLength = lineEl.getTotalLength();
        // Set initial state: line fully hidden
        lineEl.style.transition = 'none';
        lineEl.style.strokeDasharray = `${totalLength}`;
        lineEl.style.strokeDashoffset = `${totalLength}`;

        // Force reflow
        lineEl.getBoundingClientRect();

        // Animate: reveal the line from left to right
        lineEl.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1)';
        lineEl.style.strokeDashoffset = '0';
      }

      // Stagger reveal for area and points
      setTimeout(() => setAnimReady(true), 100);
    });

    return () => cancelAnimationFrame(frame);
  }, [animKey]);

  // Grid values
  const gridValues = useMemo(() => {
    if (!points.length) return [];
    const vals = points.map(p => p.value);
    const max = Math.max(...vals, 1);
    const min = Math.min(...vals, 0);
    const range = max - min || 1;
    const steps = 4;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const v = min + (range / steps) * (steps - i);
      return { value: v, y: paddingTop + (i / steps) * usableH };
    });
  }, [points, usableH]);

  const handleMouseMove = useCallback((e) => {
    if (!svgRef.current || !points.length) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * chartWidth;

    let closest = 0;
    let closestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - mouseX);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    });

    setActiveIdx(closest);
    const pt = points[closest];
    // Tooltip position relative to container
    const pctX = (pt.x / chartWidth) * 100;
    const pctY = (pt.y / chartHeight) * 100;
    setTooltip({ pctX, pctY, point: pt });
  }, [points]);

  const handleMouseLeave = useCallback(() => {
    setActiveIdx(null);
    setTooltip(null);
  }, []);

  const formatMonth = (monthStr) => {
    if (!monthStr) return '';
    const [y, m] = monthStr.split('-');
    return `${MONTH_LABELS[parseInt(m, 10) - 1]} ${y}`;
  };

  const formatShortValue = (v) => {
    const abs = Math.abs(v);
    if (abs >= 1000) return `${(v / 1000).toFixed(1)}k`;
    return v.toFixed(0);
  };

  // Animation durations (ms)
  const LINE_DURATION = 1200;
  const AREA_DELAY = 300;
  const POINT_BASE_DELAY = 400;
  const POINT_STAGGER = 120;

  if (!data.length) {
    return (
      <div className="w-full h-[220px] flex items-center justify-center text-dn-text-muted text-sm">
        Sem dados financeiros para exibir o gráfico.
      </div>
    );
  }

  return (
    <div
      className="w-full h-[220px] mb-8 relative"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between py-3 pointer-events-none">
        {gridValues.map((g, i) => (
          <span
            key={i}
            className="text-[10px] text-dn-text-muted font-mono text-right pr-1"
            style={{ position: 'absolute', top: `${(g.y / chartHeight) * 100}%`, right: 0, transform: 'translateY(-50%)' }}
          >
            {formatShortValue(g.value)}
          </span>
        ))}
      </div>

      {/* Chart area */}
      <div className="absolute left-12 right-0 top-0 bottom-6 border-b border-l border-white/10 overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-full"
          preserveAspectRatio="none"
          key={animKey}
        >
          <defs>
            <linearGradient id={`grad-${mode}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colorFaded} />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </linearGradient>
            <filter id="chart-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Horizontal grid lines */}
          {gridValues.map((g, i) => (
            <line key={i} x1={paddingX} y1={g.y} x2={chartWidth - paddingX} y2={g.y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          ))}

          {/* Vertical hover line */}
          {activeIdx !== null && points[activeIdx] && (
            <line
              x1={points[activeIdx].x} y1={paddingTop}
              x2={points[activeIdx].x} y2={paddingTop + usableH}
              stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="4 4"
            />
          )}

          {/* Area fill — fades in after line starts drawing */}
          {areaPath && (
            <path
              d={areaPath}
              fill={`url(#grad-${mode})`}
              style={{
                opacity: animReady ? 1 : 0,
                transition: `opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1) ${AREA_DELAY}ms`,
              }}
            />
          )}

          {/* Line — animated via stroke-dasharray/dashoffset in useEffect */}
          {linePath && (
            <path
              ref={lineRef}
              d={linePath}
              fill="none"
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
              filter="url(#chart-glow)"
            />
          )}

          {/* Data points — pop in sequentially */}
          {points.map((p, i) => {
            const pointDelay = POINT_BASE_DELAY + i * POINT_STAGGER;
            return (
              <g key={i}>
                {/* Outer glow on active */}
                {activeIdx === i && (
                  <circle cx={p.x} cy={p.y} r="12" fill={color} opacity="0.15" />
                )}
                <circle
                  cx={p.x} cy={p.y}
                  r={activeIdx === i ? 6 : 4}
                  fill={activeIdx === i ? 'white' : color}
                  stroke={color}
                  strokeWidth={activeIdx === i ? 3 : 2}
                  style={{
                    opacity: animReady ? 1 : 0,
                    transform: animReady ? 'scale(1)' : 'scale(0)',
                    transformOrigin: `${p.x}px ${p.y}px`,
                    transition: `opacity 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${pointDelay}ms, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${pointDelay}ms`,
                  }}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* X-axis labels — fade in with stagger */}
      <div className="absolute left-12 right-0 bottom-0 h-6 flex justify-between px-1 pointer-events-none">
        {points.map((p, i) => (
          <span
            key={i}
            className={`text-[10px] font-mono transition-colors ${activeIdx === i ? 'text-white' : 'text-dn-text-muted'}`}
            style={{
              opacity: animReady ? 1 : 0,
              transform: animReady ? 'translateY(0)' : 'translateY(6px)',
              transition: `opacity 0.4s ease ${POINT_BASE_DELAY + i * POINT_STAGGER}ms, transform 0.4s ease ${POINT_BASE_DELAY + i * POINT_STAGGER}ms`,
            }}
          >
            {formatMonth(p.month)}
          </span>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-20 pointer-events-none"
          style={{
            left: `calc(${Math.min(Math.max(tooltip.pctX, 15), 85)}%)`,
            top: `calc(${Math.min(Math.max(tooltip.pctY - 15, 0), 60)}%)`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="bg-[#1A1F2B]/95 border-[0.5px] border-white/15 rounded-xl px-3 py-2 shadow-2xl backdrop-blur-xl min-w-[140px]">
            <p className="text-[10px] text-dn-text-muted mb-1 font-mono">{formatMonth(tooltip.point.month)}</p>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: color }} />
              </div>
              <div>
                <p className="text-white text-sm font-bold">{formatCurrency(tooltip.point.value)}</p>
                <p className="text-[9px] text-dn-text-muted">{mode === 'revenue' ? 'Receita' : mode === 'expenses' ? 'Despesas' : 'Saldo'}</p>
              </div>
            </div>
            {mode === 'balance' && (
              <div className="mt-1.5 pt-1.5 border-t border-white/10 flex gap-3 text-[9px]">
                <span className="text-dn-success">↑ {formatCurrency(tooltip.point.revenue)}</span>
                <span className="text-dn-warning">↓ {formatCurrency(tooltip.point.expenses)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
