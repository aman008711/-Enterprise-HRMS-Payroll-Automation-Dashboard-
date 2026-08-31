import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { CostBarChart, StaffDonutChart, type ReportItem } from '../components/Charts';
import { 
  DollarSign, 
  TrendingUp, 
  PlusCircle, 
  FileDown, 
  AlertCircle,
  CheckCircle,
  Loader,
  Users
} from 'lucide-react';

interface PayrollType {
  _id: string;
  employee: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    jobTitle: string;
  };
  payPeriodStart: string;
  payPeriodEnd: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: 'Paid' | 'Unpaid';
  paymentMethod: 'Bank Transfer' | 'Cheque' | 'Cash';
  processedAt?: string;
}



interface EmployeeSelect {
  _id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  baseSalary: number;
}

const Payroll: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'ledger' | 'reports'>('ledger');
  const [modalOpen, setModalOpen] = useState(false);

  // New Payroll Form States
  const [employeeId, setEmployeeId] = useState('');
  const [payPeriodStart, setPayPeriodStart] = useState('');
  const [payPeriodEnd, setPayPeriodEnd] = useState('');
  const [baseSalary, setBaseSalary] = useState<number>(0);
  const [allowances, setAllowances] = useState<number>(0);
  const [deductions, setDeductions] = useState<number>(0);
  const [status, setStatus] = useState<'Paid' | 'Unpaid'>('Paid');
  const [paymentMethod, setPaymentMethod] = useState<'Bank Transfer' | 'Cheque' | 'Cash'>('Bank Transfer');

  // Alert States
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isAdminOrHR = user?.role === 'Admin' || user?.role === 'HR Manager';

  // 1. Fetch Payroll History list
  const { data: payrollList, isLoading: listLoading } = useQuery({
    queryKey: ['payroll'],
    queryFn: async () => {
      const res = await api.get('/payroll');
      return res.data?.data as PayrollType[];
    }
  });

  // 2. Fetch Cost Center aggregate reports (Admin/HR only)
  const { data: reportList, isLoading: reportLoading } = useQuery({
    queryKey: ['payroll-report'],
    queryFn: async () => {
      const res = await api.get('/payroll/report');
      return res.data?.data as ReportItem[];
    },
    enabled: isAdminOrHR
  });

  // 3. Fetch Employees to populate dropdown select list (Admin/HR only)
  const { data: employees } = useQuery({
    queryKey: ['onboarded-employees'],
    queryFn: async () => {
      const res = await api.get('/employees');
      return res.data?.data as EmployeeSelect[];
    },
    enabled: isAdminOrHR
  });

  // 4. Generate Payroll Slip Mutation
  const createPayrollMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/payroll', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-report'] });
      setSuccessMsg('Payroll ledger entry processed successfully!');
      setModalOpen(false);
      
      // Reset form fields
      setEmployeeId('');
      setPayPeriodStart('');
      setPayPeriodEnd('');
      setBaseSalary(0);
      setAllowances(0);
      setDeductions(0);
      setStatus('Paid');
      setPaymentMethod('Bank Transfer');
      
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Failed to process payroll transaction.');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  });

  const handleCreatePayroll = (e: React.FormEvent) => {
    e.preventDefault();
    if (new Date(payPeriodEnd) < new Date(payPeriodStart)) {
      setErrorMsg('Pay period end date cannot be earlier than start date');
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }
    createPayrollMutation.mutate({
      employeeId,
      payPeriodStart,
      payPeriodEnd,
      baseSalary: Number(baseSalary),
      allowances: Number(allowances),
      deductions: Number(deductions),
      status,
      paymentMethod
    });
  };

  // Real-time calculator: net pay calculated in the UI on-the-fly
  const calculatedNetSalary = Number(baseSalary) + Number(allowances) - Number(deductions);

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

  // Safe stream payslip trigger (downloads PDF in Commit 24)
  const handleDownloadPDF = async (payrollId: string) => {
    try {
      const response = await api.get(`/payroll/${payrollId}/download`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `payslip-${payrollId}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Failed to download payslip:', err);
      setErrorMsg('Failed to download secure payslip PDF.');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Banners */}
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

      {/* Navigation tabs header */}
      <div className="flex items-center justify-between border-b border-white/10 select-none">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'ledger' 
                ? 'border-brand-500 text-white' 
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {isAdminOrHR ? 'Payroll Registry' : 'My Pay History'}
          </button>

          {isAdminOrHR && (
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-5 py-3 text-sm font-bold border-b-2 transition cursor-pointer ${
                activeTab === 'reports' 
                  ? 'border-brand-500 text-white' 
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Cost Center Reports
            </button>
          )}
        </div>

        {isAdminOrHR && activeTab === 'ledger' && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl text-xs transition duration-200 cursor-pointer shadow-lg hover:shadow-brand-500/25 shrink-0 mb-2 select-none"
          >
            <PlusCircle className="w-4 h-4" />
            Generate Payroll Slip
          </button>
        )}
      </div>

      {/* Tab content 1: Ledger History */}
      {activeTab === 'ledger' && (
        <div className="glass-card rounded-2xl p-6 border border-white/5 shadow-xl">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[1000px] text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/2">
                  {isAdminOrHR && <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Employee</th>}
                  <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Pay Period</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Base Salary</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Allowances</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Deductions</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Net Salary</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Method</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Payslip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {listLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      {isAdminOrHR && <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-24" /></td>}
                      <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-32" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-20" /></td>
                      <td className="px-6 py-4"><div className="h-6 bg-white/5 rounded w-16" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-10" /></td>
                    </tr>
                  ))
                ) : !payrollList || payrollList.length === 0 ? (
                  <tr>
                    <td colSpan={isAdminOrHR ? 9 : 8} className="px-6 py-16 text-center text-gray-400 text-sm">
                      No payroll records processed yet.
                    </td>
                  </tr>
                ) : (
                  payrollList.map((p) => (
                    <tr key={p._id} className="bg-white/0 hover:bg-white/2 transition">
                      {isAdminOrHR && (
                        <td className="px-6 py-4 text-sm font-semibold text-white">
                          <span className="block">{p.employee?.firstName} {p.employee?.lastName}</span>
                          <span className="block text-[10px] text-gray-400 font-medium tracking-wider">{p.employee?.employeeId}</span>
                        </td>
                      )}
                      <td className="px-6 py-4 text-xs text-gray-300 font-semibold">
                        {formatDate(p.payPeriodStart)} - {formatDate(p.payPeriodEnd)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">{formatCurrency(p.baseSalary)}</td>
                      <td className="px-6 py-4 text-sm text-emerald-400">+{formatCurrency(p.allowances)}</td>
                      <td className="px-6 py-4 text-sm text-red-400">-{formatCurrency(p.deductions)}</td>
                      <td className="px-6 py-4 text-sm text-white font-extrabold">{formatCurrency(p.netSalary)}</td>
                      <td className="px-6 py-4 text-xs text-gray-400 font-semibold">{p.paymentMethod}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          p.status === 'Paid' 
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                            : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleDownloadPDF(p._id)}
                          className="p-2 rounded-lg bg-white/5 hover:bg-brand-500/20 text-gray-400 hover:text-brand-400 border border-white/5 hover:border-brand-500/30 transition cursor-pointer"
                          title="Download Payslip PDF"
                        >
                          <FileDown className="w-4 h-4" />
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

      {/* Tab content 2: Aggregates Cost Center report (Admin/HR only) */}
      {activeTab === 'reports' && isAdminOrHR && (
        <div className="space-y-6 animate-fade-in">
          {/* General Summary aggregates cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-6 rounded-2xl flex items-center gap-4 border border-white/5">
              <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Net Budget</span>
                <span className="text-xl font-black text-white">
                  {formatCurrency(reportList?.reduce((acc, curr) => acc + curr.totalNetSalary, 0) || 0)}
                </span>
              </div>
            </div>

            <div className="glass-card p-6 rounded-2xl flex items-center gap-4 border border-white/5">
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Average Net Pay</span>
                <span className="text-xl font-black text-white">
                  {formatCurrency(
                    reportList?.length 
                      ? (reportList.reduce((acc, curr) => acc + curr.averageNetSalary, 0) / reportList.length) 
                      : 0
                  )}
                </span>
              </div>
            </div>

            <div className="glass-card p-6 rounded-2xl flex items-center gap-4 border border-white/5">
              <div className="p-3 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Transactions Run</span>
                <span className="text-xl font-black text-white">
                  {reportList?.reduce((acc, curr) => acc + curr.payrollCount, 0) || 0} batches
                </span>
              </div>
            </div>
          </div>

          {/* Department Cost Analytics Charts */}
          {!reportLoading && reportList && reportList.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-6">
              <CostBarChart data={reportList} />
              <StaffDonutChart data={reportList} />
            </div>
          )}

          {/* Department Breakdown table listing */}
          <div className="glass-card rounded-2xl p-6 border border-white/5 shadow-xl">
            <h3 className="text-base font-bold text-white mb-4">Department Cost Centers</h3>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/2">
                    <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Gross Base</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Allowances</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Deductions</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Net Spending</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Avg Salary</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Runs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {reportLoading ? (
                    Array.from({ length: 3 }).map((_, idx) => (
                      <tr key={idx} className="animate-pulse">
                        <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-24" /></td>
                        <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                        <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                        <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                        <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                        <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                        <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-10" /></td>
                      </tr>
                    ))
                  ) : !reportList || reportList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center text-gray-400 text-sm">
                        No financial history recorded for departments.
                      </td>
                    </tr>
                  ) : (
                    reportList.map((rep) => (
                      <tr key={rep._id} className="bg-white/0 hover:bg-white/2 transition">
                        <td className="px-6 py-4 text-sm font-bold text-white">
                          {rep.departmentName || 'Unassigned'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300">{formatCurrency(rep.totalBaseSalary)}</td>
                        <td className="px-6 py-4 text-sm text-emerald-400">+{formatCurrency(rep.totalAllowances)}</td>
                        <td className="px-6 py-4 text-sm text-red-400">-{formatCurrency(rep.totalDeductions)}</td>
                        <td className="px-6 py-4 text-sm text-white font-extrabold">{formatCurrency(rep.totalNetSalary)}</td>
                        <td className="px-6 py-4 text-sm text-brand-400 font-semibold">{formatCurrency(rep.averageNetSalary)}</td>
                        <td className="px-6 py-4 text-sm text-gray-400 font-bold">{rep.payrollCount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Generation Modal (Admin/HR only) */}
      {modalOpen && isAdminOrHR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          
          <div className="relative glass-card max-w-lg w-full rounded-2xl p-6 md:p-8 border border-white/10 shadow-2xl z-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-lg font-bold text-white mb-2">Process Employee Payroll</h3>
            <p className="text-gray-400 text-xs mb-6 font-medium">Define pay structures, allowance additions, and tax deductions.</p>

            <form onSubmit={handleCreatePayroll} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">
                  Target Employee
                </label>
                <select
                  required
                  value={employeeId}
                  onChange={(e) => {
                    const empId = e.target.value;
                    setEmployeeId(empId);
                    const selected = employees?.find(emp => emp._id === empId);
                    if (selected) {
                      setBaseSalary(selected.baseSalary || 0);
                    } else {
                      setBaseSalary(0);
                    }
                  }}
                  className="w-full glass-input px-4 py-3 text-sm cursor-pointer"
                >
                  <option value="">Select Employee...</option>
                  {employees?.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">
                    Pay Period Start
                  </label>
                  <input
                    type="date"
                    required
                    value={payPeriodStart}
                    onChange={(e) => setPayPeriodStart(e.target.value)}
                    className="w-full px-4 py-3 glass-input text-sm cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">
                    Pay Period End
                  </label>
                  <input
                    type="date"
                    required
                    value={payPeriodEnd}
                    onChange={(e) => setPayPeriodEnd(e.target.value)}
                    className="w-full px-4 py-3 glass-input text-sm cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">
                    Base Salary ($)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={baseSalary}
                    onChange={(e) => setBaseSalary(Number(e.target.value))}
                    className="w-full px-4 py-3 glass-input text-sm"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">
                    Allowances ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={allowances}
                    onChange={(e) => setAllowances(Number(e.target.value))}
                    className="w-full px-4 py-3 glass-input text-sm text-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">
                    Deductions ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={deductions}
                    onChange={(e) => setDeductions(Number(e.target.value))}
                    className="w-full px-4 py-3 glass-input text-sm text-red-400"
                  />
                </div>
              </div>

              {/* Dynamic Net Salary Preview Box */}
              <div className="p-4 rounded-xl bg-brand-500/10 border border-brand-500/25 flex items-center justify-between">
                <div>
                  <span className="block text-xs text-brand-300 font-bold uppercase tracking-wider">Net Salary Payout (Recalculated)</span>
                  <span className="block text-[10px] text-gray-400 leading-none mt-1">Base + Allowances - Deductions</span>
                </div>
                <span className="text-xl font-black text-white">{formatCurrency(calculatedNetSalary)}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e: any) => setPaymentMethod(e.target.value)}
                    className="w-full glass-input px-4 py-3 text-sm cursor-pointer"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full glass-input px-4 py-3 text-sm cursor-pointer"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Unpaid">Unpaid</option>
                  </select>
                </div>
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
                  disabled={createPayrollMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl text-sm transition duration-200 cursor-pointer shadow-lg hover:shadow-brand-500/25 select-none"
                >
                  {createPayrollMutation.isPending ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Generate Payslip'
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

export default Payroll;
