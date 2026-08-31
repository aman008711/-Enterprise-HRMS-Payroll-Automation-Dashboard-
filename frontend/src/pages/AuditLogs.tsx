import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { 
  ShieldAlert, 
  Search, 
  Terminal, 
  ChevronLeft, 
  ChevronRight,
  Database,
  Globe,
  Monitor
} from 'lucide-react';

interface AuditLogType {
  _id: string;
  user?: {
    email: string;
  };
  action: string;
  targetModel?: string;
  targetId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

interface AuditResponse {
  success: boolean;
  count: number;
  total: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
  data: AuditLogType[];
}

const AuditLogs: React.FC = () => {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [filterAction, setFilterAction] = useState('');

  // 1. Fetch Audit Logs with parameters
  const { data, isLoading, error } = useQuery<AuditResponse>({
    queryKey: ['audit-logs', page, filterAction],
    queryFn: async () => {
      const res = await api.get('/audit-logs', {
        params: {
          page,
          limit: 15,
          action: filterAction
        }
      });
      return res.data;
    },
    enabled: user?.role === 'Admin'
  });

  // Guard: If not admin
  if (user?.role !== 'Admin') {
    return (
      <div className="glass-card p-8 rounded-2xl border border-red-500/20 text-center max-w-xl mx-auto space-y-4 my-12 animate-fade-in">
        <ShieldAlert className="w-16 h-16 text-red-500 mx-auto animate-pulse" />
        <h2 className="text-xl font-black text-white uppercase tracking-wider">Access Denied</h2>
        <p className="text-gray-400 text-sm">
          Operational audit trails contain sensitive employee data and security credentials. Your role ({user?.role}) does not have permission to view this console.
        </p>
      </div>
    );
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-wider flex items-center gap-2">
            <Terminal className="w-7 h-7 text-purple-400" /> Operational Audit Trail
          </h1>
          <p className="text-gray-400 text-xs mt-1">
            Real-time logs of system operations, credential updates, security events, and financial activities.
          </p>
        </div>

        {/* Filter Input */}
        <div className="relative max-w-xs w-full">
          <input
            type="text"
            value={filterAction}
            onChange={(e) => {
              setFilterAction(e.target.value);
              setPage(1);
            }}
            placeholder="Search action keyword..."
            className="form-input pl-10"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        </div>
      </div>

      {isLoading ? (
        <div className="glass-card p-12 rounded-2xl text-center border border-white/5">
          <Database className="w-10 h-10 text-gray-500 mx-auto animate-bounce mb-3" />
          <p className="text-gray-400 text-sm font-semibold">Streaming operational logs from secure buffer...</p>
        </div>
      ) : error ? (
        <div className="glass-card p-6 rounded-2xl border border-red-500/20 text-red-400 text-sm">
          Failed to fetch audit log streams.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/20">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/2">
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Operator</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Details</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Network Identity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data?.data.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500 font-semibold">
                      No matching log items.
                    </td>
                  </tr>
                ) : (
                  data?.data.map((log) => (
                    <tr key={log._id} className="hover:bg-white/2 transition">
                      <td className="px-6 py-4 text-xs text-gray-400 font-bold whitespace-nowrap">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-sm text-white font-bold whitespace-nowrap">
                        {log.user?.email || 'System Daemon'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                          log.action.includes('LOGIN') ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          log.action.includes('TERMINATE') || log.action.includes('DELETE') ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          log.action.includes('PAYROLL') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          'bg-purple-500/10 text-purple-400 border-purple-500/20'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {log.details || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400 space-y-1">
                        <div className="flex items-center gap-1 font-bold">
                          <Globe className="w-3 h-3 text-purple-400" /> {log.ipAddress || '127.0.0.1'}
                        </div>
                        <div className="flex items-center gap-1 truncate max-w-[200px]">
                          <Monitor className="w-3 h-3 text-gray-500" /> {log.userAgent || 'Unknown Agent'}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 select-none">
              <span className="text-xs text-gray-400 font-semibold">
                Page {page} of {data.pagination.totalPages} (Total: {data.total} entries)
              </span>

              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  className="p-2 bg-white/5 border border-white/5 text-gray-400 hover:text-white disabled:opacity-40 disabled:pointer-events-none rounded-xl transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={page === data.pagination.totalPages}
                  onClick={() => setPage((p) => Math.min(p + 1, data.pagination.totalPages))}
                  className="p-2 bg-white/5 border border-white/5 text-gray-400 hover:text-white disabled:opacity-40 disabled:pointer-events-none rounded-xl transition cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
