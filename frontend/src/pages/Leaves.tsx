import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { 
  Calendar, 
  Send, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  FileText,
  Loader
} from 'lucide-react';

interface LeaveRequestType {
  _id: string;
  type: 'Sick' | 'Vacation' | 'Personal' | 'Maternity' | 'Paternity';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  durationDays: number;
  employeeDetails?: {
    firstName: string;
    lastName: string;
    employeeId: string;
    jobTitle: string;
  };
  departmentDetails?: {
    name: string;
    code: string;
  };
  approverDetails?: {
    firstName: string;
    lastName: string;
  };
}

const Leaves: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdminOrHR = user?.role === 'Admin' || user?.role === 'HR Manager';
  const [activeTab, setActiveTab] = useState<'history' | 'apply' | 'queue'>(isAdminOrHR ? 'queue' : 'history');

  // Leave Form States
  const [type, setType] = useState<'Sick' | 'Vacation' | 'Personal' | 'Maternity' | 'Paternity'>('Vacation');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  // Local Alerts state
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch leaves list from backend
  const { data: leaves, isLoading } = useQuery({
    queryKey: ['leaves'],
    queryFn: async () => {
      const res = await api.get('/leaves');
      return res.data?.data as LeaveRequestType[];
    }
  });

  // Submit Leave Request Mutation
  const createLeaveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/leaves', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      setSuccessMsg('Leave request submitted successfully! Manager notification email & chat webhook alert dispatched.');
      setType('Vacation');
      setStartDate('');
      setEndDate('');
      setReason('');
      setActiveTab('history');
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Failed to submit leave request. Check dates.');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  });

  // Update Leave Status Mutation (Approve / Reject)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'Approved' | 'Rejected' }) => {
      const res = await api.put(`/leaves/${id}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      setSuccessMsg('Leave request updated successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Failed to update leave status.');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  });

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (new Date(endDate) < new Date(startDate)) {
      setErrorMsg('End date cannot be earlier than start date');
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }
    createLeaveMutation.mutate({
      type,
      startDate,
      endDate,
      reason
    });
  };

  const handleStatusUpdate = (id: string, status: 'Approved' | 'Rejected') => {
    updateStatusMutation.mutate({ id, status });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'Pending': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      'Approved': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      'Rejected': 'bg-red-500/15 text-red-400 border-red-500/30'
    };
    const styleClass = styles[status] || 'bg-gray-500/15 text-gray-400 border-gray-500/30';
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${styleClass} inline-flex items-center gap-1.5`}>
        {status === 'Pending' && <Clock className="w-3.5 h-3.5" />}
        {status === 'Approved' && <CheckCircle className="w-3.5 h-3.5" />}
        {status === 'Rejected' && <XCircle className="w-3.5 h-3.5" />}
        {status}
      </span>
    );
  };

  const getLeaveTypeBadge = (leaveType: string) => {
    const types: Record<string, string> = {
      'Sick': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      'Vacation': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      'Personal': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      'Maternity': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
      'Paternity': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
    };
    const styleClass = types[leaveType] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    return (
      <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold border ${styleClass}`}>
        {leaveType}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Filter leaves that are pending approval (Manager Queue view)
  const pendingLeaves = leaves?.filter(l => l.status === 'Pending') || [];

  return (
    <div className="space-y-6">
      {/* Alert Banners */}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm transition-all duration-300">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <p className="font-medium">{successMsg}</p>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm transition-all duration-300">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="font-medium">{errorMsg}</p>
        </div>
      )}

      {/* Navigation Tabs Header */}
      <div className="flex border-b border-white/10 gap-2 select-none">
        {isAdminOrHR && (
          <button
            onClick={() => setActiveTab('queue')}
            className={`relative px-5 py-3 text-sm font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'queue' 
                ? 'border-brand-500 text-white' 
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Manager Review Queue
            {pendingLeaves.length > 0 && (
              <span className="absolute right-0 top-1 w-5 h-5 bg-brand-600 border border-brand-500/30 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse">
                {pendingLeaves.length}
              </span>
            )}
          </button>
        )}

        <button
          onClick={() => setActiveTab('history')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'history' 
              ? 'border-brand-500 text-white' 
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          {isAdminOrHR ? 'All Leave Records' : 'My Leave History'}
        </button>

        {!isAdminOrHR && (
          <button
            onClick={() => setActiveTab('apply')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'apply' 
                ? 'border-brand-500 text-white' 
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Apply for Leave
          </button>
        )}
      </div>

      {/* Tab content 1: History view */}
      {activeTab === 'history' && (
        <div className="glass-card rounded-2xl p-6 border border-white/5 shadow-xl">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/2">
                  {isAdminOrHR && <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Employee</th>}
                  <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Leave Category</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Start Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">End Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Approver</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      {isAdminOrHR && <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-24" /></td>}
                      <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-20" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-20" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-12" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-32" /></td>
                      <td className="px-6 py-4"><div className="h-6 bg-white/5 rounded w-16" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-20" /></td>
                    </tr>
                  ))
                ) : !leaves || leaves.length === 0 ? (
                  <tr>
                    <td colSpan={isAdminOrHR ? 8 : 7} className="px-6 py-16 text-center text-gray-400 text-sm">
                      No leave requests filed yet.
                    </td>
                  </tr>
                ) : (
                  leaves.map((leave) => (
                    <tr key={leave._id} className="bg-white/0 hover:bg-white/2 transition">
                      {isAdminOrHR && (
                        <td className="px-6 py-4 text-sm font-semibold text-white">
                          <span className="block">{leave.employeeDetails?.firstName} {leave.employeeDetails?.lastName}</span>
                          <span className="block text-[10px] text-gray-400 font-medium tracking-wider">{leave.employeeDetails?.employeeId}</span>
                        </td>
                      )}
                      <td className="px-6 py-4">{getLeaveTypeBadge(leave.type)}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">{formatDate(leave.startDate)}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">{formatDate(leave.endDate)}</td>
                      <td className="px-6 py-4 text-sm text-gray-300 font-bold">
                        {leave.durationDays} {leave.durationDays === 1 ? 'day' : 'days'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400 max-w-xs truncate" title={leave.reason}>
                        {leave.reason}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(leave.status)}</td>
                      <td className="px-6 py-4 text-sm text-gray-400 font-semibold">
                        {leave.approverDetails ? `${leave.approverDetails.firstName}` : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab content 2: Application view */}
      {activeTab === 'apply' && (
        <div className="glass-card rounded-2xl p-8 border border-white/5 shadow-2xl max-w-xl mx-auto">
          <form onSubmit={handleApplySubmit} className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Leave Application</h3>
              <p className="text-gray-400 text-xs font-medium">Request time-off categories directly below.</p>
            </div>

            <div>
              <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">
                Leave Category
              </label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={type}
                  onChange={(e: any) => setType(e.target.value)}
                  className="w-full glass-input pl-11 pr-4 py-3 cursor-pointer"
                >
                  <option value="Vacation">Vacation Time</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Personal">Personal Leave</option>
                  <option value="Maternity">Maternity</option>
                  <option value="Paternity">Paternity</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 glass-input text-sm cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 glass-input text-sm cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">
                Application Statement / Reason
              </label>
              <div className="relative">
                <FileText className="absolute left-3.5 top-3 w-5 h-5 text-gray-400" />
                <textarea
                  required
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide details about your leave request context..."
                  className="w-full pl-11 pr-4 py-3 glass-input text-sm resize-none custom-scrollbar"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={createLeaveMutation.isPending}
              className="w-full py-3.5 px-4 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-brand-500/25 select-none disabled:opacity-50"
            >
              {createLeaveMutation.isPending ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Submitting Request...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  File Leave Application
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Tab content 3: Review Queue (Admin/HR only) */}
      {activeTab === 'queue' && isAdminOrHR && (
        <div className="glass-card rounded-2xl p-6 border border-white/5 shadow-xl">
          <div className="space-y-4">
            {pendingLeaves.length === 0 ? (
              <div className="py-16 text-center text-gray-400 text-sm">
                All leave requests processed! The queue is clean.
              </div>
            ) : (
              pendingLeaves.map((leave) => (
                <div 
                  key={leave._id}
                  className="p-5 rounded-2xl border border-white/5 bg-white/1 flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h4 className="text-base font-bold text-white">
                        {leave.employeeDetails?.firstName} {leave.employeeDetails?.lastName}
                      </h4>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 border border-white/5">
                        {leave.employeeDetails?.employeeId}
                      </span>
                      {getLeaveTypeBadge(leave.type)}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 font-medium">
                      <span>Department: <strong className="text-gray-300">{leave.departmentDetails?.name}</strong></span>
                      <span>Job: <strong className="text-gray-300">{leave.employeeDetails?.jobTitle}</strong></span>
                      <span>Period: <strong className="text-brand-400">{formatDate(leave.startDate)} to {formatDate(leave.endDate)}</strong></span>
                      <span>Duration: <strong className="text-white font-bold">{leave.durationDays} days</strong></span>
                    </div>

                    <p className="text-sm text-gray-300 italic pt-1 max-w-xl">
                      &ldquo;{leave.reason}&rdquo;
                    </p>
                  </div>

                  {/* Approve / Reject Controls */}
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => handleStatusUpdate(leave._id, 'Rejected')}
                      disabled={updateStatusMutation.isPending}
                      className="px-4 py-2.5 rounded-xl border border-red-500/20 hover:border-red-500 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-white text-sm font-semibold transition cursor-pointer select-none disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(leave._id, 'Approved')}
                      disabled={updateStatusMutation.isPending}
                      className="px-4 py-2.5 rounded-xl border border-emerald-500/20 hover:border-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-white text-sm font-semibold transition cursor-pointer select-none disabled:opacity-50"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaves;
