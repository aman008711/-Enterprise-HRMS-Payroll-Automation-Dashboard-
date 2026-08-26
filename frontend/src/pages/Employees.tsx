import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { Table, type Column } from '../components/Table';
import { UserPlus, AlertCircle } from 'lucide-react';

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
        // advancedResults regex query parsing
        params['firstName[regex]'] = search;
      }

      const response = await api.get('/employees', { params });
      return response.data;
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
    }
  ];

  const handleSort = (field: string, order: 'asc' | 'desc') => {
    setSortField(field);
    setSortOrder(order);
    setPage(1); // Reset page on sorting change
  };

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1); // Reset page on searching change
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="font-medium">Failed to retrieve employee rosters. Please check server connection.</p>
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
    </div>
  );
};

export default Employees;
