import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { 
  Inbox, 
  Send, 
  CheckCircle, 
  EyeOff, 
  Eye, 
  Clock, 
  AlertCircle,
  HelpCircle,
  Loader
} from 'lucide-react';

interface GrievanceType {
  _id: string;
  employee?: {
    firstName: string;
    lastName: string;
    employeeId: string;
    jobTitle: string;
  };
  isAnonymous: boolean;
  title: string;
  description: string;
  status: 'Pending' | 'Reviewing' | 'Resolved';
  response?: string;
  resolvedBy?: {
    email: string;
  };
  resolvedAt?: string;
  createdAt: string;
}

const Grievances: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'history' | 'submit'>('history');

  // Employee Submit States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  // HR Resolution Modal States
  const [selectedGrievanceId, setSelectedGrievanceId] = useState<string | null>(null);
  const [resolutionComment, setResolutionComment] = useState('');

  // Local alerts
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isAdminOrHR = user?.role === 'Admin' || user?.role === 'HR Manager';

  // 1. Fetch Grievances
  const { data: grievances, isLoading } = useQuery({
    queryKey: ['grievances'],
    queryFn: async () => {
      const res = await api.get('/grievances');
      return res.data?.data as GrievanceType[];
    }
  });

  // 2. Submit Grievance Mutation
  const submitGrievanceMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/grievances', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grievances'] });
      setSuccessMsg('Grievance report filed successfully! Security hash logged.');
      setTitle('');
      setDescription('');
      setIsAnonymous(false);
      setActiveTab('history');
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Failed to submit grievance.');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  });

  // 3. Resolve Grievance Mutation
  const resolveGrievanceMutation = useMutation({
    mutationFn: async ({ id, response }: { id: string; response: string }) => {
      const res = await api.put(`/grievances/${id}/resolve`, { response });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grievances'] });
      setSuccessMsg('Grievance resolved successfully!');
      setSelectedGrievanceId(null);
      setResolutionComment('');
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Failed to post grievance resolution.');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitGrievanceMutation.mutate({
      title,
      description,
      isAnonymous
    });
  };

  const handleResolve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGrievanceId) return;
    resolveGrievanceMutation.mutate({
      id: selectedGrievanceId,
      response: resolutionComment
    });
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
            <Inbox className="w-7 h-7 text-brand-400" /> Secure Grievance Box
          </h1>
          <p className="text-gray-400 text-xs mt-1">
            Anonymous and named channels for resolving work environments, conflicts, and professional grievances.
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
      <div className="flex border-b border-white/10 select-none">
        <button
          onClick={() => setActiveTab('history')}
          className={`px-6 py-3 font-bold text-xs uppercase tracking-wider transition ${
            activeTab === 'history'
              ? 'border-b-2 border-brand-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          {isAdminOrHR ? 'Inbox Queue' : 'My Submissions'}
        </button>
        {!isAdminOrHR && (
          <button
            onClick={() => setActiveTab('submit')}
            className={`px-6 py-3 font-bold text-xs uppercase tracking-wider transition ${
              activeTab === 'submit'
                ? 'border-b-2 border-brand-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            File Grievance Notice
          </button>
        )}
      </div>

      {/* History Grid */}
      {activeTab === 'history' && (
        <div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/20">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/2">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Title / Scope</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Filer Identity</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Date Filed</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Resolution Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500 font-semibold">
                    Loading inbox data...
                  </td>
                </tr>
              ) : grievances?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500 font-semibold">
                    No complaints registered in grievance buffer.
                  </td>
                </tr>
              ) : (
                grievances?.map((gri) => (
                  <tr key={gri._id} className="hover:bg-white/2 transition">
                    <td className="px-6 py-4 max-w-xs">
                      <div className="font-bold text-white text-sm truncate">{gri.title}</div>
                      <div className="text-xs text-gray-400 mt-1 truncate" title={gri.description}>
                        {gri.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {gri.isAnonymous ? (
                        <div className="flex items-center gap-1.5 text-xs text-purple-400 font-bold">
                          <EyeOff className="w-3.5 h-3.5" /> Anonymous Submission
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-gray-300 font-bold">
                          <Eye className="w-3.5 h-3.5 text-brand-400" />
                          {gri.employee 
                            ? `${gri.employee.firstName} ${gri.employee.lastName} (${gri.employee.employeeId})`
                            : 'Linked Account'}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400 whitespace-nowrap">
                      {formatDate(gri.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                        gri.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        gri.status === 'Reviewing' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {gri.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {gri.status === 'Resolved' ? (
                        <div className="text-xs max-w-xs text-gray-300 italic border-l-2 border-emerald-500/40 pl-3">
                          "{gri.response}"
                          <span className="block text-[10px] text-gray-500 not-italic mt-1">
                            Resolved by: {gri.resolvedBy?.email}
                          </span>
                        </div>
                      ) : isAdminOrHR ? (
                        <button
                          onClick={() => setSelectedGrievanceId(gri._id)}
                          className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                        >
                          Resolve Complaint
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 text-[11px] text-gray-400 font-semibold">
                          <Clock className="w-3.5 h-3.5 text-amber-500 animate-spin" /> Pending Board Review
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Employee Submit Tab */}
      {activeTab === 'submit' && !isAdminOrHR && (
        <div className="glass-card p-6 md:p-8 rounded-2xl border border-white/5 max-w-xl space-y-4">
          <div className="flex items-center gap-2.5 text-brand-400 font-black">
            <Inbox className="w-6 h-6" />
            <h3 className="text-md uppercase tracking-wider">File Formal Complaint notice</h3>
          </div>
          <p className="text-gray-400 text-xs leading-relaxed">
            Report workplace concerns, environment discrepancies, or conflicts safely. If anonymous is toggled, your name and credentials will be permanently scrubbed from Board files.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
              <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">Notice Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Workspace AC Overheating / Compliance Concern"
                className="form-input"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">Complaint Details</label>
              <textarea
                required
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide objective facts, locations, and timelines..."
                className="form-input resize-none"
              />
            </div>

            <div className="flex items-center gap-2 select-none py-1">
              <input
                type="checkbox"
                id="isAnonymous"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="rounded border-white/15 bg-white/5 text-brand-500 focus:ring-0 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="isAnonymous" className="text-xs text-gray-300 font-semibold cursor-pointer flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-purple-400" /> Submit anonymously (Scrub my operator identity)
              </label>
            </div>

            <button
              type="submit"
              disabled={submitGrievanceMutation.isPending}
              className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-brand-500/10"
            >
              {submitGrievanceMutation.isPending ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" /> Dispatch Ticket
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Resolution Modal (Admin/HR only) */}
      {selectedGrievanceId && isAdminOrHR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedGrievanceId(null)} />
          
          <div className="relative glass-card max-w-md w-full rounded-2xl p-6 md:p-8 border border-white/10 shadow-2xl z-10">
            <h3 className="text-md font-bold text-white uppercase tracking-wider mb-2">Resolve Workplace Grievance</h3>
            <p className="text-gray-400 text-xs mb-6">Write resolution comments to submit back to the filer.</p>

            <form onSubmit={handleResolve} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">Board Resolution Message</label>
                <textarea
                  required
                  rows={4}
                  value={resolutionComment}
                  onChange={(e) => setResolutionComment(e.target.value)}
                  placeholder="e.g. Facilities dispatched to resolve AC units; mediation scheduled..."
                  className="form-input resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setSelectedGrievanceId(null)}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl text-xs transition cursor-pointer select-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolveGrievanceMutation.isPending}
                  className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-brand-500/10"
                >
                  {resolveGrievanceMutation.isPending ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" /> Post Resolution
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Grievances;
