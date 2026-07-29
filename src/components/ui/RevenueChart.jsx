import { useCallback, useMemo, useRef, useState } from 'react';

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value ?? 0));
}

function formatShortCurrency(value) {
  const numericValue = Number(value ?? 0);
  const abs = Math.abs(numericValue);
  const sign = numericValue < 0 ? '-' : '';

  if (abs >= 1000000) {
    return `${sign}R$ ${(abs / 1000000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}m`;
  }

  if (abs >= 1000) {
    return `${sign}R$ ${(abs / 1000).toLocaleString('pt-BR', {
      maximumFractionDigits: abs >= 10000 ? 0 : 1,
    })}k`;
  }

  return `${sign}R$ ${abs.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
}

const MONTH_LABELS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTH_LABELS_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const MODE_META = {
  revenue: {
    label: 'Receita',
    color: '#3ABFFF',
    faded: 'rgba(58,191,255,0.28)',
    glow: 'rgba(58,191,255,0.35)',
    gradientStart: 'rgba(58,191,255,0.85)',
    gradientEnd: 'rgba(58,191,255,0.15)',
  },
  expenses: {
    label: 'Despesas',
    color: '#EF4444',
    faded: 'rgba(239,68,68,0.26)',
    glow: 'rgba(239,68,68,0.35)',
    gradientStart: 'rgba(239,68,68,0.85)',
    gradientEnd: 'rgba(239,68,68,0.15)',
  },
  balance: {
    label: 'Saldo',
    color: '#10B981',
    faded: 'rgba(16,185,129,0.26)',
    glow: 'rgba(16,185,129,0.35)',
    gradientStart: 'rgba(16,185,129,0.85)',
    gradientEnd: 'rgba(16,185,129,0.15)',
  },
};

function getNiceStep(range, targetSteps = 4) {
  const safeRange = Math.max(Math.abs(range), 1);
  const rawStep = safeRange / targetSteps;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const residual = rawStep / magnitude;

  if (residual <= 1) return magnitude;
  if (residual <= 2) return 2 * magnitude;
  if (residual <= 5) return 5 * magnitude;
  return 10 * magnitude;
}

function buildTicks(minValue, maxValue, step) {
  const ticks = [];
  const roundedStep = Number(step.toPrecision(12));

  for (let value = minValue; value <= maxValue + roundedStep / 2; value += roundedStep) {
    ticks.push(Number(value.toFixed(10)));
  }

  return ticks.reverse();
}

function buildMoneyScale(values) {
  const validValues = values.filter(Number.isFinite);
  if (validValues.length === 0) {
    return { min: 0, max: 100, ticks: [100, 75, 50, 25, 0] };
  }

  const rawMin = Math.min(...validValues, 0);
  const rawMax = Math.max(...validValues, 0);

  if (rawMin === 0 && rawMax === 0) {
    return { min: 0, max: 100, ticks: [100, 75, 50, 25, 0] };
  }

  if (rawMin < 0) {
    const step = getNiceStep(rawMax - rawMin || Math.max(Math.abs(rawMin), Math.abs(rawMax), 1));
    const min = Math.floor(rawMin / step) * step;
    let max = Math.ceil(rawMax / step) * step;

    if (max === min) {
      max = min + step;
    }

    return {
      min,
      max,
      ticks: buildTicks(min, max, step),
    };
  }

  const step = getNiceStep(Math.max(rawMax, 1), 4);
  let max = Math.ceil(Math.max(rawMax, 1) / step) * step;

  if (max <= rawMax) {
    max += step;
  }

  return {
    min: 0,
    max,
    ticks: buildTicks(0, max, step),
  };
}

function getYForValue(value, scale, paddingTop, usableH) {
  const range = scale.max - scale.min || 1;
  return paddingTop + (1 - (value - scale.min) / range) * usableH;
}

function aggregateMonthlyData(data) {
  const buckets = new Map();

  data.forEach((item) => {
    const rawDate = String(item.date ?? item.month ?? '').substring(0, 10);
    if (!rawDate) return;
    const monthKey = rawDate.substring(0, 7);

    const current = buckets.get(monthKey) ?? {
      monthKey,
      revenue: 0,
      expenses: 0,
    };

    current.revenue += Number(item.revenue ?? 0);
    current.expenses += Number(item.expenses ?? 0);
    buckets.set(monthKey, current);
  });

  const sortedKeys = Array.from(buckets.keys()).sort();

  return sortedKeys.map((key) => {
    const bucket = buckets.get(key);
    const [yearStr, monthStr] = key.split('-');
    const year = Number.parseInt(yearStr, 10);
    const monthIdx = Number.parseInt(monthStr, 10) - 1;
    const monthShort = MONTH_LABELS_SHORT[monthIdx] ?? monthStr;
    const monthFull = MONTH_LABELS_FULL[monthIdx] ?? monthStr;

    return {
      id: key,
      dateLabel: `${monthShort}/${String(year).slice(2)}`,
      fullDateLabel: `${monthFull} de ${year}`,
      revenue: bucket.revenue,
      expenses: bucket.expenses,
      balance: bucket.revenue - bucket.expenses,
    };
  });
}

function aggregateDailyData(data) {
  const buckets = new Map();

  data.forEach((item) => {
    const date = String(item.date ?? '').substring(0, 10);
    if (!date) return;

    const current = buckets.get(date) ?? {
      date,
      revenue: 0,
      expenses: 0,
    };

    current.revenue += Number(item.revenue ?? 0);
    current.expenses += Number(item.expenses ?? 0);
    buckets.set(date, current);
  });

  const sorted = Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date));

  return sorted.map((item) => {
    const [year, month, day] = item.date.split('-').map(Number);
    const monthIdx = (month ?? 1) - 1;
    const monthShort = MONTH_LABELS_SHORT[monthIdx] ?? '';

    return {
      id: item.date,
      dateLabel: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`,
      fullDateLabel: `${String(day).padStart(2, '0')} ${monthShort} ${year}`,
      revenue: item.revenue,
      expenses: item.expenses,
      balance: item.revenue - item.expenses,
    };
  });
}

