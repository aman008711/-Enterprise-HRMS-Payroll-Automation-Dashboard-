import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { 
  LogOut, 
  Send, 
  CheckCircle, 
  AlertCircle,
  FileText,
  UserX,
  Loader,
  Users
} from 'lucide-react';

interface ResignationType {
  _id: string;
  employee: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    jobTitle: string;
    status: string;
    department?: {
      name: string;
    };
  };
  proposedLastWorkingDay: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  feedback?: string;
  processedBy?: {
    email: string;
  };
  createdAt: string;
}

interface EmployeeSelect {
  _id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  jobTitle: string;
  status: string;
}

const Offboarding: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'resignations' | 'terminate'>('resignations');

  // Employee Form States
  const [proposedLastWorkingDay, setProposedLastWorkingDay] = useState('');
  const [reason, setReason] = useState('');

  // Manager Direct Termination States
  const [terminateEmployeeId, setTerminateEmployeeId] = useState('');
  const [terminationFeedback, setTerminationFeedback] = useState('');

  // HR Review Modal / Feedback State
  const [selectedResId, setSelectedResId] = useState<string | null>(null);
  const [managerFeedback, setManagerFeedback] = useState('');

  // Local Alerts
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isAdminOrHR = user?.role === 'Admin' || user?.role === 'HR Manager';

  // 1. Fetch resignations
  const { data: resignations, isLoading } = useQuery({
    queryKey: ['resignations'],
    queryFn: async () => {
      const res = await api.get('/resignations');
      return res.data?.data as ResignationType[];
    }
  });

  // 2. Fetch Active Employees to populate dropdown termination options (Admin/HR only)
  const { data: employees } = useQuery({
    queryKey: ['active-employees-list'],
    queryFn: async () => {
      const res = await api.get('/employees');
      return (res.data?.data as EmployeeSelect[]).filter(emp => emp.status !== 'Terminated');
    },
    enabled: isAdminOrHR
  });

  // 3. Submit Resignation Request Mutation
  const createResignationMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/resignations', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resignations'] });
      setSuccessMsg('Resignation request filed successfully! HR notification dispatched.');
      setProposedLastWorkingDay('');
      setReason('');
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Failed to submit resignation request.');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  });

  // 4. Process Resignation Status Mutation
  const processResignationMutation = useMutation({
    mutationFn: async ({ id, status, feedback }: { id: string; status: 'Approved' | 'Rejected'; feedback: string }) => {
      const res = await api.put(`/resignations/${id}/status`, { status, feedback });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resignations'] });
      queryClient.invalidateQueries({ queryKey: ['active-employees-list'] });
      setSuccessMsg('Resignation status updated and logged.');
      setSelectedResId(null);
      setManagerFeedback('');
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Failed to update resignation status.');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  });

  // 5. Direct Termination Mutation
  const terminateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/resignations/terminate', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resignations'] });
      queryClient.invalidateQueries({ queryKey: ['active-employees-list'] });
      setSuccessMsg('Direct employee termination executed successfully.');
      setTerminateEmployeeId('');
      setTerminationFeedback('');
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Failed to terminate employee.');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  });

  const handleResignationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (new Date(proposedLastWorkingDay) <= new Date()) {
      setErrorMsg('Proposed last working date must be in the future');
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }
    createResignationMutation.mutate({
      proposedLastWorkingDay,
      reason
    });
  };

  const handleDirectTerminate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminateEmployeeId) {
      setErrorMsg('Please select employee to terminate');
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }
    if (confirm('CRITICAL ACTION: Are you sure you want to terminate this employee? This will immediately revoke their dashboard access.')) {
      terminateMutation.mutate({
        employeeId: terminateEmployeeId,
        feedback: terminationFeedback
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-wider flex items-center gap-2">
            <LogOut className="w-7 h-7 text-red-500" /> Staff Offboarding Portal
          </h1>
          <p className="text-gray-400 text-xs mt-1">
            Resignation request submissions, processing, and direct administrative termination logs.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm animate-fade-in flex items-center gap-2">
          <CheckCircle className="w-5 h-5" /> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm animate-fade-in flex items-center gap-2">
          <AlertCircle className="w-5 h-5" /> {errorMsg}
        </div>
      )}

      {/* Tabs */}
      {isAdminOrHR && (
        <div className="flex border-b border-white/10 select-none">
          <button
            onClick={() => setActiveTab('resignations')}
            className={`px-6 py-3 font-bold text-xs uppercase tracking-wider transition ${
              activeTab === 'resignations'
                ? 'border-b-2 border-brand-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Resignation Requests
          </button>
          <button
            onClick={() => setActiveTab('terminate')}
            className={`px-6 py-3 font-bold text-xs uppercase tracking-wider transition ${
              activeTab === 'terminate'
                ? 'border-b-2 border-red-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Direct Termination Wizard
          </button>
        </div>
      )}

      {/* HR/Admin resignations list tab */}
      {isAdminOrHR && activeTab === 'resignations' && (
        <div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/20">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/2">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Requested Last Day</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Reason Details</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500 font-semibold">
                    Loading requests...
                  </td>
                </tr>
              ) : resignations?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500 font-semibold">
                    No resignation requests currently logged.
                  </td>
                </tr>
              ) : (
                resignations?.map((res) => (
                  <tr key={res._id} className="hover:bg-white/2 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white text-sm">
                        {res.employee?.firstName} {res.employee?.lastName}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{res.employee?.jobTitle} (ID: {res.employee?.employeeId})</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300 font-bold whitespace-nowrap">
                      {formatDate(res.proposedLastWorkingDay)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400 max-w-xs truncate" title={res.reason}>
                      {res.reason}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                        res.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        res.status === 'Rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {res.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {res.status === 'Pending' ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedResId(res._id)}
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                          >
                            Review & Process
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">Processed by: {res.processedBy?.email || 'N/A'}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* HR/Admin direct termination wizard tab */}
      {isAdminOrHR && activeTab === 'terminate' && (
        <div className="glass-card p-6 md:p-8 rounded-2xl border border-white/5 max-w-xl">
          <div className="flex items-center gap-3 text-red-400 font-black mb-4">
            <UserX className="w-6 h-6 animate-pulse" />
            <h3 className="text-md uppercase tracking-wider">Direct Separation Overrides</h3>
          </div>
          <p className="text-gray-400 text-xs mb-6 leading-relaxed">
            Directly terminates an employee profile. This terminates payroll allocations, halts geofencing permissions, and updates active directory state to <strong className="text-red-400">Terminated</strong>.
          </p>

          <form onSubmit={handleDirectTerminate} className="space-y-4">
            <div>
              <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">Target Employee</label>
              <select
                required
                value={terminateEmployeeId}
                onChange={(e) => setTerminateEmployeeId(e.target.value)}
                className="form-input cursor-pointer"
              >
                <option value="">Select staff member...</option>
                {employees?.map((emp) => (
                  <option key={emp._id} value={emp._id} className="bg-slate-900 text-white">
                    {emp.firstName} {emp.lastName} ({emp.employeeId} - {emp.jobTitle})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">Administrative Comments & Reason</label>
              <textarea
                required
                rows={4}
                value={terminationFeedback}
                onChange={(e) => setTerminationFeedback(e.target.value)}
                placeholder="Declare termination reason, severance parameters, and handover checklists..."
                className="form-input resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={terminateMutation.isPending}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition duration-200 flex items-center gap-1.5 cursor-pointer shadow-lg shadow-red-500/10"
            >
              {terminateMutation.isPending ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <UserX className="w-4 h-4" /> Execute Termination
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Employee self resignation submission section */}
      {!isAdminOrHR && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* File Form */}
          <div className="glass-card p-6 md:p-8 rounded-2xl border border-white/5 space-y-4">
            <h3 className="text-md font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-400" /> Submit Resignation Letter
            </h3>
            <p className="text-gray-400 text-xs">
              Formally request separation from the company. Provide a valid proposed date and resignation notice.
            </p>

            <form onSubmit={handleResignationSubmit} className="space-y-4 pt-2">
              <div>
                <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">Proposed Last Working Day</label>
                <input
                  type="date"
                  required
                  value={proposedLastWorkingDay}
                  onChange={(e) => setProposedLastWorkingDay(e.target.value)}
                  className="form-input cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">Statement / Reason</label>
                <textarea
                  required
                  rows={5}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Outline resignation context, transition plan, and reason..."
                  className="form-input resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={createResignationMutation.isPending}
                className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-brand-500/10"
              >
                {createResignationMutation.isPending ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Submit Notice
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Status Monitoring Card */}
          <div className="glass-card p-6 md:p-8 rounded-2xl border border-white/5 space-y-6">
            <h3 className="text-md font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" /> Notice Status & Details
            </h3>

            {isLoading ? (
              <div className="text-gray-500 text-xs font-bold">Verifying logs...</div>
            ) : resignations?.length === 0 ? (
              <div className="text-gray-500 text-xs py-8 text-center border border-dashed border-white/10 rounded-xl">
                No resignation notice currently submitted. You are an active employee in good standing.
              </div>
            ) : (
              (() => {
                const currentNotice = resignations?.[0];
                if (!currentNotice) return null;
                return (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-white/2 p-4 rounded-xl border border-white/5">
                      <div>
                        <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider">Current Status</span>
                        <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          currentNotice.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          currentNotice.status === 'Rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {currentNotice.status}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider">Proposed Last Day</span>
                        <span className="block text-sm font-black text-white mt-1">
                          {formatDate(currentNotice.proposedLastWorkingDay)}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white/2 p-4 rounded-xl border border-white/5 space-y-2">
                      <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider">Notice Reason Statement</span>
                      <p className="text-gray-300 text-xs whitespace-pre-wrap leading-relaxed">
                        {currentNotice.reason}
                      </p>
                    </div>

                    {currentNotice.feedback && (
                      <div className="bg-purple-950/10 p-4 rounded-xl border border-purple-500/25 space-y-2">
                        <span className="block text-[10px] text-purple-400 font-bold uppercase tracking-wider">HR Board Resolution & Comments</span>
                        <p className="text-purple-300 text-xs italic">
                          "{currentNotice.feedback}"
                        </p>
                        <span className="block text-[9px] text-gray-400">Processed by: {currentNotice.processedBy?.email || 'HR Board'}</span>
                      </div>
                    )}
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}

      {/* Review Modal (Admin/HR only) */}
      {selectedResId && isAdminOrHR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedResId(null)} />
          
          <div className="relative glass-card max-w-md w-full rounded-2xl p-6 border border-white/10 shadow-2xl z-10">
            <h3 className="text-md font-bold text-white uppercase tracking-wider mb-2">Review Resignation Submission</h3>
            <p className="text-gray-400 text-xs mb-6">Review proposed last day and issue feedback comments.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">Resolution Comments / Feedback</label>
                <textarea
                  rows={3}
                  value={managerFeedback}
                  onChange={(e) => setManagerFeedback(e.target.value)}
                  placeholder="e.g. Exit interview scheduled; handover checklist pending..."
                  className="form-input resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    processResignationMutation.mutate({
                      id: selectedResId,
                      status: 'Rejected',
                      feedback: managerFeedback
                    });
                  }}
                  disabled={processResignationMutation.isPending}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Reject & Retain
                </button>
                <button
                  type="button"
                  onClick={() => {
                    processResignationMutation.mutate({
                      id: selectedResId,
                      status: 'Approved',
                      feedback: managerFeedback
                    });
                  }}
                  disabled={processResignationMutation.isPending}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Approve Resignation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Offboarding;
