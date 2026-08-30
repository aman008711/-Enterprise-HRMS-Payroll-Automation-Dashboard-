import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Save, 
  Loader, 
  CheckCircle, 
  AlertCircle,
  Clock,
  User,
  FileText
} from 'lucide-react';

interface EmployeeType {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
}

interface ShiftItem {
  _id: string;
  employee: any; // populated employee
  title: string;
  startTime: string;
  endTime: string;
  notes?: string;
  color: string;
}

const colorStyles: Record<string, { bg: string; text: string; border: string; label: string }> = {
  indigo: { bg: 'bg-indigo-500/15', text: 'text-indigo-400', border: 'border-indigo-500/25', label: 'Indigo' },
  emerald: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/25', label: 'Emerald' },
  amber: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/25', label: 'Amber' },
  rose: { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/25', label: 'Rose' }
};

const Schedule: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdminOrHR = user?.role === 'Admin' || user?.role === 'HR Manager';

  // Selected week reference date
  const [currentDate, setCurrentDate] = useState(new Date());

  // Modal Dialog States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);

  // Form Fields
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [shiftTitle, setShiftTitle] = useState('Morning Shift');
  const [startTimeStr, setStartTimeStr] = useState('09:00');
  const [endTimeStr, setEndTimeStr] = useState('17:00');
  const [shiftNotes, setShiftNotes] = useState('');
  const [shiftColor, setShiftColor] = useState('indigo');

  // Banner status hooks
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Monday-Sunday date generator
  const getWeekDays = (refDate: Date) => {
    const temp = new Date(refDate);
    const day = temp.getDay();
    const diff = temp.getDate() - day + (day === 0 ? -6 : 1); // Monday adjustment
    const monday = new Date(temp.setDate(diff));

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      d.setHours(0, 0, 0, 0);
      days.push(d);
    }
    return days;
  };

  const weekDays = getWeekDays(currentDate);
  const startOfWeek = weekDays[0];
  const endOfWeek = new Date(weekDays[6]);
  endOfWeek.setHours(23, 59, 59, 999);

  // 1. Query Employees list (rows)
  const { data: employees, isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees-list-schedule'],
    queryFn: async () => {
      const res = await api.get('/employees');
      return res.data?.data as EmployeeType[];
    }
  });

  // 2. Query Shifts inside the current week range
  const { data: shifts, isLoading: loadingShifts } = useQuery({
    queryKey: ['shifts', startOfWeek.toISOString(), endOfWeek.toISOString()],
    queryFn: async () => {
      const res = await api.get('/shifts', {
        params: {
          startDate: startOfWeek.toISOString(),
          endDate: endOfWeek.toISOString()
        }
      });
      return res.data?.data as ShiftItem[];
    }
  });

  // Mutation: Create Shift
  const createShiftMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/shifts', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      setSuccessMsg('Shift scheduled successfully!');
      setIsModalOpen(false);
      resetForm();
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Failed to schedule shift');
      setTimeout(() => setErrorMsg(null), 6000);
    }
  });

  // Mutation: Update Shift
  const updateShiftMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await api.put(`/shifts/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      setSuccessMsg('Shift updated successfully!');
      setIsModalOpen(false);
      resetForm();
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Failed to update shift');
      setTimeout(() => setErrorMsg(null), 6000);
    }
  });

  // Mutation: Delete Shift
  const deleteShiftMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/shifts/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      setSuccessMsg('Shift cancelled successfully!');
      setIsModalOpen(false);
      resetForm();
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Failed to cancel shift');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  });

  const resetForm = () => {
    setSelectedEmployeeId('');
    setSelectedDateStr('');
    setShiftTitle('Morning Shift');
    setStartTimeStr('09:00');
    setEndTimeStr('17:00');
    setShiftNotes('');
    setShiftColor('indigo');
    setActiveShiftId(null);
  };

  const handlePrevWeek = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 7);
    setCurrentDate(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 7);
    setCurrentDate(next);
  };

  const handleCellClick = (employeeId: string, date: Date) => {
    if (!isAdminOrHR) return; // Standard employees cannot schedule
    resetForm();
    setSelectedEmployeeId(employeeId);
    
    // Format YYYY-MM-DD
    const dateStr = date.toISOString().split('T')[0];
    setSelectedDateStr(dateStr);
    
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleShiftCardClick = (e: React.MouseEvent, shift: ShiftItem) => {
    e.stopPropagation(); // Stop trigger cell click
    if (!isAdminOrHR) return; // Standard employee read-only

    setActiveShiftId(shift._id);
    setSelectedEmployeeId(typeof shift.employee === 'object' ? shift.employee._id : shift.employee);
    
    const sDate = new Date(shift.startTime);
    const eDate = new Date(shift.endTime);
    
    setSelectedDateStr(sDate.toISOString().split('T')[0]);
    
    const pad = (n: number) => String(n).padStart(2, '0');
    setStartTimeStr(`${pad(sDate.getHours())}:${pad(sDate.getMinutes())}`);
    setEndTimeStr(`${pad(eDate.getHours())}:${pad(eDate.getMinutes())}`);
    setShiftTitle(shift.title);
    setShiftNotes(shift.notes || '');
    setShiftColor(shift.color || 'indigo');
    
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Compile Date ISO Strings
    const startIso = new Date(`${selectedDateStr}T${startTimeStr}:00`).toISOString();
    const endIso = new Date(`${selectedDateStr}T${endTimeStr}:00`).toISOString();

    const payload = {
      employeeId: selectedEmployeeId,
      title: shiftTitle,
      startTime: startIso,
      endTime: endIso,
      notes: shiftNotes,
      color: shiftColor
    };

    if (modalMode === 'create') {
      createShiftMutation.mutate(payload);
    } else if (modalMode === 'edit' && activeShiftId) {
      updateShiftMutation.mutate({ id: activeShiftId, payload });
    }
  };

  const handleDeleteShift = () => {
    if (activeShiftId && window.confirm('Are you sure you want to cancel and delete this scheduled shift?')) {
      deleteShiftMutation.mutate(activeShiftId);
    }
  };

  // Drag and Drop Logic
  const handleDragStart = (e: React.DragEvent, shiftId: string) => {
    if (!isAdminOrHR) return;
    e.dataTransfer.setData('text/plain', shiftId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetEmployeeId: string, targetDate: Date) => {
    e.preventDefault();
    if (!isAdminOrHR) return;

    const shiftId = e.dataTransfer.getData('text/plain');
    if (!shiftId) return;

    // Find original shift info
    const shift = shifts?.find(s => s._id === shiftId);
    if (!shift) return;

    const origStart = new Date(shift.startTime);
    const origEnd = new Date(shift.endTime);

    // Calculate shift duration in milliseconds
    const durationMs = origEnd.getTime() - origStart.getTime();

    // Compose new start date keeping hours/minutes from original
    const newStart = new Date(targetDate);
    newStart.setHours(origStart.getHours(), origStart.getMinutes(), 0, 0);

    const newEnd = new Date(newStart.getTime() + durationMs);

    updateShiftMutation.mutate({
      id: shiftId,
      payload: {
        employeeId: targetEmployeeId,
        title: shift.title,
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString(),
        notes: shift.notes,
        color: shift.color
      }
    });
  };

  // Render Helper: Filters shifts for an employee on a specific date
  const getShiftsForCell = (empId: string, date: Date) => {
    if (!shifts) return [];
    
    return shifts.filter(s => {
      const sEmployeeId = typeof s.employee === 'object' ? s.employee._id : s.employee;
      if (sEmployeeId !== empId) return false;

      const sDate = new Date(s.startTime);
      return (
        sDate.getFullYear() === date.getFullYear() &&
        sDate.getMonth() === date.getMonth() &&
        sDate.getDate() === date.getDate()
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between select-none">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-7 h-7 text-brand-400" />
          <h1 className="text-2xl font-black text-white tracking-tight">Shift Scheduling Planner</h1>
        </div>

        {/* Date paginator */}
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-1">
          <button
            onClick={handlePrevWeek}
            className="p-1.5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <span className="text-xs font-bold text-gray-300 px-2 min-w-50 text-center">
            {startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>

          <button
            onClick={handleNextWeek}
            className="p-1.5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg transition cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
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

      {/* Main Roster Grid */}
      <div className="glass-card rounded-2xl border border-white/5 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 select-none">
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider min-w-50">
                  Employee
                </th>
                
                {weekDays.map((date, idx) => {
                  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                  const dayNum = date.getDate();
                  const isToday = new Date().toDateString() === date.toDateString();

                  return (
                    <th 
                      key={idx} 
                      className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider min-w-32.5 border-l border-white/5 ${
                        isToday ? 'bg-brand-500/10 text-brand-400' : 'text-gray-300'
                      }`}
                    >
                      <div>{dayName}</div>
                      <div className={`text-lg mt-0.5 inline-block w-8 h-8 leading-8 rounded-full ${
                        isToday ? 'bg-brand-500 text-white font-extrabold shadow-lg shadow-brand-500/20' : 'text-gray-400'
                      }`}>
                        {dayNum}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {loadingEmployees || loadingShifts ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    <Loader className="w-6 h-6 animate-spin text-brand-500 mx-auto" />
                  </td>
                </tr>
              ) : employees && employees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500 font-semibold">
                    No active employees registered. Onboard staff to create shifts.
                  </td>
                </tr>
              ) : (
                employees?.map((emp) => (
                  <tr key={emp._id} className="hover:bg-white/2 transition">
                    {/* Employee Profile Cell */}
                    <td className="px-6 py-4">
                      <div className="font-bold text-white text-sm">{emp.firstName} {emp.lastName}</div>
                      <div className="text-xs text-gray-400 font-medium mt-0.5">{emp.jobTitle}</div>
                    </td>

                    {/* Weekday Schedule Cells */}
                    {weekDays.map((date, idx) => {
                      const cellShifts = getShiftsForCell(emp._id, date);
                      const isToday = new Date().toDateString() === date.toDateString();

                      return (
                        <td
                          key={idx}
                          onClick={() => handleCellClick(emp._id, date)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => handleDrop(e, emp._id, date)}
                          className={`p-2 border-l border-white/5 min-h-22.5 h-full align-top transition-colors relative group ${
                            isToday ? 'bg-brand-500/1' : ''
                          } ${isAdminOrHR ? 'cursor-plus' : ''}`}
                        >
                          <div className="space-y-1.5 min-h-17.5 flex flex-col justify-start">
                            {cellShifts.map((shift) => {
                              const sTime = new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                              const eTime = new Date(shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                              const colorStyle = colorStyles[shift.color] || colorStyles.indigo;

                              return (
                                <div
                                  key={shift._id}
                                  draggable={isAdminOrHR}
                                  onDragStart={(e) => handleDragStart(e, shift._id)}
                                  onClick={(e) => handleShiftCardClick(e, shift)}
                                  className={`p-2 rounded-xl border ${colorStyle.bg} ${colorStyle.text} ${colorStyle.border} text-left transition select-none flex flex-col justify-between cursor-pointer hover:scale-[1.02] active:scale-[0.98] shadow-md`}
                                >
                                  <div className="font-extrabold text-[10px] tracking-wide uppercase truncate leading-tight">
                                    {shift.title}
                                  </div>
                                  <div className="flex items-center gap-1 text-[9.5px] font-bold mt-1 opacity-90">
                                    <Clock className="w-3 h-3 shrink-0" />
                                    {sTime} - {eTime}
                                  </div>
                                  {shift.notes && (
                                    <div className="text-[8px] opacity-75 truncate mt-0.5">
                                      {shift.notes}
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {/* Hover Plus Button for planning addition */}
                            {isAdminOrHR && cellShifts.length === 0 && (
                              <button className="absolute inset-0 m-auto w-7 h-7 flex items-center justify-center bg-brand-500/10 hover:bg-brand-500 hover:text-white text-brand-400 rounded-full border border-brand-500/20 opacity-0 group-hover:opacity-100 transition duration-150 shadow-md">
                                <Plus className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Shift / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 z-50 animate-fade-in">
          <div className="glass-card rounded-2xl w-full max-w-md p-6 md:p-8 border border-white/10 shadow-2xl space-y-6 relative">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-brand-400" />
              {modalMode === 'create' ? 'Schedule Shift Assignment' : 'Modify Shift Assignment'}
            </h2>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              
              {/* Employee Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> Employee
                </label>
                <select
                  required
                  disabled={modalMode === 'edit'}
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="form-input"
                >
                  <option value="" disabled className="bg-slate-900 text-gray-500">Select staff member...</option>
                  {employees?.map((emp) => (
                    <option key={emp._id} value={emp._id} className="bg-slate-900 text-white">
                      {emp.firstName} {emp.lastName} ({emp.jobTitle})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <CalendarIcon className="w-3.5 h-3.5" /> Date
                </label>
                <input
                  type="date"
                  required
                  value={selectedDateStr}
                  onChange={(e) => setSelectedDateStr(e.target.value)}
                  className="form-input"
                />
              </div>

              {/* Shift Title Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Shift Title Category</label>
                <select
                  value={shiftTitle}
                  onChange={(e) => setShiftTitle(e.target.value)}
                  className="form-input"
                >
                  <option value="Morning Shift" className="bg-slate-900 text-white">Morning Shift (e.g. 09:00 - 17:00)</option>
                  <option value="Afternoon Shift" className="bg-slate-900 text-white">Afternoon Shift (e.g. 13:00 - 21:00)</option>
                  <option value="Night Shift" className="bg-slate-900 text-white">Night Shift (e.g. 21:00 - 05:00)</option>
                  <option value="Weekend Support" className="bg-slate-900 text-white">Weekend Support (e.g. 10:00 - 18:00)</option>
                  <option value="Custom Assignment" className="bg-slate-900 text-white">Custom Assignment...</option>
                </select>
              </div>

              {/* Start & End Hours */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Start Hour
                  </label>
                  <input
                    type="time"
                    required
                    value={startTimeStr}
                    onChange={(e) => setStartTimeStr(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> End Hour
                  </label>
                  <input
                    type="time"
                    required
                    value={endTimeStr}
                    onChange={(e) => setEndTimeStr(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Color Categories */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Display Color Tag</label>
                <div className="flex gap-3 select-none pt-1">
                  {Object.keys(colorStyles).map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setShiftColor(color)}
                      className={`w-7 h-7 rounded-full border-2 transition hover:scale-110 cursor-pointer ${
                        color === 'indigo' ? 'bg-indigo-500' : ''
                      } ${
                        color === 'emerald' ? 'bg-emerald-500' : ''
                      } ${
                        color === 'amber' ? 'bg-amber-500' : ''
                      } ${
                        color === 'rose' ? 'bg-rose-500' : ''
                      } ${
                        shiftColor === color ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      title={colorStyles[color].label}
                    />
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> Notes
                </label>
                <input
                  type="text"
                  value={shiftNotes}
                  onChange={(e) => setShiftNotes(e.target.value)}
                  placeholder="Task instructions..."
                  className="form-input"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between gap-3 pt-6 border-t border-white/5">
                <div>
                  {modalMode === 'edit' && (
                    <button
                      type="button"
                      onClick={handleDeleteShift}
                      disabled={deleteShiftMutation.isPending}
                      className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white font-bold rounded-xl text-xs transition duration-200 flex items-center gap-1.5 cursor-pointer select-none"
                    >
                      {deleteShiftMutation.isPending ? (
                        <Loader className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      Cancel Shift
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl text-xs transition cursor-pointer select-none"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={createShiftMutation.isPending || updateShiftMutation.isPending}
                    className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl text-xs transition duration-200 flex items-center gap-1.5 cursor-pointer select-none"
                  >
                    {createShiftMutation.isPending || updateShiftMutation.isPending ? (
                      <Loader className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    {modalMode === 'create' ? 'Schedule Shift' : 'Save Changes'}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedule;
