import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { 
  User, 
  Lock, 
  Mail, 
  Phone, 
  Briefcase, 
  Building, 
  UserCheck, 
  ChevronRight, 
  ChevronLeft, 
  ShieldCheck, 
  AlertCircle,
  Loader
} from 'lucide-react';

interface DepartmentOption {
  _id: string;
  name: string;
  code: string;
}

interface ManagerOption {
  _id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  jobTitle: string;
}

const Onboard: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Form Field States
  // Step 1: Credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Admin' | 'HR Manager' | 'Employee'>('Employee');

  // Step 2: Personal
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [phone, setPhone] = useState('');

  // Step 3: Professional
  const [jobTitle, setJobTitle] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [managerId, setManagerId] = useState('');

  // Validation States
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch departments hierarchy to populate selection list
  const { data: deptData } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await api.get('/departments/hierarchy');
      return res.data?.data as DepartmentOption[];
    }
  });

  // Fetch employee rosters to populate manager selection list
  const { data: managerData } = useQuery({
    queryKey: ['managers'],
    queryFn: async () => {
      const res = await api.get('/employees');
      return res.data?.data as ManagerOption[];
    }
  });

  const nextStep = () => {
    setValidationError(null);
    if (step === 1) {
      if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        setValidationError('Please provide a valid email format');
        return;
      }
      if (password.length < 6) {
        setValidationError('Password must be at least 6 characters long');
        return;
      }
    } else if (step === 2) {
      if (!firstName.trim()) {
        setValidationError('First name is required');
        return;
      }
      if (!lastName.trim()) {
        setValidationError('Last name is required');
        return;
      }
      if (employeeId.length < 3) {
        setValidationError('Employee ID must be at least 3 characters');
        return;
      }
    }
    setStep(step + 1);
  };

  const prevStep = () => {
    setValidationError(null);
    setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!jobTitle.trim()) {
      setValidationError('Job title is required');
      return;
    }
    if (!departmentId) {
      setValidationError('Please select a department');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Create User account first via register controller
      const registerRes = await api.post('/auth/register', {
        email,
        password,
        role
      });

      const userId = registerRes.data?.user?.id;
      if (!userId) {
        throw new Error('Registration failed to return user credentials ID');
      }

      // 2. Onboard employee using the newly registered User ID
      await api.post('/employees', {
        userId,
        firstName,
        lastName,
        employeeId: employeeId.toUpperCase(),
        phone: phone || undefined,
        jobTitle,
        departmentId,
        managerId: managerId || undefined
      });

      // Navigate back to directory
      navigate('/employees');
    } catch (err: any) {
      setValidationError(
        err.response?.data?.error || 
        'An error occurred during onboarding transaction. Please verify database constraints.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Stepper Progress Indicator Header */}
      <div className="glass-card rounded-2xl p-6 border border-white/5 shadow-xl flex items-center justify-between">
        {[
          { label: 'Credentials', icon: Mail },
          { label: 'Personal Info', icon: User },
          { label: 'Job Settings', icon: Briefcase }
        ].map((item, idx) => {
          const Icon = item.icon;
          const num = idx + 1;
          const active = step === num;
          const completed = step > num;
          return (
            <div key={idx} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center border font-bold text-sm transition select-none ${
                active 
                  ? 'bg-brand-600 text-white border-brand-500 shadow-md shadow-brand-500/20' 
                  : completed 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                    : 'bg-white/5 text-gray-500 border-white/5'
              }`}>
                {completed ? <ShieldCheck className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-xs font-semibold uppercase tracking-wider hidden sm:block ${
                active ? 'text-white' : completed ? 'text-emerald-400' : 'text-gray-500'
              }`}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Validation boundary alerts */}
      {validationError && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="font-medium">{validationError}</p>
        </div>
      )}

      {/* Onboarding Input Forms */}
      <div className="glass-card rounded-2xl p-8 border border-white/5 shadow-2xl relative overflow-hidden">
        <form onSubmit={handleSubmit} className="space-y-6">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Corporate Credentials</h3>
                <p className="text-gray-400 text-xs font-medium">Define access credentials for this new account.</p>
              </div>

              <div>
                <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-11 pr-4 py-3 glass-input text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-3 glass-input text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">
                  Role Authority
                </label>
                <div className="relative">
                  <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    value={role}
                    onChange={(e: any) => setRole(e.target.value)}
                    className="w-full glass-input pl-11 pr-4 py-3 cursor-pointer"
                  >
                    <option value="Employee">Employee (Standard Access)</option>
                    <option value="HR Manager">HR Manager (Personnel & Payroll)</option>
                    <option value="Admin">Admin (Full Control)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Personal Details</h3>
                <p className="text-gray-400 text-xs font-medium">Provide general profile metrics.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    className="w-full px-4 py-3 glass-input text-sm"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    className="w-full px-4 py-3 glass-input text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">
                  Corporate Employee ID
                </label>
                <input
                  type="text"
                  required
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="EMP001"
                  className="w-full px-4 py-3 glass-input text-sm uppercase"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 555-0199"
                    className="w-full pl-11 pr-4 py-3 glass-input text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Professional Assignment</h3>
                <p className="text-gray-400 text-xs font-medium">Link this employee profile to department structures.</p>
              </div>

              <div>
                <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">
                  Job Title
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Software Engineer"
                    className="w-full pl-11 pr-4 py-3 glass-input text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">
                  Department Assignment
                </label>
                <div className="relative">
                  <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    required
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full glass-input pl-11 pr-4 py-3 cursor-pointer"
                  >
                    <option value="">Select a Department...</option>
                    {deptData?.map((dept) => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">
                  Reporting Manager
                </label>
                <div className="relative">
                  <UserCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    value={managerId}
                    onChange={(e) => setManagerId(e.target.value)}
                    className="w-full glass-input pl-11 pr-4 py-3 cursor-pointer"
                  >
                    <option value="">No Direct Manager (Unassigned)</option>
                    {managerData?.map((mgr) => (
                      <option key={mgr._id} value={mgr._id}>
                        {mgr.firstName} {mgr.lastName} - {mgr.jobTitle}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Stepper Navigation Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-white/5">
            {step > 1 ? (
              <button
                type="button"
                onClick={prevStep}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/5 rounded-xl transition duration-200 text-sm font-semibold cursor-pointer select-none"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition duration-200 text-sm cursor-pointer shadow-lg hover:shadow-brand-500/25 select-none"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition duration-200 text-sm cursor-pointer shadow-lg hover:shadow-emerald-500/25 select-none disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Complete Onboarding'
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Onboard;
