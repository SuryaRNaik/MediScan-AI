import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────────
const isNormal = (s) => (s || '').trim().toUpperCase() === 'NORMAL';

/**
 * Parse a reference range string like "13.5-17.5", "> 30", "< 200", "40-130"
 * and return its midpoint.  Falls back to the raw value if parsing fails.
 */
function parseMidpoint(referenceRange, rawValue) {
  if (!referenceRange) return null;
  const clean = referenceRange.replace(/\s/g, '');

  // Range: "13.5-17.5"  or  "4,500-10,000"  (handle commas)
  const rangeMatch = clean.replace(/,/g, '').match(/^([\d.]+)[-–]([\d.]+)$/);
  if (rangeMatch) {
    const lo = parseFloat(rangeMatch[1]);
    const hi = parseFloat(rangeMatch[2]);
    if (!isNaN(lo) && !isNaN(hi)) return (lo + hi) / 2;
  }

  // Greater-than: "> 30"  or  ">30"
  const gtMatch = clean.match(/^[>≥]([\d.]+)$/);
  if (gtMatch) return parseFloat(gtMatch[1]) * 1.5; // use 150 % of threshold as "good"

  // Less-than: "< 200"  or  "<200"
  const ltMatch = clean.match(/^[<≤]([\d.]+)$/);
  if (ltMatch) return parseFloat(ltMatch[1]) * 0.6; // use 60 % of threshold as "good"

  return null;
}

/**
 * Convert a raw biomarker value to a % of its reference midpoint.
 * 100 % = exactly at midpoint (ideal).
 * < 100 % = below midpoint.  > 100 % = above midpoint.
 * Clamped to 0–250 so extreme outliers don't crush the chart.
 */
function toPercent(bm) {
  const raw = parseFloat(String(bm.value).replace(/,/g, ''));
  if (isNaN(raw)) return 0;
  const mid = parseMidpoint(bm.reference_range, raw);
  if (!mid || mid === 0) return 100; // can't normalise — show as 100 %
  return Math.min(250, Math.max(0, Math.round((raw / mid) * 100)));
}

// ── Custom Tooltip ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-white p-4 rounded-xl shadow-xl border border-gray-200 max-w-xs">
        <p className="font-bold text-gray-900 mb-1">{d.name}</p>
        <p className="text-blue-600 font-bold text-base">
          {d.value} {d.unit}
        </p>
        <p className="text-xs text-gray-500">Reference: {d.reference_range}</p>
        <p className={`text-xs font-semibold mt-1 ${isNormal(d.status) ? 'text-green-600' : 'text-red-600'}`}>
          {isNormal(d.status) ? '✓ Normal' : '⚠ Abnormal'}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Chart shows % of reference midpoint
        </p>
      </div>
    );
  }
  return null;
};

// ── Main Component ──────────────────────────────────────────────────────────
export default function HealthChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-80 w-full bg-white p-8 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-center">
        <p className="text-gray-500">No biomarker data available</p>
      </div>
    );
  }

  // Build normalised chart dataset
  const chartData = data.map((bm) => ({
    ...bm,
    pct: toPercent(bm),
  }));

  const normalCount   = data.filter((d) => isNormal(d.status)).length;
  const abnormalCount = data.filter((d) => !isNormal(d.status)).length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp className="text-blue-600" size={24} />
          Biomarker Visualization
        </h3>
        <p className="text-gray-600 text-sm mt-1">
          Each bar shows the value as a % of its reference range midpoint — 100% = ideal centre
        </p>
      </div>

      <div className="p-6">
        <ResponsiveContainer width="100%" height={420}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 80 }}>
            <defs>
              <linearGradient id="normalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <linearGradient id="abnormalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#dc2626" />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />

            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={110}
              tick={{ fill: '#6b7280', fontSize: 11 }}
              interval={0}
            />

            <YAxis
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickFormatter={(v) => `${v}%`}
              domain={[0, 200]}
              ticks={[0, 50, 100, 150, 200]}
              label={{
                value: '% of Ref. Midpoint',
                angle: -90,
                position: 'insideLeft',
                offset: 10,
                style: { fill: '#9ca3af', fontSize: 11 },
              }}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Reference line at 100 % = ideal */}
            <ReferenceLine
              y={100}
              stroke="#3b82f6"
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{ value: 'Ideal (100%)', position: 'right', fill: '#3b82f6', fontSize: 10 }}
            />

            <Bar dataKey="pct" radius={[6, 6, 0, 0]} animationDuration={800} maxBarSize={40}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={isNormal(entry.status) ? 'url(#normalGradient)' : 'url(#abnormalGradient)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="w-4 h-4 rounded bg-gradient-to-b from-green-500 to-green-600 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-gray-600">Normal Range</p>
              <p className="text-sm font-bold text-green-700">{normalCount} values</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="w-4 h-4 rounded bg-gradient-to-b from-red-500 to-red-600 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-gray-600">Abnormal</p>
              <p className="text-sm font-bold text-red-700">{abnormalCount} values</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}