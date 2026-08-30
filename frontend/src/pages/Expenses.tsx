import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { 
  FileText, 
  DollarSign, 
  PlusCircle, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Loader, 
  CreditCard,
  Briefcase
} from 'lucide-react';

interface ExpenseItem {
  _id: string;
  employee: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    jobTitle: string;
  };
  title: string;
  category: 'Travel' | 'Medical' | 'Hardware' | 'Other';
  amount: number;
  description?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  paymentStatus: 'Unpaid' | 'Paid';
  approvedBy?: {
    firstName: string;
    lastName: string;
    employeeId: string;
  };
  createdAt: string;
}

const Expenses: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'claims' | 'queue'>('claims');
  const [modalOpen, setModalOpen] = useState(false);

  // New Claim Form States
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'Travel' | 'Medical' | 'Hardware' | 'Other'>('Travel');
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState('');

  // Alerts
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isAdminOrHR = user?.role === 'Admin' || user?.role === 'HR Manager';

  // 1. Query all expenses (returns user-only if employee, all if HR/Admin)
  const { data: expenses, isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const res = await api.get('/expenses');
      return res.data?.data as ExpenseItem[];
    }
  });

  // Query active employees list for assignment dropdown (Admin/HR Manager only)
  const { data: employeesList } = useQuery({
    queryKey: ['employees-list-dropdown'],
    queryFn: async () => {
      const res = await api.get('/employees');
      return res.data?.data as any[];
    },
    enabled: isAdminOrHR
  });

  // 2. File Claim Mutation
  const fileClaimMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/expenses', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setSuccessMsg('Expense claim filed successfully! Manager notification email & chat webhook alert dispatched.');
      setModalOpen(false);
      
      // Reset form
      setSelectedEmployeeId('');
      setTitle('');
      setCategory('Travel');
      setAmount(0);
      setDescription('');
      
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Failed to submit expense claim');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  });

  // 3. Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'Approved' | 'Rejected' }) => {
      const res = await api.put(`/expenses/${id}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setSuccessMsg('Expense claim reviewed successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Failed to submit review');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  });

  const handleFileClaim = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setErrorMsg('Expense amount must be greater than $0');
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }
    fileClaimMutation.mutate({
      employeeId: isAdminOrHR && selectedEmployeeId ? selectedEmployeeId : undefined,
      title,
      category,
      amount: Number(amount),
      description
    });
  };

  const handleReviewClaim = (id: string, status: 'Approved' | 'Rejected') => {
    updateStatusMutation.mutate({ id, status });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(val);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Helper stats aggregation
  const pendingClaims = expenses?.filter(e => e.status === 'Pending') || [];
  const approvedUnpaidTotal = expenses?.filter(e => e.status === 'Approved' && e.paymentStatus === 'Unpaid').reduce((acc, curr) => acc + curr.amount, 0) || 0;
  const processedTotal = expenses?.filter(e => e.paymentStatus === 'Paid').reduce((acc, curr) => acc + curr.amount, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Alert indicators */}
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

      {/* Overview stats cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-2xl flex items-center gap-4 border border-white/5 shadow-lg">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {isAdminOrHR ? 'Pending Claims Queue' : 'My Pending Claims'}
            </span>
            <span className="text-2xl font-black text-white">{pendingClaims.length} requests</span>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl flex items-center gap-4 border border-white/5 shadow-lg">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Approved Unpaid (Allowance Pool)</span>
            <span className="text-2xl font-black text-white">{formatCurrency(approvedUnpaidTotal)}</span>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl flex items-center gap-4 border border-white/5 shadow-lg">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Processed (Paid)</span>
            <span className="text-2xl font-black text-white">{formatCurrency(processedTotal)}</span>
          </div>
        </div>
      </div>

      {/* Tabs navigation menu header */}
      <div className="flex items-center justify-between border-b border-white/10 select-none">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('claims')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'claims' 
                ? 'border-brand-500 text-white' 
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {isAdminOrHR ? 'All Reimbursements' : 'My Expense Claims'}
          </button>

          {isAdminOrHR && (
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-5 py-3 text-sm font-bold border-b-2 transition cursor-pointer ${
                activeTab === 'queue' 
                  ? 'border-brand-500 text-white' 
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Review Queue ({pendingClaims.length})
            </button>
          )}
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl text-xs transition duration-200 cursor-pointer shadow-lg hover:shadow-brand-500/25 mb-2 shrink-0 select-none"
        >
          <PlusCircle className="w-4 h-4" />
          File Expense Claim
        </button>
      </div>

      {/* Tab content 1: Claims list */}
      {activeTab === 'claims' && (
        <div className="glass-card rounded-2xl p-6 border border-white/5 shadow-xl">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/2">
                  {isAdminOrHR && <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Employee</th>}
                  <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Filed Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      {isAdminOrHR && <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-24" /></td>}
                      <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-32" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-20" /></td>
                      <td className="px-6 py-4"><div className="h-6 bg-white/5 rounded w-16" /></td>
                      <td className="px-6 py-4"><div className="h-6 bg-white/5 rounded w-16" /></td>
                    </tr>
                  ))
                ) : !expenses || expenses.length === 0 ? (
                  <tr>
                    <td colSpan={isAdminOrHR ? 7 : 6} className="px-6 py-16 text-center text-gray-400 text-sm">
                      No expense claims filed yet.
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp) => (
                    <tr key={exp._id} className="bg-white/0 hover:bg-white/2 transition">
                      {isAdminOrHR && (
                        <td className="px-6 py-4 text-sm font-semibold text-white">
                          <span className="block">{exp.employee?.firstName} {exp.employee?.lastName}</span>
                          <span className="block text-[10px] text-gray-400 font-medium tracking-wider">{exp.employee?.employeeId}</span>
                        </td>
                      )}
                      <td className="px-6 py-4 text-sm font-semibold text-white">
                        <span className="block">{exp.title}</span>
                        {exp.description && <span className="block text-[11px] text-gray-400 font-normal leading-normal mt-0.5">{exp.description}</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white/5 border border-white/5 text-gray-300">
                          {exp.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-extrabold text-white">
                        {formatCurrency(exp.amount)}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400 font-semibold">
                        {formatDate(exp.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          exp.status === 'Approved' 
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                            : exp.status === 'Rejected'
                            ? 'bg-red-500/15 text-red-400 border-red-500/30'
                            : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        }`}>
                          {exp.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          exp.paymentStatus === 'Paid' 
                            ? 'bg-purple-500/15 text-purple-400 border-purple-500/30' 
                            : 'bg-gray-500/15 text-gray-400 border-gray-500/30'
                        }`}>
                          {exp.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab content 2: Manager approval queue */}
      {activeTab === 'queue' && isAdminOrHR && (
        <div className="space-y-4 animate-fade-in">
          {pendingClaims.length === 0 ? (
            <div className="glass-card py-16 text-center text-gray-400 text-sm border border-white/5 rounded-2xl">
              No pending reimbursement requests in the queue.
            </div>
          ) : (
            pendingClaims.map((claim) => (
              <div 
                key={claim._id}
                className="glass-card p-5 rounded-2xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-white/10 transition duration-200"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h4 className="text-base font-bold text-white">
                      {claim.employee?.firstName} {claim.employee?.lastName}
                    </h4>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 border border-white/5">
                      {claim.employee?.employeeId}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white/5 border border-white/5 text-gray-300">
                      {claim.category}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-white">
                    {claim.title}
                  </p>
                  {claim.description && (
                    <p className="text-xs text-gray-400 max-w-xl italic">
                      "{claim.description}"
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-[11px] text-gray-400 font-semibold pt-1">
                    <span>Amount requested: <strong className="text-white font-extrabold">{formatCurrency(claim.amount)}</strong></span>
                    <span>•</span>
                    <span>Filed: {formatDate(claim.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                  <button
                    onClick={() => handleReviewClaim(claim._id, 'Rejected')}
                    disabled={updateStatusMutation.isPending}
                    className="flex items-center gap-1.5 px-4 py-2 border border-red-500/30 hover:border-red-500 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-semibold transition cursor-pointer select-none"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                  <button
                    onClick={() => handleReviewClaim(claim._id, 'Approved')}
                    disabled={updateStatusMutation.isPending}
                    className="flex items-center gap-1.5 px-4 py-2 border border-emerald-500/30 hover:border-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold transition cursor-pointer select-none"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Applying Claim Modal Form */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          
          <div className="relative glass-card max-w-md w-full rounded-2xl p-6 md:p-8 border border-white/10 shadow-2xl z-10">
            <h3 className="text-lg font-bold text-white mb-1">File Reimbursement Claim</h3>
            <p className="text-gray-400 text-xs mb-6 font-medium">Provide purchase descriptions and costs to file a request.</p>

            <form onSubmit={handleFileClaim} className="space-y-4">
              {isAdminOrHR && (
                <div>
                  <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">
                    Assign to Employee
                  </label>
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="w-full glass-input px-4 py-3 text-sm cursor-pointer"
                  >
                    <option value="" className="bg-[#13112b] text-white">-- Myself --</option>
                    {employeesList?.map((emp) => (
                      <option key={emp._id} value={emp._id} className="bg-[#13112b] text-white">
                        {emp.firstName} {emp.lastName} ({emp.employeeId})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">
                  Expense Title
                </label>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Office Keyboard, Client Travel taxi"
                    className="w-full pl-11 pr-4 py-3 glass-input text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">
                    Claim Category
                  </label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full glass-input px-4 py-3 text-sm cursor-pointer"
                  >
                    <option value="Travel">Travel Claim</option>
                    <option value="Medical">Medical Bills</option>
                    <option value="Hardware">Hardware Equipment</option>
                    <option value="Other">Other Expenses</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">
                    Amount ($)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      required
                      min={1}
                      value={amount || ''}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      placeholder="Cost"
                      className="w-full pl-11 pr-4 py-3 glass-input text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">
                  Additional Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Justify or provide details about the expense context..."
                  className="w-full px-4 py-3 glass-input text-sm resize-none custom-scrollbar"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-sm font-semibold transition cursor-pointer select-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={fileClaimMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl text-sm transition duration-200 cursor-pointer shadow-lg hover:shadow-brand-500/25 select-none"
                >
                  {fileClaimMutation.isPending ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Filing Claim...
                    </>
                  ) : (
                    'Submit Request'
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

export default Expenses;
