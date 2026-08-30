import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { Table, type Column } from '../components/Table';
import { 
  UserPlus, 
  AlertCircle, 
  Mail, 
  Send, 
  Loader, 
  CheckCircle 
} from 'lucide-react';

interface EmployeeType {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  jobTitle: string;
  department?: {
    name: string;
    code: string;
  };
  user?: {
    email: string;
    role: string;
  };
  status: 'Active' | 'On Leave' | 'Terminated';
  hireDate: string;
}

const Employees: React.FC = () => {
  // Query parameters state hooks
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('firstName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Custom email notice modal states
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeType | null>(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');

  // Success/Error banners
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // React Query fetch pipeline
  const { data, isLoading, error } = useQuery({
    queryKey: ['employees', page, limit, search, sortField, sortOrder],
    queryFn: async () => {
      const sortParam = sortOrder === 'desc' ? `-${sortField}` : sortField;
      const params: any = {
        page,
        limit,
        sort: sortParam
      };

      if (search.trim()) {
        params['firstName[regex]'] = search;
      }

      const response = await api.get('/employees', { params });
      return response.data;
    }
  });

  // Custom Email notice trigger mutation
  const sendEmailMutation = useMutation({
    mutationFn: async ({ id, subject, message }: { id: string; subject: string; message: string }) => {
      const res = await api.post(`/employees/${id}/email`, { subject, message });
      return res.data;
    },
    onSuccess: (resData) => {
      setSuccessMsg(resData.message || 'Direct email notice sent successfully!');
      setEmailModalOpen(false);
      setEmailSubject('');
      setEmailMessage('');
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Failed to dispatch notice email');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  });

  // Table Column Schema configuration
  const columns: Column<EmployeeType>[] = [
    {
      header: 'ID',
      accessor: 'employeeId',
      sortable: true
    },
    {
      header: 'Full Name',
      sortable: true,
      sortKey: 'firstName',
      render: (row) => `${row.firstName} ${row.lastName}`
    },
    {
      header: 'Job Title',
      accessor: 'jobTitle',
      sortable: true
    },
    {
      header: 'Department',
      render: (row) => row.department?.name || 'Unassigned'
    },
    {
      header: 'Phone Number',
      accessor: 'phone'
    },
    {
      header: 'Status',
      sortable: true,
      accessor: 'status',
      render: (row) => {
        const colors: Record<string, string> = {
          'Active': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          'On Leave': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          'Terminated': 'bg-red-500/15 text-red-400 border-red-500/30'
        };
        const colorClass = colors[row.status] || 'bg-gray-500/15 text-gray-400 border-gray-500/30';
        return (
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${colorClass}`}>
            {row.status}
          </span>
        );
      }
    },
    {
      header: 'Actions',
      render: (row) => (
        <button
          onClick={() => {
            setSelectedEmployee(row);
            setEmailModalOpen(true);
          }}
          disabled={!row.user?.email}
          className={`p-1.5 border rounded-lg transition select-none flex items-center justify-center ${
            row.user?.email 
              ? 'bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border-brand-500/20 hover:border-brand-500/30 cursor-pointer' 
              : 'bg-white/5 text-gray-600 border-white/5 cursor-not-allowed'
          }`}
          title={row.user?.email ? "Send Custom Notice Email" : "Employee has no linked email account"}
        >
          <Mail className="w-4 h-4" />
        </button>
      )
    }
  ];

  const handleSort = (field: string, order: 'asc' | 'desc') => {
    setSortField(field);
    setSortOrder(order);
    setPage(1);
  };

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="font-medium">Failed to retrieve employee rosters. Please check server connection.</p>
        </div>
      )}

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

      <div className="glass-card rounded-2xl p-6 md:p-8 border border-white/5 shadow-xl">
        <Table<EmployeeType>
          columns={columns}
          data={data?.data || []}
          loading={isLoading}
          searchQuery={search}
          onSearchChange={handleSearch}
          searchPlaceholder="Search by first name..."
          page={page}
          limit={limit}
          totalItems={data?.pagination?.total || 0}
          totalPages={data?.pagination?.pages || 1}
          onPageChange={setPage}
          onLimitChange={(size) => {
            setLimit(size);
            setPage(1);
          }}
          sortField={sortField}
          sortOrder={sortOrder}
          onSort={handleSort}
          actions={
            <Link
              to="/onboard"
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition duration-200 text-sm cursor-pointer shadow-lg hover:shadow-brand-500/25 select-none shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              Onboard Employee
            </Link>
          }
        />
      </div>

      {/* Send Custom Email Notice Modal */}
      {emailModalOpen && selectedEmployee && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 z-50 animate-fade-in">
          <div className="glass-card rounded-2xl w-full max-w-lg p-6 md:p-8 border border-white/10 shadow-2xl relative space-y-5">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-brand-400" />
              Send Notice Email
            </h2>

            <p className="text-sm text-gray-400">
              Compose and send a direct email notice to <strong>{selectedEmployee.firstName} {selectedEmployee.lastName}</strong>.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendEmailMutation.mutate({
                  id: selectedEmployee._id,
                  subject: emailSubject,
                  message: emailMessage
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Recipient Email</label>
                <input
                  type="text"
                  disabled
                  value={selectedEmployee.user?.email || 'No linked email address'}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Subject</label>
                <input
                  type="text"
                  required
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="e.g. Policy Update Announcement"
                  className="form-input"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Message Notice</label>
                <textarea
                  required
                  rows={6}
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  placeholder="Write the corporate notice body text here..."
                  className="form-input resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setEmailModalOpen(false);
                    setEmailSubject('');
                    setEmailMessage('');
                  }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl text-xs transition cursor-pointer select-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendEmailMutation.isPending}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl text-xs transition duration-200 flex items-center gap-1.5 cursor-pointer select-none"
                >
                  {sendEmailMutation.isPending ? (
                    <>
                      <Loader className="w-3.5 h-3.5 animate-spin" /> Dispatched...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" /> Send Notice
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

export default Employees;
