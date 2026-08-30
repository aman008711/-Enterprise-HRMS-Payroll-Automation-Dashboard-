import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { 
  Clock, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Loader, 
  History, 
  Users,
  Compass,
  Laptop
} from 'lucide-react';

interface AttendanceRecord {
  _id: string;
  employee: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    jobTitle: string;
  };
  dateString: string;
  clockIn?: string;
  clockOut?: string;
  status: 'On Time' | 'Late' | 'Half Day' | 'Absent';
  clockInLat?: number;
  clockInLon?: number;
  clockInIp?: string;
  clockOutIp?: string;
  createdAt: string;
}

const Attendance: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'my-logs' | 'team-logs'>('my-logs');
  
  // Geolocation states
  const [mockLocation, setMockLocation] = useState(true); // Default to true to make local testing pass geofence
  const [lat, setLat] = useState<number | null>(37.7749);
  const [lon, setLon] = useState<number | null>( -122.4194);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Alerts
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isAdminOrHR = user?.role === 'Admin' || user?.role === 'HR Manager';

  // 1. Live Digital Clock Timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Geolocation tracking hook
  useEffect(() => {
    if (mockLocation) {
      setLat(37.7749); // San Francisco mock office coords
      setLon(-122.4194);
      setGeoError(null);
    } else {
      if (!navigator.geolocation) {
        setGeoError('Geolocation is not supported by your browser');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLon(pos.coords.longitude);
          setGeoError(null);
        },
        (err) => {
          setGeoError(`Unable to retrieve location: ${err.message}`);
        }
      );
    }
  }, [mockLocation]);

  // 3. Query today's clock status
  const { data: todayStatus, isLoading: loadingToday } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: async () => {
      const res = await api.get('/attendance/today');
      return res.data?.data as AttendanceRecord | null;
    }
  });

  // 4. Query history logs (Employee's own)
  const { data: myLogs, isLoading: loadingMyLogs } = useQuery({
    queryKey: ['attendance-my-logs'],
    queryFn: async () => {
      const res = await api.get('/attendance/my-logs');
      return res.data?.data as AttendanceRecord[];
    }
  });

  // 5. Query all historical logs (Admin/HR Manager only)
  const { data: allLogs, isLoading: loadingAllLogs } = useQuery({
    queryKey: ['attendance-all-logs'],
    queryFn: async () => {
      const res = await api.get('/attendance/all');
      return res.data?.data as AttendanceRecord[];
    },
    enabled: isAdminOrHR
  });

  // 6. Clock In Mutation
  const clockInMutation = useMutation({
    mutationFn: async (coords: { latitude?: number; longitude?: number }) => {
      const res = await api.post('/attendance/clock-in', coords);
      return res.data;
    },
    onSuccess: (resData) => {
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-my-logs'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-all-logs'] });
      setSuccessMsg(`Successfully Clocked In! Status: ${resData?.data?.status}`);
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Failed to Clock In');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  });

  // 7. Clock Out Mutation
  const clockOutMutation = useMutation({
    mutationFn: async (coords: { latitude?: number; longitude?: number }) => {
      const res = await api.post('/attendance/clock-out', coords);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-my-logs'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-all-logs'] });
      setSuccessMsg('Successfully Clocked Out! Good work today.');
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Failed to Clock Out');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  });

  const handleClockIn = () => {
    if (lat === null || lon === null) {
      setErrorMsg('Cannot Clock In: Location coords missing');
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }
    clockInMutation.mutate({ latitude: lat, longitude: lon });
  };

  const handleClockOut = () => {
    clockOutMutation.mutate({ latitude: lat || undefined, longitude: lon || undefined });
  };

  const formatTimeStr = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatDateStr = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Alerts */}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Card 1: Clock-In & Clock-Out Widget Control */}
        <div className="lg:col-span-1 glass-card p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Attendance Control</span>
            <div className="text-center py-6 bg-white/2 border border-white/5 rounded-2xl">
              <Clock className="w-8 h-8 text-brand-400 mx-auto mb-2 animate-pulse" />
              <span className="block text-3xl font-black text-white tracking-widest">{formatTimeStr(currentTime)}</span>
              <span className="block text-xs text-gray-400 font-semibold mt-1">{formatDateStr(currentTime)}</span>
            </div>

            {/* Geofencing feedback panel */}
            <div className="p-4 rounded-xl bg-white/1 border border-white/5 space-y-2 text-xs">
              <div className="flex items-center justify-between font-semibold">
                <span className="text-gray-400">Status geofence:</span>
                {mockLocation ? (
                  <span className="text-emerald-400 flex items-center gap-1"><Compass className="w-3.5 h-3.5" /> geofence verified</span>
                ) : geoError ? (
                  <span className="text-red-400 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {geoError}</span>
                ) : lat ? (
                  <span className="text-brand-400 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> coords mapped</span>
                ) : (
                  <span className="text-gray-500 flex items-center gap-1"><Loader className="w-3.5 h-3.5 animate-spin" /> mapping location</span>
                )}
              </div>
              <div className="flex items-center justify-between text-gray-400">
                <span>Latitude:</span>
                <span className="text-white font-mono">{lat ? lat.toFixed(4) : '--'}</span>
              </div>
              <div className="flex items-center justify-between text-gray-400">
                <span>Longitude:</span>
                <span className="text-white font-mono">{lon ? lon.toFixed(4) : '--'}</span>
              </div>

              {/* Geofence Mocking toggle (For local demo testing) */}
              <label className="flex items-center gap-2 pt-2 border-t border-white/5 cursor-pointer text-[10px] text-brand-400 font-bold uppercase select-none">
                <input
                  type="checkbox"
                  checked={mockLocation}
                  onChange={(e) => setMockLocation(e.target.checked)}
                  className="rounded border-white/10 bg-white/5 text-brand-600 focus:ring-brand-500"
                />
                Mock Office Geofence Range
              </label>
            </div>
          </div>

          <div className="pt-6">
            {loadingToday ? (
              <button disabled className="w-full py-3.5 bg-white/5 text-gray-400 font-bold rounded-xl text-sm flex items-center justify-center gap-2 border border-white/5">
                <Loader className="w-4 h-4 animate-spin" /> Verifying status...
              </button>
            ) : !todayStatus ? (
              // Case A: Not clocked in yet today
              <button
                onClick={handleClockIn}
                disabled={clockInMutation.isPending}
                className="w-full py-3.5 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl text-sm transition duration-200 cursor-pointer shadow-lg hover:shadow-brand-500/25 flex items-center justify-center gap-2 select-none"
              >
                {clockInMutation.isPending ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" /> Checking in...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" /> Clock In (Shift Entry)
                  </>
                )}
              </button>
            ) : !todayStatus.clockOut ? (
              // Case B: Clocked in but not clocked out
              <div className="space-y-3">
                <div className="p-3 bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold rounded-xl text-center">
                  Logged Entry at {formatDateTime(todayStatus.clockIn!)} ({todayStatus.status})
                </div>
                <button
                  onClick={handleClockOut}
                  disabled={clockOutMutation.isPending}
                  className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm transition duration-200 cursor-pointer shadow-lg hover:shadow-red-500/25 flex items-center justify-center gap-2 select-none"
                >
                  {clockOutMutation.isPending ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" /> Checking out...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" /> Clock Out (Shift Exit)
                    </>
                  )}
                </button>
              </div>
            ) : (
              // Case C: Fully checked in and out today
              <div className="space-y-2">
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl text-center flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Daily Shift Completed
                </div>
                <div className="text-[10px] text-gray-400 text-center font-semibold uppercase tracking-wider">
                  In: {formatDateTime(todayStatus.clockIn!)} | Out: {formatDateTime(todayStatus.clockOut!)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card 2 & 3: Logs lists and Team tables */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs selectors headers */}
          <div className="flex border-b border-white/10 select-none">
            <button
              onClick={() => setActiveTab('my-logs')}
              className={`px-5 py-3 text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'my-logs' 
                  ? 'border-brand-500 text-white' 
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <History className="w-4 h-4" />
              My Attendance Logs
            </button>

            {isAdminOrHR && (
              <button
                onClick={() => setActiveTab('team-logs')}
                className={`px-5 py-3 text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
                  activeTab === 'team-logs' 
                    ? 'border-brand-500 text-white' 
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" />
                Team Roster Logs
              </button>
            )}
          </div>

          {/* Tab 1: Personal Attendance History */}
          {activeTab === 'my-logs' && (
            <div className="glass-card rounded-2xl p-6 border border-white/5 shadow-xl">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/2">
                      <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Clock In</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Clock Out</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Check-in IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {loadingMyLogs ? (
                      Array.from({ length: 4 }).map((_, idx) => (
                        <tr key={idx} className="animate-pulse">
                          <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-24" /></td>
                          <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                          <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                          <td className="px-6 py-4"><div className="h-6 bg-white/5 rounded w-16" /></td>
                          <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-20" /></td>
                        </tr>
                      ))
                    ) : !myLogs || myLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-16 text-center text-gray-400 text-sm">
                          No attendance logs recorded yet.
                        </td>
                      </tr>
                    ) : (
                      myLogs.map((log) => (
                        <tr key={log._id} className="bg-white/0 hover:bg-white/2 transition">
                          <td className="px-6 py-4 text-sm font-semibold text-white">
                            {log.dateString}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-300 font-semibold">
                            {log.clockIn ? formatDateTime(log.clockIn) : '--'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-300 font-semibold">
                            {log.clockOut ? formatDateTime(log.clockOut) : '--'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                              log.status === 'On Time' 
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                                : log.status === 'Late'
                                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                : 'bg-red-500/15 text-red-400 border-red-500/30'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs font-mono text-gray-400">
                            <span className="flex items-center gap-1.5"><Laptop className="w-3.5 h-3.5" /> {log.clockInIp || '127.0.0.1'}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2: Team Attendance Logs (Managers only) */}
          {activeTab === 'team-logs' && isAdminOrHR && (
            <div className="glass-card rounded-2xl p-6 border border-white/5 shadow-xl animate-fade-in">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/2">
                      <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Clock In</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Clock Out</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {loadingAllLogs ? (
                      Array.from({ length: 4 }).map((_, idx) => (
                        <tr key={idx} className="animate-pulse">
                          <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-28" /></td>
                          <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-20" /></td>
                          <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                          <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                          <td className="px-6 py-4"><div className="h-6 bg-white/5 rounded w-16" /></td>
                        </tr>
                      ))
                    ) : !allLogs || allLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-16 text-center text-gray-400 text-sm">
                          No roster logs recorded.
                        </td>
                      </tr>
                    ) : (
                      allLogs.map((log) => (
                        <tr key={log._id} className="bg-white/0 hover:bg-white/2 transition">
                          <td className="px-6 py-4 text-sm font-semibold text-white">
                            <span className="block">{log.employee?.firstName} {log.employee?.lastName}</span>
                            <span className="block text-[10px] text-gray-400 font-medium tracking-wider">{log.employee?.employeeId}</span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-300 font-semibold">
                            {log.dateString}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-300 font-semibold">
                            {log.clockIn ? formatDateTime(log.clockIn) : '--'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-300 font-semibold">
                            {log.clockOut ? formatDateTime(log.clockOut) : '--'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                              log.status === 'On Time' 
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                                : log.status === 'Late'
                                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                : 'bg-red-500/15 text-red-400 border-red-500/30'
                            }`}>
                              {log.status}
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
        </div>
      </div>
    </div>
  );
};

export default Attendance;
