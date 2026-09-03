import React, { useState } from 'react';
import { DollarSign, Clock, ShieldCheck, Flame, Users, TrendingUp } from 'lucide-react';

export interface ReportItem {
  _id: string;
  departmentName?: string;
  departmentCode?: string;
  totalBaseSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  totalNetSalary: number;
  averageNetSalary: number;
  payrollCount: number;
}

interface ChartProps {
  data: ReportItem[];
}

/* ==========================================================================
   1. COST BAR CHART (Clean Enterprise SVG Bar Chart)
   ========================================================================== */
export const CostBarChart: React.FC<ChartProps> = ({ data }) => {
  const [metric, setMetric] = useState<'total' | 'avg'>('total');
  const [activeBar, setActiveBar] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="bg-surface-card border border-surface-border rounded-xl p-6 h-64 flex items-center justify-center text-zinc-500 text-sm">
        No financial cost center data available.
      </div>
    );
  }

  const width = 520;
  const height = 250;
  const paddingLeft = 55;
  const paddingRight = 20;
  const paddingTop = 30;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const values = data.map(d => metric === 'total' ? d.totalNetSalary : d.averageNetSalary);
  const maxVal = Math.max(...values, 1000);
  const step = metric === 'total' ? 5000 : 1000;
  const yMax = Math.ceil(maxVal / step) * step;

  const getBarHeight = (val: number) => {
    return yMax > 0 ? (val / yMax) * chartHeight : 0;
  };

  const barColors = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6'];

  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-5 flex flex-col justify-between shadow-sm">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-indigo-400" />
            Department Cost Centers
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">Net salary disbursement breakdown</p>
        </div>
        <div className="flex items-center bg-[#181a24] p-0.5 rounded-lg border border-[#272a38] text-xs">
          <button
            onClick={() => setMetric('total')}
            className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
              metric === 'total' ? 'bg-[#272a38] text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Total Net
          </button>
          <button
            onClick={() => setMetric('avg')}
            className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
              metric === 'avg' ? 'bg-[#272a38] text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Avg / Head
          </button>
        </div>
      </div>

      <div className="relative w-full flex justify-center">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          {/* Y Axis Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = paddingTop + chartHeight - ratio * chartHeight;
            const gridVal = Math.round(ratio * yMax);
            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#1c1f2b"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3.5}
                  fill="#71717a"
                  fontSize="10"
                  textAnchor="end"
                  fontWeight="500"
                >
                  {gridVal >= 1000 ? `$${(gridVal / 1000).toFixed(0)}k` : `$${gridVal}`}
                </text>
              </g>
            );
          })}

          {/* Bars Rendering */}
          {data.map((item, idx) => {
            const val = metric === 'total' ? item.totalNetSalary : item.averageNetSalary;
            const barWidth = 32;
            const gap = (chartWidth - barWidth * data.length) / (data.length + 1);
            const x = paddingLeft + gap + idx * (barWidth + gap);
            const barHeight = getBarHeight(val);
            const y = paddingTop + chartHeight - barHeight;
            const color = barColors[idx % barColors.length];
            const isHovered = activeBar === idx;

            return (
              <g
                key={item._id}
                className="cursor-pointer"
                onMouseEnter={() => setActiveBar(idx)}
                onMouseLeave={() => setActiveBar(null)}
              >
                {/* Hit area */}
                <rect
                  x={x - gap / 3}
                  y={paddingTop}
                  width={barWidth + (gap * 2) / 3}
                  height={chartHeight}
                  fill="transparent"
                />

                {/* Clean Flat Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx="4"
                  fill={color}
                  opacity={activeBar !== null && !isHovered ? 0.4 : 0.9}
                  className="transition-opacity duration-150"
                />

                {/* Tooltip on Hover */}
                {isHovered && (
                  <g pointerEvents="none">
                    <rect
                      x={x - 24}
                      y={Math.max(6, y - 28)}
                      width={barWidth + 48}
                      height={22}
                      rx="4"
                      fill="#1e212d"
                      stroke="#2e3346"
                      strokeWidth="1"
                    />
                    <text
                      x={x + barWidth / 2}
                      y={Math.max(6, y - 28) + 15}
                      fill="#ffffff"
                      fontSize="10"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      ${Math.round(val).toLocaleString()}
                    </text>
                  </g>
                )}

                {/* X Axis label */}
                <text
                  x={x + barWidth / 2}
                  y={height - 18}
                  fill={isHovered ? '#ffffff' : '#a1a1aa'}
                  fontSize="10"
                  fontWeight="500"
                  textAnchor="middle"
                >
                  {item.departmentName || item._id || 'Dept'}
                </text>
              </g>
            );
          })}

          {/* Baseline */}
          <line
            x1={paddingLeft}
            y1={paddingTop + chartHeight}
            x2={width - paddingRight}
            y2={paddingTop + chartHeight}
            stroke="#272a38"
            strokeWidth="1"
          />
        </svg>
      </div>
    </div>
  );
};

