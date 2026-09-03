import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import {
  User,
  Building2,
  ShieldCheck,
  Save,
  Loader,
  CheckCircle2,
  X,
  Users,
  Search,
  Check
} from 'lucide-react';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdminOrHR = user?.role === 'Admin' || user?.role === 'HR Manager';

  // Active view: 'my-profile' or 'directory' (for Admin/HR)
  const [activeTab, setActiveTab] = useState<'my-profile' | 'directory'>('my-profile');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // Form states for "My Profile"
  const [myFirstName, setMyFirstName] = useState('');
  const [myLastName, setMyLastName] = useState('');
  const [myPhone, setMyPhone] = useState('');
  const [myAddress, setMyAddress] = useState('');
  const [myEmergencyContact, setMyEmergencyContact] = useState('');
  const [myBio, setMyBio] = useState('');
  const [mySkills, setMySkills] = useState('');
  const [myLinkedin, setMyLinkedin] = useState('');
  const [myDob, setMyDob] = useState('');

  // Form states for Admin Employee Editing
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminAddress, setAdminAddress] = useState('');
  const [adminEmergencyContact, setAdminEmergencyContact] = useState('');
  const [adminBio, setAdminBio] = useState('');
  const [adminSkills, setAdminSkills] = useState('');
  const [adminLinkedin, setAdminLinkedin] = useState('');
  const [adminDob, setAdminDob] = useState('');
  const [adminJobTitle, setAdminJobTitle] = useState('');
  const [adminDepartment, setAdminDepartment] = useState('');
  const [adminStatus, setAdminStatus] = useState('Active');
  const [adminBaseSalary, setAdminBaseSalary] = useState(0);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* ==========================================================================
     QUERIES
     ========================================================================== */
  const { data: myProfileRes } = useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => {
      const res = await api.get('/employees/me');
      return res.data?.data || res.data;
    }
  });

  const { data: employeesRes, isLoading: loadingEmployees } = useQuery({
    queryKey: ['all-employees-profile'],
    queryFn: async () => {
      const res = await api.get('/employees');
      return res.data?.data || res.data || [];
    },
    enabled: isAdminOrHR
  });

  const { data: departmentsRes } = useQuery({
    queryKey: ['departments-profile'],
    queryFn: async () => {
      const res = await api.get('/departments');
      return res.data?.data || res.data || [];
    },
    enabled: isAdminOrHR
  });

  const myProfile = myProfileRes;
  const employeesList: any[] = Array.isArray(employeesRes) ? employeesRes : Array.isArray(employeesRes?.data) ? employeesRes.data : [];
  const departmentsList: any[] = Array.isArray(departmentsRes) ? departmentsRes : Array.isArray(departmentsRes?.data) ? departmentsRes.data : [];

  // Populate My Profile form fields
  useEffect(() => {
    if (myProfile) {
      setMyFirstName(myProfile.firstName || '');
      setMyLastName(myProfile.lastName || '');
      setMyPhone(myProfile.phone || '');
      setMyAddress(myProfile.address || '');
      setMyEmergencyContact(myProfile.emergencyContact || '');
      setMyBio(myProfile.bio || '');
      setMySkills(Array.isArray(myProfile.skills) ? myProfile.skills.join(', ') : '');
      setMyLinkedin(myProfile.linkedin || '');
      setMyDob(myProfile.dateOfBirth ? new Date(myProfile.dateOfBirth).toISOString().slice(0, 10) : '');
    }
  }, [myProfile]);

  // Selected employee for Admin/HR editing
  const selectedEmployee = employeesList.find((e: any) => e._id === selectedEmployeeId) || employeesList[0];

  useEffect(() => {
    if (selectedEmployee) {
      if (!selectedEmployeeId) {
        setSelectedEmployeeId(selectedEmployee._id);
      }
      setAdminFirstName(selectedEmployee.firstName || '');
      setAdminLastName(selectedEmployee.lastName || '');
      setAdminPhone(selectedEmployee.phone || '');
      setAdminAddress(selectedEmployee.address || '');
      setAdminEmergencyContact(selectedEmployee.emergencyContact || '');
      setAdminBio(selectedEmployee.bio || '');
      setAdminSkills(Array.isArray(selectedEmployee.skills) ? selectedEmployee.skills.join(', ') : '');
      setAdminLinkedin(selectedEmployee.linkedin || '');
      setAdminDob(selectedEmployee.dateOfBirth ? new Date(selectedEmployee.dateOfBirth).toISOString().slice(0, 10) : '');
      setAdminJobTitle(selectedEmployee.jobTitle || '');
      setAdminDepartment(selectedEmployee.department?._id || selectedEmployee.department || '');
      setAdminStatus(selectedEmployee.status || 'Active');
      setAdminBaseSalary(selectedEmployee.baseSalary || 0);
    }
  }, [selectedEmployee, selectedEmployeeId]);

  /* ==========================================================================
     MUTATIONS
     ========================================================================== */
  const updateMyProfileMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.put('/employees/me', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      showToast('Your profile details have been saved successfully.');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error || 'Failed to update profile', 'error');
    }
  });

  const updateEmployeeByIdMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await api.put(`/employees/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-employees-profile'] });
      queryClient.invalidateQueries({ queryKey: ['employees-overview'] });
      showToast('Employee administrative record updated successfully.');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error || 'Failed to update employee record', 'error');
    }
  });

  const handleSaveMyProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateMyProfileMutation.mutate({
      firstName: myFirstName,
      lastName: myLastName,
      phone: myPhone,
      address: myAddress,
      emergencyContact: myEmergencyContact,
      bio: myBio,
      skills: mySkills,
      linkedin: myLinkedin,
      dateOfBirth: myDob || undefined
    });
  };

  const handleSaveAdminEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) return;
    updateEmployeeByIdMutation.mutate({
      id: selectedEmployeeId,
      payload: {
        firstName: adminFirstName,
        lastName: adminLastName,
        phone: adminPhone,
        address: adminAddress,
        emergencyContact: adminEmergencyContact,
        bio: adminBio,
        skills: adminSkills,
        linkedin: adminLinkedin,
        dateOfBirth: adminDob || undefined,
        jobTitle: adminJobTitle,
        department: adminDepartment || undefined,
        status: adminStatus,
        baseSalary: adminBaseSalary
      }
    });
  };

  // Filtered employees for directory search
  const filteredEmployees = (employeesList || []).filter((emp: any) => {
    const q = searchQuery.toLowerCase();
    const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
    const id = (emp.employeeId || '').toLowerCase();
    const email = (emp.user?.email || '').toLowerCase();
    return fullName.includes(q) || id.includes(q) || email.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg text-xs font-medium border shadow-lg transition-all ${
          toast.type === 'success' ? 'bg-[#0e2118] text-emerald-300 border-emerald-800/60' : 'bg-[#291216] text-rose-300 border-rose-800/60'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <X className="w-4 h-4 text-rose-400" />}
          {toast.message}
        </div>
      )}

      {/* Header Profile Banner */}
      <div className="bg-[#11131a] border border-[#1e212d] rounded-xl p-5 md:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 flex items-center justify-center font-bold text-xl select-none">
            {myProfile?.firstName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-semibold text-white tracking-tight">
                {myProfile?.firstName} {myProfile?.lastName}
              </h1>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                user?.role === 'Admin' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                user?.role === 'HR Manager' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                {user?.role}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {myProfile?.jobTitle || 'Team Member'} • {myProfile?.department?.name || 'Operations'} • {myProfile?.employeeId || 'EMP-ACTIVE'}
            </p>
          </div>
        </div>

        {/* Tab Selection for Admin/HR */}
        {isAdminOrHR && (
          <div className="flex items-center bg-[#181a24] p-1 rounded-lg border border-[#272a38] text-xs">
            <button
              onClick={() => setActiveTab('my-profile')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition cursor-pointer ${
                activeTab === 'my-profile' ? 'bg-[#272a38] text-white shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              My Profile
            </button>
            <button
              onClick={() => setActiveTab('directory')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition cursor-pointer ${
                activeTab === 'directory' ? 'bg-[#272a38] text-white shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Manage Workforce Records
            </button>
          </div>
        )}
      </div>

      {/* ====================================================================
          VIEW 1: ACTIVE USER'S OWN PROFILE
          ==================================================================== */}
      {activeTab === 'my-profile' && (
        <form onSubmit={handleSaveMyProfile} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Personal & Contact Information */}
          <div className="lg:col-span-2 bg-[#11131a] border border-[#1e212d] rounded-xl p-5 md:p-6 space-y-5 shadow-sm">
            <div className="border-b border-[#1e212d] pb-3">
              <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-400" />
                Personal & Contact Details
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Update your contact records and personal emergency information.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">First Name</label>
                <input
                  type="text"
                  required
                  value={myFirstName}
                  onChange={(e) => setMyFirstName(e.target.value)}
                  className="w-full bg-[#0e1017] border border-[#1e212d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  value={myLastName}
                  onChange={(e) => setMyLastName(e.target.value)}
                  className="w-full bg-[#0e1017] border border-[#1e212d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Corporate Email</label>
                <input
                  type="email"
                  disabled
                  value={myProfile?.user?.email || user?.email || ''}
                  className="w-full bg-[#0a0c12] border border-[#1e212d] rounded-lg px-3 py-2 text-xs text-zinc-500 cursor-not-allowed"
                  title="Official corporate email cannot be modified directly"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={myPhone}
                  onChange={(e) => setMyPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-[#0e1017] border border-[#1e212d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-zinc-300 mb-1">Residential Address</label>
                <input
                  type="text"
                  value={myAddress}
                  onChange={(e) => setMyAddress(e.target.value)}
                  placeholder="Street address, city, state, postal code"
                  className="w-full bg-[#0e1017] border border-[#1e212d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={myDob}
                  onChange={(e) => setMyDob(e.target.value)}
                  className="w-full bg-[#0e1017] border border-[#1e212d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Emergency Contact</label>
                <input
                  type="text"
                  value={myEmergencyContact}
                  onChange={(e) => setMyEmergencyContact(e.target.value)}
                  placeholder="Name (e.g. Jane Doe - +1 555 1234)"
                  className="w-full bg-[#0e1017] border border-[#1e212d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="border-t border-[#1e212d] pt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Bio / Profile Summary</label>
                <textarea
                  rows={3}
                  value={myBio}
                  onChange={(e) => setMyBio(e.target.value)}
                  placeholder="Share a short bio summarizing your background and role..."
                  className="w-full bg-[#0e1017] border border-[#1e212d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Core Skills (comma separated)</label>
                  <input
                    type="text"
                    value={mySkills}
                    onChange={(e) => setMySkills(e.target.value)}
                    placeholder="React, TypeScript, Payroll Compliance"
                    className="w-full bg-[#0e1017] border border-[#1e212d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">LinkedIn Profile</label>
                  <input
                    type="url"
                    value={myLinkedin}
                    onChange={(e) => setMyLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full bg-[#0e1017] border border-[#1e212d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="submit"
                disabled={updateMyProfileMutation.isPending}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-xs shadow-sm transition cursor-pointer"
              >
                {updateMyProfileMutation.isPending ? (
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save Profile Changes
              </button>
            </div>
          </div>

          {/* Right Column: Official Employment Record Card */}
          <div className="bg-[#11131a] border border-[#1e212d] rounded-xl p-5 md:p-6 space-y-4 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="border-b border-[#1e212d] pb-3">
                <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  Official Employment Record
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Governed and certified by Organization Administration.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0e1017] border border-[#1e212d]">
                  <span className="text-zinc-400">Employee ID</span>
                  <span className="font-mono font-semibold text-white">{myProfile?.employeeId || 'EMP-ACTIVE'}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0e1017] border border-[#1e212d]">
                  <span className="text-zinc-400">Department</span>
                  <span className="font-semibold text-white">{myProfile?.department?.name || 'General Operations'}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0e1017] border border-[#1e212d]">
                  <span className="text-zinc-400">Designation</span>
                  <span className="font-semibold text-white">{myProfile?.jobTitle || 'Staff Member'}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0e1017] border border-[#1e212d]">
                  <span className="text-zinc-400">Reports To</span>
                  <span className="font-semibold text-zinc-200">
                    {myProfile?.manager ? `${myProfile.manager.firstName} ${myProfile.manager.lastName}` : 'Executive Leadership'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0e1017] border border-[#1e212d]">
                  <span className="text-zinc-400">Employment Status</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                    {myProfile?.status || 'Active'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0e1017] border border-[#1e212d]">
                  <span className="text-zinc-400">Date of Joining</span>
                  <span className="text-zinc-200">
                    {myProfile?.hireDate ? new Date(myProfile.hireDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Jan 15, 2024'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0e1017] border border-[#1e212d]">
                  <span className="text-zinc-400">Base Salary Grade</span>
                  <span className="font-semibold text-emerald-400">
                    ${(myProfile?.baseSalary || 7500).toLocaleString()}/mo
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-indigo-950/20 border border-indigo-800/30 rounded-lg flex items-start gap-2 text-xs text-indigo-300">
              <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>Personal Identifiable Information (PII) is encrypted under AES-256 standards.</span>
            </div>
          </div>
        </form>
      )}

      {/* ====================================================================
          VIEW 2: WORKFORCE RECORD MANAGEMENT (ADMIN & HR ONLY)
          ==================================================================== */}
      {activeTab === 'directory' && isAdminOrHR && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Employee Directory List Selector */}
          <div className="bg-[#11131a] border border-[#1e212d] rounded-xl p-5 space-y-4 shadow-sm">
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                Select Employee Record
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Choose an employee to view and edit their master HR profile.
              </p>
            </div>

            {/* Search filter input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, ID, or email..."
                className="w-full bg-[#0e1017] border border-[#1e212d] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Employee roster scroll list */}
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto custom-scrollbar">
              {loadingEmployees ? (
                <div className="py-8 text-center space-y-2 text-zinc-400">
                  <Loader className="w-5 h-5 animate-spin mx-auto text-indigo-400" />
                  <span className="text-xs">Loading employee directory...</span>
                </div>
              ) : filteredEmployees.length > 0 ? (
                filteredEmployees.map((emp: any) => {
                  const isSelected = (selectedEmployeeId || selectedEmployee?._id) === emp._id;
                  return (
                    <div
                      key={emp._id}
                      onClick={() => setSelectedEmployeeId(emp._id)}
                      className={`p-3 rounded-lg border cursor-pointer transition ${
                        isSelected
                          ? 'bg-indigo-950/20 border-indigo-500/40'
                          : 'bg-[#0e1017] border-[#1e212d] hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">
                          {emp.firstName} {emp.lastName}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400">{emp.employeeId}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1">
                        <span>{emp.jobTitle}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-medium border ${
                          emp.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          emp.status === 'On Leave' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {emp.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-zinc-500 text-center py-6">No matching employees found.</p>
              )}
            </div>
          </div>

          {/* Employee Record Editor (Admin & HR) */}
          {!selectedEmployee ? (
            <div className="lg:col-span-2 bg-[#11131a] border border-[#1e212d] rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-2.5">
              <Users className="w-8 h-8 text-zinc-600" />
              <span className="text-sm font-semibold text-white">No Employee Selected</span>
              <p className="text-xs text-zinc-400">Select an employee from the directory list on the left to edit their record.</p>
            </div>
          ) : (
            <div className="lg:col-span-2 bg-[#11131a] border border-[#1e212d] rounded-xl p-5 md:p-6 space-y-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#1e212d] pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-400" />
                    Editing Record: {selectedEmployee.firstName} {selectedEmployee.lastName}
                  </h3>
                  <span className="text-xs text-zinc-400 font-mono">
                    {selectedEmployee.employeeId} • {selectedEmployee.user?.email || 'No Email Linked'}
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-semibold">
                  Admin Elevated Access
                </span>
              </div>

            <form onSubmit={handleSaveAdminEmployee} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={adminFirstName}
                    onChange={(e) => setAdminFirstName(e.target.value)}
                    className="w-full bg-[#0e1017] border border-[#1e212d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={adminLastName}
                    onChange={(e) => setAdminLastName(e.target.value)}
                    className="w-full bg-[#0e1017] border border-[#1e212d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Job Title / Designation</label>
                  <input
                    type="text"
                    required
                    value={adminJobTitle}
                    onChange={(e) => setAdminJobTitle(e.target.value)}
                    className="w-full bg-[#0e1017] border border-[#1e212d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Department</label>
                  <select
                    value={adminDepartment}
                    onChange={(e) => setAdminDepartment(e.target.value)}
                    className="w-full bg-[#0e1017] border border-[#1e212d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select Department</option>
                    {departmentsList.map((dept: any) => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Employment Status</label>
                  <select
                    value={adminStatus}
                    onChange={(e) => setAdminStatus(e.target.value)}
                    className="w-full bg-[#0e1017] border border-[#1e212d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Terminated">Terminated</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Base Monthly Salary ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={adminBaseSalary}
                    onChange={(e) => setAdminBaseSalary(Number(e.target.value))}
                    className="w-full bg-[#0e1017] border border-[#1e212d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={adminPhone}
                    onChange={(e) => setAdminPhone(e.target.value)}
                    className="w-full bg-[#0e1017] border border-[#1e212d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Emergency Contact</label>
                  <input
                    type="text"
                    value={adminEmergencyContact}
                    onChange={(e) => setAdminEmergencyContact(e.target.value)}
                    className="w-full bg-[#0e1017] border border-[#1e212d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Address</label>
                  <input
                    type="text"
                    value={adminAddress}
                    onChange={(e) => setAdminAddress(e.target.value)}
                    className="w-full bg-[#0e1017] border border-[#1e212d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Professional Skills (comma separated)</label>
                  <input
                    type="text"
                    value={adminSkills}
                    onChange={(e) => setAdminSkills(e.target.value)}
                    className="w-full bg-[#0e1017] border border-[#1e212d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end pt-3">
                <button
                  type="submit"
                  disabled={updateEmployeeByIdMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-xs shadow-sm transition cursor-pointer"
                >
                  {updateEmployeeByIdMutation.isPending ? (
                    <Loader className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  Save Employee Updates
                </button>
              </div>
            </form>
          </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Profile;
