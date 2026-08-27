import React from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Search } from 'lucide-react';

export interface Column<T> {
  header: string;
  accessor?: keyof T | string;
  sortable?: boolean;
  sortKey?: string;
  render?: (row: T) => React.ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  
  // Search & Filter triggers
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  
  // Pagination metadata
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;

  // Sorting metadata
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: string, order: 'asc' | 'desc') => void;
  
  actions?: React.ReactNode;
}

export function Table<T>({
  columns,
  data,
  loading = false,
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = 'Search records...',
  page,
  limit,
  totalItems,
  totalPages,
  onPageChange,
  onLimitChange,
  sortField = '',
  sortOrder = 'asc',
  onSort,
  actions
}: TableProps<T>) {
  
  const handleSortClick = (col: Column<T>) => {
    if (!col.sortable || !onSort) return;
    const key = col.sortKey || (col.accessor as string);
    if (!key) return;

    if (sortField === key) {
      onSort(key, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(key, 'asc');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Filter and Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        {onSearchChange && (
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-4 py-2 text-sm glass-input"
            />
          </div>
        )}
        <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-end">
          {actions}
        </div>
      </div>

      {/* Roster Table Screen */}
      <div className="relative w-full overflow-x-auto rounded-2xl glass-card border border-white/5 custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/2">
              {columns.map((col, index) => {
                const isSortedCol = sortField === (col.sortKey || col.accessor);
                return (
                  <th
                    key={index}
                    onClick={() => handleSortClick(col)}
                    className={`px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider ${
                      col.sortable ? 'cursor-pointer select-none hover:text-white transition' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {col.header}
                      {col.sortable && onSort && (
                        <span className="text-gray-500">
                          {isSortedCol ? (
                            sortOrder === 'asc' ? (
                              <ChevronUp className="w-3.5 h-3.5 text-brand-400" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-brand-400" />
                            )
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 opacity-30 hover:opacity-100" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-white/5">
            {loading ? (
              // Loading Skeleton State
              Array.from({ length: limit }).map((_, rIndex) => (
                <tr key={rIndex} className="animate-pulse">
                  {columns.map((_, cIndex) => (
                    <td key={cIndex} className="px-6 py-4">
                      <div className="h-4 bg-white/5 rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={columns.length} className="px-6 py-16 text-center text-gray-400 text-sm">
                  No records found matching your query filters.
                </td>
              </tr>
            ) : (
              // Data Rows rendering
              data.map((row, rIndex) => (
                <tr
                  key={rIndex}
                  className="bg-white/0 hover:bg-white/2 transition duration-150"
                >
                  {columns.map((col, cIndex) => {
                    const cellContent = col.render
                      ? col.render(row)
                      : (row as any)[col.accessor as any];

                    return (
                      <td key={cIndex} className="px-6 py-3.5 text-sm text-gray-200">
                        {cellContent ?? '-'}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!loading && data.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between px-2">
          <div className="flex items-center gap-2 text-xs text-gray-400 font-semibold">
            <span>Showing</span>
            <span className="text-white font-bold">{data.length}</span>
            <span>of</span>
            <span className="text-white font-bold">{totalItems}</span>
            <span>records</span>
          </div>

          <div className="flex items-center gap-4">
            {onLimitChange && (
              <div className="flex items-center gap-2 text-xs text-gray-400 font-semibold font-sans">
                <span>Show</span>
                <select
                  value={limit}
                  onChange={(e) => onLimitChange(Number(e.target.value))}
                  className="glass-input px-2.5 py-1.5 text-xs cursor-pointer"
                >
                  {[5, 10, 20, 50].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                <span>per page</span>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-gray-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-white/10 transition cursor-pointer select-none"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-xs font-bold text-gray-300 px-2 select-none">
                Page <span className="text-white">{page}</span> of <span className="text-white">{totalPages || 1}</span>
              </div>
              <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-gray-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-white/10 transition cursor-pointer select-none"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
