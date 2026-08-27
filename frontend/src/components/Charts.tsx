import React from 'react';

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

export const CostBarChart: React.FC<ChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
        No financial data to display charts.
      </div>
    );
  }

  // Set SVG view parameters
  const width = 500;
  const height = 240;
  const paddingLeft = 55;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxVal = Math.max(...data.map(d => d.totalNetSalary), 1000);
  const yMax = Math.ceil(maxVal / 5000) * 5000;

  const getBarHeight = (val: number) => {
    return yMax > 0 ? (val / yMax) * chartHeight : 0;
  };

  return (
    <div className="glass-card p-6 rounded-2xl border border-white/5 shadow-xl relative overflow-hidden flex flex-col h-full justify-between">
      <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4">Department Cost Centers ($)</h3>
      <div className="relative w-full flex justify-center">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-lg h-auto overflow-visible">
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
                  x={paddingLeft - 8}
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
            const barWidth = 32;
            const gap = (chartWidth - barWidth * data.length) / (data.length + 1);
            const x = paddingLeft + gap + idx * (barWidth + gap);
            const barHeight = getBarHeight(item.totalNetSalary);
            const y = paddingTop + chartHeight - barHeight;

            const colors = ['#8b5cf6', '#10b981', '#f59e0b', '#3b82f6'];
            const color = colors[idx % colors.length];

            return (
              <g key={item._id} className="group cursor-pointer">
                {/* Transparent Column for Hover Area */}
                <rect
                  x={x - gap / 4}
                  y={paddingTop}
                  width={barWidth + gap / 2}
                  height={chartHeight}
                  fill="transparent"
                  className="hover:fill-white/[0.02] transition duration-200"
                />

                {/* Main Color Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx="5"
                  fill={color}
                  opacity="0.8"
                  className="hover:opacity-100 transition duration-200"
                />

                {/* Tooltip visible on hover */}
                <g className="opacity-0 group-hover:opacity-100 transition duration-200 pointer-events-none">
                  <rect
                    x={x - 14}
                    y={y - 25}
                    width={barWidth + 28}
                    height={18}
                    rx="4"
                    fill="#0f0c1b"
                    stroke={color}
                    strokeWidth="1"
                  />
                  <text
                    x={x + barWidth / 2}
                    y={y - 13}
                    fill="#ffffff"
                    fontSize="8.5"
                    fontWeight="black"
                    textAnchor="middle"
                  >
                    ${Math.round(item.totalNetSalary).toLocaleString()}
                  </text>
                </g>

                {/* X Axis labels */}
                <text
                  x={x + barWidth / 2}
                  y={height - 18}
                  fill="#9ca3af"
                  fontSize="9.5"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {item.departmentName || item._id || 'Unassigned'}
                </text>
              </g>
            );
          })}

          {/* Axis Line */}
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

export const StaffDonutChart: React.FC<ChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
        No roster data to display charts.
      </div>
    );
  }

  // Segment layout calculations
  const size = 160;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const totalRuns = data.reduce((acc, curr) => acc + curr.payrollCount, 0);
  let accumulatedPercentage = 0;

  return (
    <div className="glass-card p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col sm:flex-row items-center justify-around gap-6 relative overflow-hidden h-full">
      <div className="space-y-1 text-center sm:text-left">
        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Department Staff Shares</h3>
        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Base Ledger Count</p>
        
        {/* Legends */}
        <div className="pt-4 space-y-2.5">
          {data.map((item, idx) => {
            const colors = ['#8b5cf6', '#10b981', '#f59e0b', '#3b82f6'];
            const color = colors[idx % colors.length];
            const pct = totalRuns > 0 ? Math.round((item.payrollCount / totalRuns) * 100) : 0;
            return (
              <div key={item._id} className="flex items-center gap-2.5 text-xs font-semibold">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-gray-300 truncate w-24 text-left">
                  {item.departmentName || item._id || 'Unassigned'}
                </span>
                <span className="text-white font-bold">{item.payrollCount} ({pct}%)</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.03)"
            strokeWidth={strokeWidth}
          />
          {data.map((item, idx) => {
            const colors = ['#8b5cf6', '#10b981', '#f59e0b', '#3b82f6'];
            const color = colors[idx % colors.length];
            
            const segmentPercentage = totalRuns > 0 ? item.payrollCount / totalRuns : 0;
            const strokeLength = segmentPercentage * circumference;
            const strokeOffset = circumference - (accumulatedPercentage * circumference);
            
            accumulatedPercentage += segmentPercentage;

            return (
              <circle
                key={item._id}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${strokeLength} ${circumference}`}
                strokeDashoffset={strokeOffset}
                strokeLinecap="round"
                className="transition-all duration-300 hover:scale-105 origin-center cursor-pointer opacity-90 hover:opacity-100"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-black text-white">{totalRuns}</span>
          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Run Total</span>
        </div>
      </div>
    </div>
  );
};
