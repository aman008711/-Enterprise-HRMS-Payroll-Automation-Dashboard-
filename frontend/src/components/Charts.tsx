import React, { useState } from 'react';
import { TrendingUp, Users, DollarSign, Clock, ShieldCheck, Flame } from 'lucide-react';

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
   1. COST BAR CHART (with Total vs Average metric toggle & glow tooltips)
   ========================================================================== */
export const CostBarChart: React.FC<ChartProps> = ({ data }) => {
  const [metric, setMetric] = useState<'total' | 'avg'>('total');
  const [activeBar, setActiveBar] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="glass-card p-6 rounded-2xl border border-white/5 shadow-xl h-64 flex items-center justify-center text-gray-500 text-sm">
        No financial cost center data available.
      </div>
    );
  }

  const width = 520;
  const height = 260;
  const paddingLeft = 60;
  const paddingRight = 24;
  const paddingTop = 35;
  const paddingBottom = 45;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const values = data.map(d => metric === 'total' ? d.totalNetSalary : d.averageNetSalary);
  const maxVal = Math.max(...values, 1000);
  const step = metric === 'total' ? 5000 : 1000;
  const yMax = Math.ceil(maxVal / step) * step;

  const getBarHeight = (val: number) => {
    return yMax > 0 ? (val / yMax) * chartHeight : 0;
  };

  const colors = [
    { from: '#8b5cf6', to: '#6366f1', glow: 'rgba(139, 92, 246, 0.4)' },
    { from: '#10b981', to: '#14b8a6', glow: 'rgba(16, 185, 129, 0.4)' },
    { from: '#f59e0b', to: '#d97706', glow: 'rgba(245, 158, 11, 0.4)' },
    { from: '#3b82f6', to: '#2563eb', glow: 'rgba(59, 130, 246, 0.4)' },
    { from: '#ec4899', to: '#d946ef', glow: 'rgba(236, 72, 153, 0.4)' }
  ];

  return (
    <div className="glass-card p-6 rounded-2xl border border-white/5 shadow-xl relative overflow-hidden flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-brand-400" />
            Department Cost Centers
          </h3>
          <p className="text-[10px] text-gray-400">Payroll net expenditure distribution</p>
        </div>
        <div className="flex items-center bg-white/5 p-1 rounded-lg border border-white/10 text-xs">
          <button
            onClick={() => setMetric('total')}
            className={`px-3 py-1 rounded-md font-bold transition ${
              metric === 'total' ? 'bg-brand-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Total Net
          </button>
          <button
            onClick={() => setMetric('avg')}
            className={`px-3 py-1 rounded-md font-bold transition ${
              metric === 'avg' ? 'bg-brand-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Avg / Head
          </button>
        </div>
      </div>

      <div className="relative w-full flex justify-center">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          <defs>
            {colors.map((c, idx) => (
              <linearGradient key={idx} id={`bar-grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c.from} />
                <stop offset="100%" stopColor={c.to} />
              </linearGradient>
            ))}
          </defs>

          {/* Y Axis Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = paddingTop + chartHeight - ratio * chartHeight;
            const gridVal = Math.round(ratio * yMax);
            return (
              <g key={idx} className="opacity-40">
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 10}
                  y={y + 3}
                  fill="#9ca3af"
                  fontSize="9.5"
                  textAnchor="end"
                  fontWeight="bold"
                >
                  {gridVal >= 1000 ? `$${(gridVal / 1000).toFixed(0)}k` : `$${gridVal}`}
                </text>
              </g>
            );
          })}

          {/* Bars Rendering */}
          {data.map((item, idx) => {
            const val = metric === 'total' ? item.totalNetSalary : item.averageNetSalary;
            const barWidth = 34;
            const gap = (chartWidth - barWidth * data.length) / (data.length + 1);
            const x = paddingLeft + gap + idx * (barWidth + gap);
            const barHeight = getBarHeight(val);
            const y = paddingTop + chartHeight - barHeight;
            const colorScheme = colors[idx % colors.length];
            const isHovered = activeBar === idx;

            return (
              <g
                key={item._id}
                className="cursor-pointer transition-all duration-300"
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

                {/* Animated Gradient Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx="6"
                  fill={`url(#bar-grad-${idx % colors.length})`}
                  opacity={activeBar !== null && !isHovered ? 0.45 : 0.95}
                  style={{
                    filter: isHovered ? `drop-shadow(0 0 10px ${colorScheme.glow})` : undefined,
                    transition: 'all 0.3s ease'
                  }}
                />

                {/* Tooltip on Hover */}
                {isHovered && (
                  <g className="animate-fade-in pointer-events-none">
                    <rect
                      x={x - 22}
                      y={Math.max(8, y - 30)}
                      width={barWidth + 44}
                      height={24}
                      rx="6"
                      fill="#0f0c1b"
                      stroke={colorScheme.from}
                      strokeWidth="1.5"
                      filter="drop-shadow(0 4px 12px rgba(0,0,0,0.5))"
                    />
                    <text
                      x={x + barWidth / 2}
                      y={Math.max(8, y - 30) + 16}
                      fill="#ffffff"
                      fontSize="9.5"
                      fontWeight="black"
                      textAnchor="middle"
                    >
                      ${Math.round(val).toLocaleString()}
                    </text>
                  </g>
                )}

                {/* X Axis label */}
                <text
                  x={x + barWidth / 2}
                  y={height - 20}
                  fill={isHovered ? '#ffffff' : '#9ca3af'}
                  fontSize="9.5"
                  fontWeight="bold"
                  textAnchor="middle"
                  className="transition-colors duration-200"
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
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    </div>
  );
};

/* ==========================================================================
   2. STAFF DONUT CHART (Interactive Segment Slices + Share Percentage)
   ========================================================================== */
export const StaffDonutChart: React.FC<ChartProps> = ({ data }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="glass-card p-6 rounded-2xl border border-white/5 shadow-xl h-64 flex items-center justify-center text-gray-500 text-sm">
        No roster distribution data available.
      </div>
    );
  }

  const size = 180;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const totalRuns = data.reduce((acc, curr) => acc + curr.payrollCount, 0);

  const colors = ['#8b5cf6', '#10b981', '#f59e0b', '#3b82f6', '#ec4899'];

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
    <div className="glass-card p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col sm:flex-row items-center justify-around gap-6 relative overflow-hidden">
      <div className="space-y-1.5 text-center sm:text-left flex-1">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 justify-center sm:justify-start">
          <Users className="w-4 h-4 text-emerald-400" />
          Staff Distribution
        </h3>
        <p className="text-[10px] text-gray-400 font-medium">Headcount allocation across departments</p>

        {/* Dynamic Legend */}
        <div className="pt-3 space-y-2 max-h-36 overflow-y-auto custom-scrollbar">
          {segments.map(({ item, color, percentage }, idx) => {
            const isHovered = hoveredIndex === idx;
            return (
              <div
                key={item._id}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition text-xs font-semibold ${
                  isHovered ? 'bg-white/10 scale-[1.02]' : 'hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-gray-300 truncate max-w-[110px]">
                    {item.departmentName || item._id || 'General'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-[11px]">{item.payrollCount}</span>
                  <span className="text-white font-bold text-[11px] bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
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
            stroke="rgba(255, 255, 255, 0.04)"
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
              strokeWidth={hoveredIndex === idx ? strokeWidth + 4 : strokeWidth}
              strokeDasharray={`${strokeLength} ${circumference}`}
              strokeDashoffset={strokeOffset}
              strokeLinecap="round"
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="transition-all duration-300 origin-center cursor-pointer"
              opacity={hoveredIndex !== null && hoveredIndex !== idx ? 0.4 : 0.95}
              style={{
                filter: hoveredIndex === idx ? `drop-shadow(0 0 8px ${color})` : undefined
              }}
            />
          ))}
        </svg>

        {/* Center Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-black text-white font-heading">
            {activeItem ? `${activeItem.percentage}%` : totalRuns}
          </span>
          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
            {activeItem ? activeItem.item.departmentName || 'Share' : 'Total Staff'}
          </span>
        </div>
      </div>
    </div>
  );
};

/* ==========================================================================
   3. ATTENDANCE TREND AREA CHART (7-Day Attendance Spline & Velocity)
   ========================================================================== */
interface TrendPoint {
  day: string;
  present: number;
  late: number;
  onLeave: number;
}

export const AttendanceTrendAreaChart: React.FC<{ data?: TrendPoint[] }> = ({ data }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Default sample trend for high-fidelity presentation if not provided
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
  const padL = 40;
  const padR = 20;
  const padT = 20;
  const padB = 30;

  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const maxVal = Math.max(...points.map(p => p.present + p.late), 250);
  const minVal = Math.min(...points.map(p => p.present), 150) * 0.9;

  const getX = (idx: number) => padL + (idx / (points.length - 1)) * chartW;
  const getY = (val: number) => padT + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;

  // Generate SVG path for area & stroke
  const pathD = points.reduce((acc, curr, idx) => {
    const x = getX(idx);
    const y = getY(curr.present);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const areaD = `${pathD} L ${getX(points.length - 1)} ${padT + chartH} L ${getX(0)} ${padT + chartH} Z`;

  return (
    <div className="glass-card p-6 rounded-2xl border border-white/5 shadow-xl relative overflow-hidden space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-teal-400" />
            7-Day Attendance Velocity
          </h3>
          <p className="text-[10px] text-gray-400">Daily present vs punctuality metrics</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-semibold">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
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
            <linearGradient id="attendance-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Area fill */}
          <path d={areaD} fill="url(#attendance-grad)" />

          {/* Line stroke */}
          <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />

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
                {/* Hit column */}
                <rect x={x - 15} y={padT} width={30} height={chartH} fill="transparent" />

                {/* Vertical guide line on hover */}
                {isHovered && (
                  <line
                    x1={x}
                    y1={padT}
                    x2={x}
                    y2={padT + chartH}
                    stroke="rgba(255,255,255,0.2)"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Main point */}
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 6 : 4}
                  fill="#0f0c1b"
                  stroke="#10b981"
                  strokeWidth={isHovered ? 3 : 2}
                  className="transition-all duration-200"
                />

                {/* Day label */}
                <text
                  x={x}
                  y={height - 8}
                  fill={isHovered ? '#ffffff' : '#9ca3af'}
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {p.day}
                </text>

                {/* Hover tooltip */}
                {isHovered && (
                  <g className="animate-fade-in pointer-events-none">
                    <rect
                      x={x - 35}
                      y={Math.max(5, y - 36)}
                      width={70}
                      height={26}
                      rx="6"
                      fill="#0b0816"
                      stroke="#10b981"
                      strokeWidth="1"
                    />
                    <text
                      x={x}
                      y={Math.max(5, y - 36) + 17}
                      fill="#ffffff"
                      fontSize="10"
                      fontWeight="bold"
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
   4. EXPENSE CATEGORY DISTRIBUTION (Progress Meters)
   ========================================================================== */
interface ExpenseCategory {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

export const ExpenseDistributionChart: React.FC<{ items?: ExpenseCategory[] }> = ({ items }) => {
  const categories: ExpenseCategory[] = items && items.length > 0 ? items : [
    { category: 'Travel & Lodging', amount: 8450, percentage: 42, color: 'from-blue-500 to-indigo-500' },
    { category: 'Software & Licenses', amount: 5200, percentage: 26, color: 'from-purple-500 to-pink-500' },
    { category: 'Hardware Equipment', amount: 3900, percentage: 19, color: 'from-emerald-500 to-teal-500' },
    { category: 'Client Hospitality', amount: 2600, percentage: 13, color: 'from-amber-500 to-orange-500' }
  ];

  const total = categories.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="glass-card p-6 rounded-2xl border border-white/5 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-purple-400" />
            Expense Reimbursements by Category
          </h3>
          <p className="text-[10px] text-gray-400">Total Approved Claims: ${total.toLocaleString()}</p>
        </div>
        <span className="text-xs font-black text-purple-300 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
          Q3 Audit
        </span>
      </div>

      <div className="space-y-3.5 pt-1">
        {categories.map(c => (
          <div key={c.category} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-gray-300">{c.category}</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold">${c.amount.toLocaleString()}</span>
                <span className="text-gray-400 text-[10px]">({c.percentage}%)</span>
              </div>
            </div>
            <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${c.color} transition-all duration-700`}
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
   5. EMPLOYEE ATTENDANCE GAUGE (Circular Radial Progress for Personal View)
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
  const size = 150;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="glass-card p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col items-center justify-between gap-4 text-center">
      <div className="flex items-center justify-between w-full">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-emerald-400" /> Attendance Health
        </span>
        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] font-black">
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
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="url(#emp-gauge-grad)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
          <defs>
            <linearGradient id="emp-gauge-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-white font-heading">{percentage}%</span>
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mt-0.5">Punctual</span>
        </div>
      </div>

      <div className="w-full flex items-center justify-around border-t border-white/5 pt-3 text-xs">
        <div>
          <span className="block text-gray-400 text-[10px]">Days Logged</span>
          <span className="font-bold text-white">{daysPresent} / {totalDays}</span>
        </div>
        <div className="h-6 w-px bg-white/10" />
        <div>
          <span className="block text-gray-400 text-[10px]">Overtime</span>
          <span className="font-bold text-teal-400">+4.5 hrs</span>
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
    { name: 'Casual & Personal', available: 2, total: 4, color: 'bg-purple-500' }
  ];

  return (
    <div className="glass-card p-6 rounded-2xl border border-white/5 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          Leave Quota Allocation
        </h3>
        <span className="text-xs text-brand-400 font-bold">14 Days Total Bal.</span>
      </div>

      <div className="space-y-3.5">
        {leaves.map(l => {
          const pct = Math.round((l.available / l.total) * 100);
          return (
            <div key={l.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-gray-300">{l.name}</span>
                <span className="text-white font-bold">
                  {l.available} <span className="text-gray-400 text-[10px]">/ {l.total} Left</span>
                </span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div
                  className={`h-full rounded-full ${l.color} transition-all duration-700`}
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
    <div className="glass-card p-6 rounded-2xl border border-white/5 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-400" />
          Compensation Ledger Structure
        </h3>
        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
          Net Take-Home: ${netSalary.toLocaleString()}
        </span>
      </div>

      <div className="space-y-2">
        <div className="w-full h-3.5 bg-white/5 rounded-full overflow-hidden flex p-0.5 border border-white/10">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-l-full"
            style={{ width: `${netPct}%` }}
            title={`Net Take Home: ${netPct}%`}
          />
          <div
            className="h-full bg-gradient-to-r from-rose-500 to-red-400 rounded-r-full"
            style={{ width: `${dedPct}%` }}
            title={`Deductions & Taxes: ${dedPct}%`}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400 px-1">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Net Salary: ${netSalary.toLocaleString()} ({netPct}%)
          </span>
          <span className="flex items-center gap-1.5 text-rose-400">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            Tax & Deductions: ${deductions.toLocaleString()} ({dedPct}%)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 pt-2 text-center text-xs">
        <div className="p-2.5 rounded-xl bg-white/2 border border-white/5">
          <span className="block text-gray-400 text-[10px]">Base Pay</span>
          <span className="font-bold text-white">${baseSalary.toLocaleString()}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-white/2 border border-white/5">
          <span className="block text-gray-400 text-[10px]">Allowances</span>
          <span className="font-bold text-teal-300">+${allowances.toLocaleString()}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-white/2 border border-white/5">
          <span className="block text-gray-400 text-[10px]">Taxes / PF</span>
          <span className="font-bold text-rose-300">-${deductions.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};