/* ==========================================================================
   2. STAFF DONUT CHART (Clean Enterprise Segment Slices)
   ========================================================================== */
export const StaffDonutChart: React.FC<ChartProps> = ({ data }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="bg-surface-card border border-surface-border rounded-xl p-6 h-64 flex items-center justify-center text-zinc-500 text-sm">
        No roster distribution data available.
      </div>
    );
  }

  const size = 160;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const totalRuns = data.reduce((acc, curr) => acc + curr.payrollCount, 0);
  const colors = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6'];

  const segments = data.reduce<{
    elements: { item: ReportItem; color: string; strokeLength: number; strokeOffset: number; percentage: number }[];
    offset: number;
  }>((acc, item, idx) => {
    const color = colors[idx % colors.length];
    const segmentPercentage = totalRuns > 0 ? item.payrollCount / totalRuns : 0;
    const strokeLength = segmentPercentage * circumference;
    const strokeOffset = circumference - acc.offset * circumference;
    return {
      elements: [
        ...acc.elements,
        {
          item,
          color,
          strokeLength,
          strokeOffset,
          percentage: Math.round(segmentPercentage * 100)
        }
      ],
      offset: acc.offset + segmentPercentage
    };
  }, { elements: [], offset: 0 }).elements;

  const activeItem = hoveredIndex !== null ? segments[hoveredIndex] : null;

  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-5 flex flex-col sm:flex-row items-center justify-around gap-6 shadow-sm">
      <div className="space-y-1 text-center sm:text-left flex-1">
        <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2 justify-center sm:justify-start">
          <Users className="w-4 h-4 text-emerald-400" />
          Staff Distribution
        </h3>
        <p className="text-xs text-zinc-400">Headcount across departments</p>

        {/* Dynamic Legend */}
        <div className="pt-3 space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
          {segments.map(({ item, color, percentage }, idx) => {
            const isHovered = hoveredIndex === idx;
            return (
              <div
                key={item._id}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`flex items-center justify-between p-1 rounded-md cursor-pointer transition text-xs ${
                  isHovered ? 'bg-white/6' : 'hover:bg-white/3'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-zinc-300 truncate max-w-27.5">
                    {item.departmentName || item._id || 'General'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 text-[11px]">{item.payrollCount}</span>
                  <span className="text-zinc-200 font-semibold text-[11px]">
                    {percentage}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#1c1f2b"
            strokeWidth={strokeWidth}
          />
          {segments.map(({ item, color, strokeLength, strokeOffset }, idx) => (
            <circle
              key={item._id}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke={color}
              strokeWidth={hoveredIndex === idx ? strokeWidth + 2 : strokeWidth}
              strokeDasharray={`${strokeLength} ${circumference}`}
              strokeDashoffset={strokeOffset}
              strokeLinecap="round"
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="transition-all duration-150 cursor-pointer"
              opacity={hoveredIndex !== null && hoveredIndex !== idx ? 0.35 : 0.95}
            />
          ))}
        </svg>

        {/* Center Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold text-white tracking-tight">
            {activeItem ? `${activeItem.percentage}%` : totalRuns}
          </span>
          <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">
            {activeItem ? activeItem.item.departmentName || 'Share' : 'Total'}
          </span>
        </div>
      </div>
    </div>
  );
};

/* ==========================================================================
   3. ATTENDANCE TREND AREA CHART (Clean Spline Curve)
   ========================================================================== */
interface TrendPoint {
  day: string;
  present: number;
  late: number;
  onLeave: number;
}

export const AttendanceTrendAreaChart: React.FC<{ data?: TrendPoint[] }> = ({ data }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const points: TrendPoint[] = data && data.length > 0 ? data : [
    { day: 'Mon', present: 228, late: 12, onLeave: 8 },
    { day: 'Tue', present: 235, late: 7, onLeave: 6 },
    { day: 'Wed', present: 240, late: 4, onLeave: 4 },
    { day: 'Thu', present: 232, late: 10, onLeave: 6 },
    { day: 'Fri', present: 225, late: 15, onLeave: 8 },
    { day: 'Sat', present: 195, late: 8, onLeave: 45 },
    { day: 'Sun', present: 180, late: 5, onLeave: 63 }
  ];

  const width = 500;
  const height = 180;
  const padL = 35;
  const padR = 20;
  const padT = 20;
  const padB = 30;

  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const maxVal = Math.max(...points.map(p => p.present + p.late), 250);
  const minVal = Math.min(...points.map(p => p.present), 150) * 0.9;

  const getX = (idx: number) => padL + (idx / (points.length - 1)) * chartW;
  const getY = (val: number) => padT + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;

  const pathD = points.reduce((acc, curr, idx) => {
    const x = getX(idx);
    const y = getY(curr.present);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const areaD = `${pathD} L ${getX(points.length - 1)} ${padT + chartH} L ${getX(0)} ${padT + chartH} Z`;

  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            7-Day Attendance Rate
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">Daily workforce presence</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-medium">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Present
          </span>
          <span className="flex items-center gap-1.5 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Late
          </span>
        </div>
      </div>

      <div className="relative w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          <defs>
            <linearGradient id="attendance-clean-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Area fill */}
          <path d={areaD} fill="url(#attendance-clean-grad)" />

          {/* Line stroke */}
          <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />

          {/* Dots & interaction points */}
          {points.map((p, idx) => {
            const x = getX(idx);
            const y = getY(p.present);
            const isHovered = hoveredIdx === idx;

            return (
              <g
                key={p.day}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <rect x={x - 15} y={padT} width={30} height={chartH} fill="transparent" />

                {isHovered && (
                  <line
                    x1={x}
                    y1={padT}
                    x2={x}
                    y2={padT + chartH}
                    stroke="#2e3346"
                    strokeDasharray="2 2"
                  />
                )}

                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 5 : 3.5}
                  fill="#11131a"
                  stroke="#10b981"
                  strokeWidth="2"
                  className="transition-all duration-150"
                />

                <text
                  x={x}
                  y={height - 8}
                  fill={isHovered ? '#ffffff' : '#71717a'}
                  fontSize="10"
                  fontWeight="500"
                  textAnchor="middle"
                >
                  {p.day}
                </text>

                {isHovered && (
                  <g pointerEvents="none">
                    <rect
                      x={x - 36}
                      y={Math.max(4, y - 28)}
                      width={72}
                      height={22}
                      rx="4"
                      fill="#1e212d"
                      stroke="#2e3346"
                      strokeWidth="1"
                    />
                    <text
                      x={x}
                      y={Math.max(4, y - 28) + 15}
                      fill="#ffffff"
                      fontSize="10"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {p.present} Present
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

/* ==========================================================================
   4. EXPENSE DISTRIBUTION (Clean Horizontal Meters)
   ========================================================================== */
interface ExpenseCategory {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

export const ExpenseDistributionChart: React.FC<{ items?: ExpenseCategory[] }> = ({ items }) => {
  const categories: ExpenseCategory[] = items && items.length > 0 ? items : [
    { category: 'Travel & Lodging', amount: 8450, percentage: 42, color: 'bg-indigo-500' },
    { category: 'Software & Licenses', amount: 5200, percentage: 26, color: 'bg-sky-500' },
    { category: 'Hardware Equipment', amount: 3900, percentage: 19, color: 'bg-emerald-500' },
    { category: 'Client Hospitality', amount: 2600, percentage: 13, color: 'bg-amber-500' }
  ];

  const total = categories.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-indigo-400" />
            Expense Reimbursements by Category
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">Total Approved: ${total.toLocaleString()}</p>
        </div>
        <span className="text-xs font-semibold text-indigo-300 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
          Q3 Report
        </span>
      </div>

      <div className="space-y-3 pt-1">
        {categories.map(c => (
          <div key={c.category} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-medium">{c.category}</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">${c.amount.toLocaleString()}</span>
                <span className="text-zinc-500 text-[11px]">({c.percentage}%)</span>
              </div>
            </div>
            <div className="w-full h-2 bg-[#181a24] rounded-full overflow-hidden border border-[#232634]">
              <div
                className={`h-full rounded-full ${c.color}`}
                style={{ width: `${c.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ==========================================================================
   5. EMPLOYEE ATTENDANCE GAUGE (Clean Circular Progress)
   ========================================================================== */
interface GaugeProps {
  percentage: number;
  daysPresent: number;
  totalDays: number;
  streakDays: number;
}

export const EmployeeAttendanceGauge: React.FC<GaugeProps> = ({
  percentage = 94,
  daysPresent = 21,
  totalDays = 22,
  streakDays = 14
}) => {
  const size = 140;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-5 shadow-sm flex flex-col items-center justify-between gap-4 text-center">
      <div className="flex items-center justify-between w-full">
        <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-emerald-400" /> Attendance Rate
        </span>
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
          <Flame className="w-3 h-3" /> {streakDays}d Streak
        </span>
      </div>

      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#1c1f2b"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#10b981"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white tracking-tight">{percentage}%</span>
          <span className="text-[10px] text-zinc-400 font-medium">Monthly Rate</span>
        </div>
      </div>

      <div className="w-full flex items-center justify-around border-t border-surface-border pt-3 text-xs">
        <div>
          <span className="block text-zinc-500 text-[10px]">Logged</span>
          <span className="font-semibold text-white">{daysPresent} / {totalDays}</span>
        </div>
        <div className="h-5 w-px bg-surface-border" />
        <div>
          <span className="block text-zinc-500 text-[10px]">Overtime</span>
          <span className="font-semibold text-emerald-400">+4.5 hrs</span>
        </div>
      </div>
    </div>
  );
};

/* ==========================================================================
   6. LEAVE BALANCE METERS (Employee PTO Allocation)
   ========================================================================== */
interface LeaveCategory {
  name: string;
  available: number;
  total: number;
  color: string;
}

export const LeaveBalanceMeter: React.FC<{ items?: LeaveCategory[] }> = ({ items }) => {
  const leaves: LeaveCategory[] = items && items.length > 0 ? items : [
    { name: 'Annual Vacation', available: 8, total: 14, color: 'bg-emerald-500' },
    { name: 'Sick & Medical', available: 4, total: 6, color: 'bg-amber-500' },
    { name: 'Casual & Personal', available: 2, total: 4, color: 'bg-indigo-500' }
  ];

  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          Leave Allocation
        </h3>
        <span className="text-xs text-indigo-400 font-medium">14 Days Available</span>
      </div>

      <div className="space-y-3 pt-1">
        {leaves.map(l => {
          const pct = Math.round((l.available / l.total) * 100);
          return (
            <div key={l.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-medium">{l.name}</span>
                <span className="text-zinc-200 font-semibold">
                  {l.available} <span className="text-zinc-500 font-normal">/ {l.total} remaining</span>
                </span>
              </div>
              <div className="w-full h-2 bg-[#181a24] rounded-full overflow-hidden border border-[#232634]">
                <div
                  className={`h-full rounded-full ${l.color}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ==========================================================================
   7. SALARY BREAKDOWN BAR (Gross vs Deductions vs Net)
   ========================================================================== */
interface SalaryProps {
  baseSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
}

export const SalaryStructureBreakdown: React.FC<SalaryProps> = ({
  baseSalary = 7500,
  allowances = 1850,
  deductions = 700,
  netSalary = 8650
}) => {
  const gross = baseSalary + allowances;
  const netPct = Math.round((netSalary / (gross + deductions)) * 100);
  const dedPct = 100 - netPct;

  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-400" />
          Compensation Structure
        </h3>
        <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
          Net: ${netSalary.toLocaleString()}
        </span>
      </div>

      <div className="space-y-2">
        <div className="w-full h-2.5 bg-[#181a24] rounded-full overflow-hidden flex border border-[#232634]">
          <div
            className="h-full bg-emerald-500"
            style={{ width: `${netPct}%` }}
          />
          <div
            className="h-full bg-rose-500"
            style={{ width: `${dedPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span className="flex items-center gap-1.5 text-zinc-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Net Take-Home: ${netSalary.toLocaleString()} ({netPct}%)
          </span>
          <span className="flex items-center gap-1.5 text-zinc-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Deductions: ${deductions.toLocaleString()} ({dedPct}%)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5 pt-2 text-center text-xs">
        <div className="p-2 rounded-lg bg-[#0e1017] border border-surface-border">
          <span className="block text-zinc-500 text-[10px]">Base Salary</span>
          <span className="font-semibold text-white">${baseSalary.toLocaleString()}</span>
        </div>
        <div className="p-2 rounded-lg bg-[#0e1017] border border-surface-border">
          <span className="block text-zinc-500 text-[10px]">Allowances</span>
          <span className="font-semibold text-emerald-400">+${allowances.toLocaleString()}</span>
        </div>
        <div className="p-2 rounded-lg bg-[#0e1017] border border-surface-border">
          <span className="block text-zinc-500 text-[10px]">Taxes / Deductions</span>
          <span className="font-semibold text-rose-400">-${deductions.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};