function getMonotoneBezierPath(points, baselineY) {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)} L ${points[1].x.toFixed(2)},${points[1].y.toFixed(2)}`;
  }

  const n = points.length;
  const dx = new Array(n - 1);
  const dy = new Array(n - 1);
  const slope = new Array(n - 1);

  for (let i = 0; i < n - 1; i++) {
    dx[i] = points[i + 1].x - points[i].x;
    dy[i] = points[i + 1].y - points[i].y;
    slope[i] = dy[i] / (dx[i] || 1);
  }

  const m = new Array(n);
  m[0] = slope[0];
  m[n - 1] = slope[n - 2];

  for (let i = 1; i < n - 1; i++) {
    if (slope[i - 1] * slope[i] <= 0) {
      m[i] = 0;
    } else {
      m[i] = (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / slope[i - 1] + (dx[i] + 2 * dx[i - 1]) / slope[i]);
    }
  }

  if (slope[0] === 0) m[0] = 0;
  if (slope[n - 2] === 0) m[n - 1] = 0;

  let d = `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;

  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const h = dx[i];

    const cp1x = p0.x + h / 3;
    let cp1y = p0.y + (m[i] * h) / 3;

    const cp2x = p1.x - h / 3;
    let cp2y = p1.y - (m[i + 1] * h) / 3;

    if (baselineY !== undefined) {
      cp1y = Math.min(cp1y, baselineY);
      cp2y = Math.min(cp2y, baselineY);
    }

    d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p1.x.toFixed(2)},${p1.y.toFixed(2)}`;
  }

  return d;
}

function getMonotoneBezierAreaPath(points, bottomY) {
  const linePath = getMonotoneBezierPath(points, bottomY);
  if (!linePath) return '';
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  return `${linePath} L ${lastPoint.x.toFixed(2)},${bottomY.toFixed(2)} L ${firstPoint.x.toFixed(2)},${bottomY.toFixed(2)} Z`;
}

/**
 * RevenueChart - Enhanced financial chart component with support for:
 *  - Monthly ('monthly') & Daily ('daily') period aggregations
 *  - Bar ('bar') & Area/Line ('area') visualization modes
 *  - Continuous timeline rendering (prevents empty timeline gaps)
 */
export function RevenueChart({ data = [], mode = 'revenue' }) {
  const svgRef = useRef(null);
  const [periodView, setPeriodView] = useState('monthly'); // 'monthly' | 'daily'
  const [chartType, setChartType] = useState('bar'); // 'bar' | 'area'
  const [activeIdx, setActiveIdx] = useState(null);
  const [tooltip, setTooltip] = useState(null);

  const chartWidth = 800;
  const chartHeight = 220;
  const paddingLeft = 58;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 34;
  const usableW = chartWidth - paddingLeft - paddingRight;
  const usableH = chartHeight - paddingTop - paddingBottom;

  const valueKey = mode === 'expenses' ? 'expenses' : mode === 'balance' ? 'balance' : 'revenue';
  const meta = MODE_META[mode] ?? MODE_META.revenue;

  const periodData = useMemo(() => {
    if (periodView === 'monthly') {
      return aggregateMonthlyData(data);
    }
    return aggregateDailyData(data);
  }, [data, periodView]);

  const values = useMemo(() => periodData.map((item) => Number(item[valueKey] ?? 0)), [periodData, valueKey]);
  const scale = useMemo(() => buildMoneyScale(values), [values]);

  const gridValues = useMemo(() => (
    scale.ticks.map((value) => ({
      value,
      y: getYForValue(value, scale, paddingTop, usableH),
    }))
  ), [scale, usableH]);

  const baselineY = useMemo(() => getYForValue(Math.max(0, scale.min), scale, paddingTop, usableH), [scale, usableH]);

  const points = useMemo(() => {
    if (!periodData.length) return [];
    const N = periodData.length;

    return periodData.map((item, index) => {
      const value = Number(item[valueKey] ?? 0);
      const x = N === 1 ? paddingLeft + usableW / 2 : paddingLeft + (index / (N - 1)) * usableW;

      const segmentW = usableW / N;
      const barX = paddingLeft + index * segmentW;
      const barWidth = Math.min(Math.max(segmentW * 0.55, 6), 36);
      const barOffsetX = barX + (segmentW - barWidth) / 2;

      const y = getYForValue(value, scale, paddingTop, usableH);

      return {
        ...item,
        index,
        x,
        y,
        barOffsetX,
        barWidth,
        segmentW,
        value,
      };
    });
  }, [periodData, scale, usableH, usableW, valueKey]);

  const linePath = useMemo(() => getMonotoneBezierPath(points, baselineY), [points, baselineY]);
  const areaPath = useMemo(() => getMonotoneBezierAreaPath(points, baselineY), [points, baselineY]);

  // Statistics
  const stats = useMemo(() => {
    if (!values.length) return { total: 0, avg: 0, max: 0 };
    const total = values.reduce((sum, v) => sum + v, 0);
    const avg = total / values.length;
    const max = Math.max(...values, 0);
    return { total, avg, max };
  }, [values]);

  const handleMouseMove = useCallback((event) => {
    if (!svgRef.current || !points.length) return;

    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((event.clientX - rect.left) / rect.width) * chartWidth;

    let closest = 0;
    let closestDist = Infinity;

    points.forEach((point, index) => {
      const targetX = chartType === 'bar' ? point.barOffsetX + point.barWidth / 2 : point.x;
      const distance = Math.abs(targetX - mouseX);

      if (distance < closestDist) {
        closestDist = distance;
        closest = index;
      }
    });

    const point = points[closest];
    setActiveIdx(closest);
    const targetX = chartType === 'bar' ? point.barOffsetX + point.barWidth / 2 : point.x;

    setTooltip({
      pctX: (targetX / chartWidth) * 100,
      pctY: (point.y / chartHeight) * 100,
      point,
    });
  }, [chartType, points]);

  const handleMouseLeave = useCallback(() => {
    setActiveIdx(null);
    setTooltip(null);
  }, []);

  const activePoint = activeIdx !== null ? points[activeIdx] : null;

  if (!data.length || !periodData.length) {
    return (
      <div className="mb-6 flex h-[240px] w-full items-center justify-center rounded-[24px] border border-white/5 bg-white/[0.02] text-sm text-dn-text-muted">
        Sem dados financeiros para exibir o gráfico.
      </div>
    );
  }

  return (
    <div className="relative mb-6 w-full rounded-[24px] border border-white/[0.06] bg-[#0d1728]/60 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
      {/* GLOW DECORATION */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[24px] bg-[radial-gradient(circle_at_20%_0%,rgba(58,191,255,0.10),transparent_40%)]" />

      {/* TOP CONTROLS BAR */}
      <div className="relative z-20 mb-3 flex flex-wrap items-center justify-between gap-3 px-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color, boxShadow: `0 0 8px ${meta.glow}` }} />
            {meta.label}
          </span>
          <span className="text-[11px] font-mono text-dn-text-muted">
            {periodView === 'monthly' ? `${periodData.length} Meses` : `${periodData.length} Dias`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* MENSAL / DIÁRIO TOGGLE */}
          <div className="flex rounded-lg border border-white/10 bg-black/30 p-0.5">
            <button
              onClick={() => setPeriodView('monthly')}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
                periodView === 'monthly' ? 'bg-white/15 text-white shadow-sm' : 'text-dn-text-muted hover:text-white'
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setPeriodView('daily')}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
                periodView === 'daily' ? 'bg-white/15 text-white shadow-sm' : 'text-dn-text-muted hover:text-white'
              }`}
            >
              Diário
            </button>
          </div>

          {/* BARRAS / LINHA TOGGLE */}
          <div className="flex rounded-lg border border-white/10 bg-black/30 p-0.5">
            <button
              onClick={() => setChartType('bar')}
              title="Gráfico de Barras"
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
                chartType === 'bar' ? 'bg-white/15 text-white shadow-sm' : 'text-dn-text-muted hover:text-white'
              }`}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="12" width="4" height="8" rx="1" />
                <rect x="10" y="8" width="4" height="12" rx="1" />
                <rect x="17" y="4" width="4" height="16" rx="1" />
              </svg>
              Barras
            </button>
            <button
              onClick={() => setChartType('area')}
              title="Gráfico de Linha / Área"
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
                chartType === 'area' ? 'bg-white/15 text-white shadow-sm' : 'text-dn-text-muted hover:text-white'
              }`}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 17l6-6 4 4 8-8" />
              </svg>
              Linha
            </button>
          </div>
        </div>
      </div>

      {/* SVG GRAPH CANVAS */}
      <div
        className="relative h-[220px] w-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="relative z-10 h-full w-full"
          preserveAspectRatio="none"
          role="img"
          aria-label="Gráfico de Desempenho Financeiro"
        >
          <defs>
            <linearGradient id={`finance-area-${mode}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={meta.faded} />
              <stop offset="100%" stopColor="rgba(13,23,40,0)" />
            </linearGradient>

            <linearGradient id={`finance-bar-${mode}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={meta.gradientStart} />
              <stop offset="100%" stopColor={meta.gradientEnd} />
            </linearGradient>

            <filter id={`finance-glow-${mode}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* GRID LINES & Y LABELS */}
          {gridValues.map((grid) => (
            <g key={grid.value}>
              <line
                x1={paddingLeft}
                y1={grid.y}
                x2={chartWidth - paddingRight}
                y2={grid.y}
                stroke={grid.value === 0 ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)'}
                strokeWidth={grid.value === 0 ? '1.5' : '1'}
              />
              <text
                x={paddingLeft - 10}
                y={grid.y + 4}
                textAnchor="end"
                className="fill-dn-text-muted text-[10px] font-mono"
              >
                {formatShortCurrency(grid.value)}
              </text>
            </g>
          ))}

          {/* HOVER COLUMN TRACK HIGHLIGHT */}
          {activePoint && chartType === 'bar' && (
            <rect
              x={paddingLeft + activePoint.index * activePoint.segmentW}
              y={paddingTop}
              width={activePoint.segmentW}
              height={usableH}
              fill="rgba(255,255,255,0.03)"
              rx="4"
            />
          )}

          {/* HOVER CROSSHAIR LINE */}
          {activePoint && chartType === 'area' && (
            <line
              x1={activePoint.x}
              y1={paddingTop}
              x2={activePoint.x}
              y2={paddingTop + usableH}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          )}

          {/* AREA / LINE MODE RENDER */}
          {chartType === 'area' && (
            <>
              {areaPath && (
                <path
                  d={areaPath}
                  fill={`url(#finance-area-${mode})`}
                  className="transition-all duration-300"
                />
              )}

              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke={meta.color}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter={`url(#finance-glow-${mode})`}
                  className="transition-all duration-300"
                />
              )}

              {points.map((point, index) => {
                const isActive = activeIdx === index;
                return (
                  <g key={`pt-${point.id}`}>
                    {isActive && (
                      <circle cx={point.x} cy={point.y} r="10" fill={meta.color} opacity="0.2" />
                    )}
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={isActive ? 5 : point.value > 0 ? 3.5 : 2}
                      fill={isActive ? '#0d1728' : meta.color}
                      stroke={meta.color}
                      strokeWidth={isActive ? 3 : 1.5}
                      opacity={point.value > 0 || isActive ? 1 : 0.4}
                    />
                  </g>
                );
              })}
            </>
          )}

          {/* BAR MODE RENDER */}
          {chartType === 'bar' && (
            <g>
              {points.map((point, index) => {
                const isActive = activeIdx === index;
                const height = Math.max(Math.abs(baselineY - point.y), point.value > 0 ? 4 : 2);
                const barY = point.value >= 0 ? point.y : baselineY;

                return (
                  <g key={`bar-${point.id}`}>
                    <rect
                      x={point.barOffsetX}
                      y={barY}
                      width={point.barWidth}
                      height={height}
                      rx={Math.min(point.barWidth / 2, 5)}
                      fill={isActive ? meta.color : `url(#finance-bar-${mode})`}
                      opacity={point.value === 0 && !isActive ? 0.3 : 1}
                      filter={isActive ? `url(#finance-glow-${mode})` : undefined}
                      className="transition-all duration-200"
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* X AXIS LABELS */}
          {points.map((point, index) => {
            const totalCount = points.length;
            const stride = Math.ceil(totalCount / 12);
            const shouldShowLabel =
              periodView === 'monthly' ||
              index === 0 ||
              index === totalCount - 1 ||
              index % stride === 0;

            if (!shouldShowLabel) return null;

            const labelX = chartType === 'bar' ? point.barOffsetX + point.barWidth / 2 : point.x;
            const isActive = activePoint?.id === point.id;

            return (
              <text
                key={`lbl-${point.id}`}
                x={labelX}
                y={chartHeight - 10}
                textAnchor="middle"
                className={`text-[10px] font-mono transition-colors ${
                  isActive ? 'fill-white font-bold' : 'fill-dn-text-muted'
                }`}
              >
                {point.dateLabel}
              </text>
            );
          })}
        </svg>

        {/* INTERACTIVE TOOLTIP */}
        {tooltip && (
          <div
            className="pointer-events-none absolute z-30"
            style={{
              left: `${Math.min(Math.max(tooltip.pctX, 12), 88)}%`,
              top: `${Math.min(Math.max(tooltip.pctY, 15), 68)}%`,
              transform: 'translate(-50%, -115%)',
            }}
          >
            <div className="min-w-[150px] rounded-xl border border-white/20 bg-[#071627]/95 px-3 py-2.5 text-white shadow-2xl backdrop-blur-xl">
              <p className="mb-1 text-[10px] font-mono text-dn-text-muted">{tooltip.point.fullDateLabel}</p>
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: meta.color, boxShadow: `0 0 10px ${meta.glow}` }}
                />
                <div>
                  <p className="text-sm font-bold tracking-tight">{formatCurrency(tooltip.point.value)}</p>
                  <p className="text-[9px] text-dn-text-muted">{meta.label}</p>
                </div>
              </div>

              {mode === 'balance' && (
                <div className="mt-2 flex gap-3 border-t border-white/10 pt-1.5 text-[9px]">
                  <span className="text-dn-success">+ {formatCurrency(tooltip.point.revenue)}</span>
                  <span className="text-dn-warning">- {formatCurrency(tooltip.point.expenses)}</span>
                </div>
              )}
            </div>
            <div className="mx-auto -mt-1 h-2.5 w-2.5 rotate-45 border-b border-r border-white/20 bg-[#071627]/95" />
          </div>
        )}
      </div>

      {/* SUMMARY METRICS FOOTER */}
      <div className="mt-2 flex items-center justify-between border-t border-white/[0.06] pt-3 text-[11px]">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-dn-text-muted">Total: </span>
            <span className="font-mono font-semibold text-white">{formatCurrency(stats.total)}</span>
          </div>
          <div>
            <span className="text-dn-text-muted">Média: </span>
            <span className="font-mono font-semibold text-white">{formatCurrency(stats.avg)}</span>
          </div>
        </div>
        <div>
          <span className="text-dn-text-muted">Pico: </span>
          <span className="font-mono font-semibold text-white" style={{ color: meta.color }}>
            {formatCurrency(stats.max)}
          </span>
        </div>
      </div>
    </div>
  );
}

