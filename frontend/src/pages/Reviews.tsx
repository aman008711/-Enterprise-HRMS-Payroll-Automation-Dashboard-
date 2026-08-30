import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { 
  Award, 
  Plus, 
  Save, 
  Send, 
  Star, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle, 
  Loader,
  Calendar,
  FileText,
  Bookmark,
  Check
} from 'lucide-react';

interface EmployeeType {
  _id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  jobTitle: string;
  baseSalary: number;
}

interface ReviewType {
  _id: string;
  employee: EmployeeType;
  quarter: string;
  selfGoals: string;
  selfComments?: string;
  managerComments?: string;
  rating?: number;
  status: 'Draft' | 'Self-Submitted' | 'Manager-Reviewed' | 'Approved';
  raisePercentage: number;
  raiseApplied: boolean;
  reviewedBy?: { email: string };
  createdAt: string;
}

const Reviews: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdminOrHR = user?.role === 'Admin' || user?.role === 'HR Manager';
  const isEmployee = user?.role === 'Employee';

  // Navigation Tabs: 'my-reviews' for employees, 'to-review' and 'approvals' for managers/admins
  const [activeTab, setActiveTab] = useState<'my-reviews' | 'to-review' | 'approvals'>(
    isEmployee ? 'my-reviews' : 'to-review'
  );

  // Modal Dialog states
  const [isSelfModalOpen, setIsSelfModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [activeReview, setActiveReview] = useState<ReviewType | null>(null);

  // Form field states for Self Appraisal
  const [quarter, setQuarter] = useState('Q1 2026');
  const [selfGoals, setSelfGoals] = useState('');
  const [selfComments, setSelfComments] = useState('');

  // Form field states for Manager Feedback
  const [managerComments, setManagerComments] = useState('');
  const [rating, setRating] = useState(5);
  const [raisePercentage, setRaisePercentage] = useState(0);

  // Feedback notifications
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. Fetch Performance Reviews
  const { data: reviews, isLoading: loadingReviews } = useQuery({
    queryKey: ['performance-reviews'],
    queryFn: async () => {
      const res = await api.get('/reviews');
      return res.data?.data as ReviewType[];
    }
  });

  // Mutation: Create Self Appraisal
  const createReviewMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/reviews', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
      setSuccessMsg('Self-appraisal draft initialized!');
      setIsSelfModalOpen(false);
      resetSelfForm();
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Failed to initiate appraisal record');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  });

  // Mutation: Submit Employee self appraisal (from Draft -> Self-Submitted)
  const submitSelfAppraisalMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await api.put(`/reviews/${id}`, { ...payload, submitDirectly: true });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
      setSuccessMsg('Your appraisal has been submitted to your manager!');
      setIsSelfModalOpen(false);
      resetSelfForm();
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Failed to submit appraisal');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  });

  // Mutation: Submit Manager Feedback (Self-Submitted -> Manager-Reviewed)
  const submitManagerFeedbackMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await api.put(`/reviews/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
      setSuccessMsg('Feedback submitted successfully!');
      setIsFeedbackModalOpen(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Failed to submit manager reviews');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  });

  // Mutation: Final Admin/HR Approval (Manager-Reviewed -> Approved) & Trigger Salary Raise
  const approveAppraisalMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/reviews/${id}/approve`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
      setSuccessMsg(data.message || 'Appraisal approved and salary raise executed!');
      setTimeout(() => setSuccessMsg(null), 6000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Failed to execute approval');
      setTimeout(() => setErrorMsg(null), 6000);
    }
  });

  const resetSelfForm = () => {
    setQuarter('Q1 2026');
    setSelfGoals('');
    setSelfComments('');
    setActiveReview(null);
  };

  const handleSelfFormSubmit = (e: React.FormEvent, submitDirectly: boolean) => {
    e.preventDefault();
    const payload = { quarter, selfGoals, selfComments };

    if (activeReview) {
      // If editing existing draft
      submitSelfAppraisalMutation.mutate({ id: activeReview._id, payload });
    } else {
      // Creating new entry
      createReviewMutation.mutate({ ...payload, submitDirectly });
    }
  };

  const handleEditDraftClick = (review: ReviewType) => {
    setActiveReview(review);
    setQuarter(review.quarter);
    setSelfGoals(review.selfGoals);
    setSelfComments(review.selfComments || '');
    setIsSelfModalOpen(true);
  };

  const handleOpenFeedbackModal = (review: ReviewType) => {
    setActiveReview(review);
    setManagerComments(review.managerComments || '');
    setRating(review.rating || 5);
    setRaisePercentage(review.raisePercentage || 0);
    setIsFeedbackModalOpen(true);
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReview) return;

    submitManagerFeedbackMutation.mutate({
      id: activeReview._id,
      payload: {
        managerComments,
        rating,
        raisePercentage: Number(raisePercentage)
      }
    });
  };

  // Filter helpers
  const myReviews = reviews || [];
  const managerPending = reviews?.filter(r => r.status === 'Self-Submitted' || r.status === 'Draft') || [];
  const approvalsPending = reviews?.filter(r => r.status === 'Manager-Reviewed') || [];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between select-none">
        <div className="flex items-center gap-3">
          <Award className="w-7 h-7 text-brand-400" />
          <h1 className="text-2xl font-black text-white tracking-tight">Performance Reviews & Appraisals</h1>
        </div>

        {/* Employee Create Self-Appraisal Trigger */}
        {isEmployee && (
          <button
            onClick={() => {
              resetSelfForm();
              setIsSelfModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition duration-200 text-sm cursor-pointer shadow-lg hover:shadow-brand-500/25 select-none"
          >
            <Plus className="w-4 h-4" />
            File Quarterly Appraisal
          </button>
        )}
      </div>

      {/* Success/Error Alerts */}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm animate-fade-in">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <p className="font-medium">{successMsg}</p>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm animate-fade-in">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="font-medium">{errorMsg}</p>
        </div>
      )}

      {/* Navigation tabs */}
      <div className="flex border-b border-white/10 select-none">
        {isEmployee && (
          <button
            onClick={() => setActiveTab('my-reviews')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'my-reviews' 
                ? 'border-brand-500 text-white' 
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            My Appraisals
          </button>
        )}

        {isAdminOrHR && (
          <>
            <button
              onClick={() => setActiveTab('to-review')}
              className={`px-5 py-3 text-sm font-bold border-b-2 transition cursor-pointer ${
                activeTab === 'to-review' 
                  ? 'border-brand-500 text-white' 
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Appraisal Feedback ({managerPending.length})
            </button>
            <button
              onClick={() => setActiveTab('approvals')}
              className={`px-5 py-3 text-sm font-bold border-b-2 transition cursor-pointer ${
                activeTab === 'approvals' 
                  ? 'border-brand-500 text-white' 
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Appraisal Board Approvals ({approvalsPending.length})
            </button>
          </>
        )}
      </div>

      {loadingReviews ? (
        <div className="py-12 text-center text-gray-500">
          <Loader className="w-6 h-6 animate-spin text-brand-500 mx-auto" />
        </div>
      ) : activeTab === 'my-reviews' ? (
        /* Tab 1: Employee Self reviews history */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {myReviews.length === 0 ? (
            <div className="md:col-span-2 glass-card rounded-2xl p-12 text-center text-gray-500 font-semibold border border-white/5">
              No appraisal submissions logged. Initiate your quarterly career targets above.
            </div>
          ) : (
            myReviews.map((rev) => (
              <div key={rev._id} className="glass-card rounded-2xl p-6 border border-white/5 shadow-xl flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div>
                    <span className="text-xs font-black text-brand-400 uppercase tracking-widest">{rev.quarter}</span>
                    <h3 className="text-md font-bold text-white mt-0.5">Self-Appraisal Record</h3>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                    rev.status === 'Approved' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                    rev.status === 'Manager-Reviewed' ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' :
                    rev.status === 'Self-Submitted' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                    'bg-gray-500/15 text-gray-400 border-gray-500/30'
                  }`}>
                    {rev.status}
                  </span>
                </div>

                <div className="space-y-3 flex-1">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Quarterly Targets / Career Goals</label>
                    <p className="text-sm text-gray-200 mt-1 line-clamp-3 whitespace-pre-wrap">{rev.selfGoals}</p>
                  </div>

                  {rev.selfComments && (
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Self Comments</label>
                      <p className="text-xs text-gray-400 mt-0.5 italic">"{rev.selfComments}"</p>
                    </div>
                  )}

                  {rev.status === 'Approved' || rev.status === 'Manager-Reviewed' ? (
                    <div className="bg-white/2 border border-white/5 rounded-xl p-4 mt-2 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-300">Manager Rating:</span>
                        <div className="flex gap-0.5 text-amber-400">
                          {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-current" />
                          ))}
                        </div>
                      </div>

                      {rev.managerComments && (
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Manager Feedback</span>
                          <p className="text-xs text-gray-300 mt-0.5">"{rev.managerComments}"</p>
                        </div>
                      )}

                      {rev.raisePercentage > 0 && (
                        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold pt-1.5 border-t border-white/5">
                          <TrendingUp className="w-4 h-4" />
                          Salary raise applied: +{rev.raisePercentage}%
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                {rev.status === 'Draft' && (
                  <div className="pt-2 border-t border-white/5 flex justify-end">
                    <button
                      onClick={() => handleEditDraftClick(rev)}
                      className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl text-xs transition cursor-pointer select-none"
                    >
                      Edit & Submit Appraisal
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : activeTab === 'to-review' ? (
        /* Tab 2: Manager review input */
        <div className="glass-card rounded-2xl border border-white/5 shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 select-none">
                  <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Period</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Target Goals</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {managerPending.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500 font-semibold">
                      No self-appraisal submissions currently require your review.
                    </td>
                  </tr>
                ) : (
                  managerPending.map((rev) => (
                    <tr key={rev._id} className="hover:bg-white/2 transition">
                      <td className="px-6 py-4">
                        <div className="font-bold text-white text-sm">
                          {rev.employee?.firstName} {rev.employee?.lastName}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{rev.employee?.jobTitle}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">{rev.quarter}</td>
                      <td className="px-6 py-4 text-xs text-gray-300 max-w-62.5 truncate">{rev.selfGoals}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          rev.status === 'Self-Submitted' 
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                            : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                        }`}>
                          {rev.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleOpenFeedbackModal(rev)}
                          className="px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-lg text-xs transition cursor-pointer select-none"
                        >
                          Provide Feedback
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Tab 3: Admin Approval Board & raising triggers */
        <div className="glass-card rounded-2xl border border-white/5 shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 select-none">
                  <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Quarter</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Performance Rating</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Proposed Raise</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {approvalsPending.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500 font-semibold">
                      No reviewed appraisals are pending board approval.
                    </td>
                  </tr>
                ) : (
                  approvalsPending.map((rev) => (
                    <tr key={rev._id} className="hover:bg-white/2 transition">
                      <td className="px-6 py-4">
                        <div className="font-bold text-white text-sm">
                          {rev.employee?.firstName} {rev.employee?.lastName}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          Current Salary: ${rev.employee?.baseSalary?.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">{rev.quarter}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-0.5 text-amber-400">
                          {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-current" />
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-emerald-400 font-extrabold">
                        +{rev.raisePercentage}%
                        {rev.raisePercentage > 0 && rev.employee?.baseSalary && (
                          <span className="block text-[10px] text-gray-400 font-medium">
                            New: ${(rev.employee.baseSalary * (1 + rev.raisePercentage / 100)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          Reviewed
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => {
                            if (window.confirm(`Approve appraisal review? This will immediately apply a ${rev.raisePercentage}% salary raise to ${rev.employee?.firstName} ${rev.employee?.lastName}'s base salary.`)) {
                              approveAppraisalMutation.mutate(rev._id);
                            }
                          }}
                          disabled={approveAppraisalMutation.isPending}
                          className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition duration-200 cursor-pointer disabled:opacity-50 select-none shadow-md shadow-emerald-500/10"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve Raise
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Write Self-Appraisal goals (Employee) */}
      {isSelfModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 z-50 animate-fade-in">
          <div className="glass-card rounded-2xl w-full max-w-lg p-6 md:p-8 border border-white/10 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-brand-400" />
              Quarterly Career Self-Appraisal
            </h2>

            <form onSubmit={(e) => handleSelfFormSubmit(e, true)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Appraisal Quarter
                </label>
                <select
                  required
                  disabled={!!activeReview}
                  value={quarter}
                  onChange={(e) => setQuarter(e.target.value)}
                  className="form-input"
                >
                  <option value="Q1 2026" className="bg-slate-900 text-white">Q1 2026</option>
                  <option value="Q2 2026" className="bg-slate-900 text-white">Q2 2026</option>
                  <option value="Q3 2026" className="bg-slate-900 text-white">Q3 2026</option>
                  <option value="Q4 2026" className="bg-slate-900 text-white">Q4 2026</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> Career Targets & Goals
                </label>
                <textarea
                  required
                  rows={4}
                  value={selfGoals}
                  onChange={(e) => setSelfGoals(e.target.value)}
                  placeholder="Outline key targets achieved, metrics, and core focus goals for next quarter..."
                  className="form-input"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Bookmark className="w-3.5 h-3.5" /> Self Comments
                </label>
                <textarea
                  rows={2}
                  value={selfComments}
                  onChange={(e) => setSelfComments(e.target.value)}
                  placeholder="Optional details, challenges, or support request..."
                  className="form-input"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsSelfModalOpen(false)}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl text-xs transition cursor-pointer select-none"
                >
                  Cancel
                </button>
                
                {(!activeReview || activeReview.status === 'Draft') && (
                  <button
                    type="button"
                    onClick={(e) => handleSelfFormSubmit(e, false)}
                    className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1 select-none"
                  >
                    <Save className="w-3.5 h-3.5" /> Save Draft
                  </button>
                )}

                <button
                  type="submit"
                  disabled={createReviewMutation.isPending || submitSelfAppraisalMutation.isPending}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl text-xs transition duration-200 flex items-center gap-1 cursor-pointer select-none"
                >
                  {createReviewMutation.isPending || submitSelfAppraisalMutation.isPending ? (
                    <Loader className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  Submit Appraisal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Submit Feedback & Rating (Manager) */}
      {isFeedbackModalOpen && activeReview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 z-50 animate-fade-in">
          <div className="glass-card rounded-2xl w-full max-w-lg p-6 md:p-8 border border-white/10 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-brand-400" />
                Review Staff Appraisal
              </h2>
              <p className="text-gray-400 text-xs mt-1">
                Employee: {activeReview.employee?.firstName} {activeReview.employee?.lastName} ({activeReview.quarter})
              </p>
            </div>

            <div className="space-y-4 max-h-[40vh] overflow-y-auto bg-white/1 border border-white/5 rounded-xl p-4">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Quarterly Goals Filed</span>
                <p className="text-sm text-gray-200 mt-1 whitespace-pre-wrap">{activeReview.selfGoals}</p>
              </div>

              {activeReview.selfComments && (
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Employee Self Comments</span>
                  <p className="text-xs text-gray-400 mt-0.5 italic">"{activeReview.selfComments}"</p>
                </div>
              )}
            </div>

            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
              {/* Star Rating Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Appraisal Star Rating</label>
                <div className="flex gap-1 select-none pt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="transition transform hover:scale-110 cursor-pointer"
                    >
                      <Star 
                        className={`w-7 h-7 ${
                          star <= rating 
                            ? 'text-amber-400 fill-amber-400' 
                            : 'text-gray-500 hover:text-amber-400'
                        }`} 
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Manager Feedback comments */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> Review Comments
                </label>
                <textarea
                  required
                  rows={3}
                  value={managerComments}
                  onChange={(e) => setManagerComments(e.target.value)}
                  placeholder="Enter quarterly evaluation, feedback summary, and coaching details..."
                  className="form-input"
                />
              </div>

              {/* Raise Percentage */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Proposed Salary Raise (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={raisePercentage}
                    onChange={(e) => setRaisePercentage(Number(e.target.value))}
                    className="form-input pr-12"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">%</div>
                </div>
                <span className="text-[10px] text-gray-400 block mt-1">
                  Salary will update automatically in employee files once Approved by Board.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsFeedbackModalOpen(false)}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl text-xs transition cursor-pointer select-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitManagerFeedbackMutation.isPending}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl text-xs transition duration-200 flex items-center gap-1 cursor-pointer select-none"
                >
                  {submitManagerFeedbackMutation.isPending ? (
                    <Loader className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  Save Appraisal Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reviews;
