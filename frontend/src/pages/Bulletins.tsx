import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { 
  Megaphone, 
  Plus, 
  Trash2, 
  Calendar, 
  Info, 
  Send,
  Loader
} from 'lucide-react';

interface BulletinType {
  _id: string;
  title: string;
  content: string;
  priority: 'Low' | 'Medium' | 'High';
  expiryDate: string;
  createdBy: {
    email: string;
  };
  createdAt: string;
}

const Bulletins: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  // Form States
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [expiryDate, setExpiryDate] = useState('');

  // Alerts
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isAdminOrHR = user?.role === 'Admin' || user?.role === 'HR Manager';

  // 1. Fetch Bulletins
  const { data: bulletins, isLoading } = useQuery({
    queryKey: ['bulletins'],
    queryFn: async () => {
      const res = await api.get('/bulletins');
      return res.data?.data as BulletinType[];
    }
  });

  // 2. Publish Bulletin Mutation
  const createBulletinMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/bulletins', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bulletins'] });
      setSuccessMsg('Bulletin announcement published successfully!');
      setTitle('');
      setContent('');
      setPriority('Medium');
      setExpiryDate('');
      setModalOpen(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Failed to publish bulletin.');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  });

  // 3. Delete Bulletin Mutation
  const deleteBulletinMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/bulletins/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bulletins'] });
      setSuccessMsg('Announcement successfully removed.');
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Failed to remove bulletin.');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  });

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (new Date(expiryDate) <= new Date()) {
      setErrorMsg('Expiry date must be in the future');
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }
    createBulletinMutation.mutate({
      title,
      content,
      priority,
      expiryDate
    });
  };

  const formatLocalDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
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
            <Megaphone className="w-7 h-7 text-brand-400" /> Bulletin Board
          </h1>
          <p className="text-gray-400 text-xs mt-1">
            Global notices, system updates, and official corporate announcements.
          </p>
        </div>

        {isAdminOrHR && (
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl text-xs transition duration-200 flex items-center gap-1.5 cursor-pointer shadow-lg shadow-brand-500/10 border border-brand-400/20"
          >
            <Plus className="w-4 h-4" /> Publish Notice
          </button>
        )}
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm animate-fade-in">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in">
          {errorMsg}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-gray-500 font-semibold">
          Reading active bulletins...
        </div>
      ) : bulletins?.length === 0 ? (
        <div className="glass-card p-12 text-center border border-white/5 rounded-2xl">
          <Info className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <h3 className="text-white font-bold text-md">Quiet Period</h3>
          <p className="text-gray-400 text-xs mt-1">There are no active notices or announcements currently published.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bulletins?.map((bul) => (
            <div 
              key={bul._id}
              className={`glass-card p-6 rounded-2xl border relative flex flex-col justify-between transition-transform duration-300 hover:-translate-y-1 ${
                bul.priority === 'High' ? 'border-red-500/25 bg-red-950/5' :
                bul.priority === 'Medium' ? 'border-amber-500/20 bg-amber-950/5' :
                'border-white/5'
              }`}
            >
              <div>
                <div className="flex justify-between items-start gap-4 mb-3">
                  <div className="space-y-1">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                      bul.priority === 'High' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      bul.priority === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    }`}>
                      {bul.priority} Priority
                    </span>
                    <h3 className="text-lg font-bold text-white leading-snug">{bul.title}</h3>
                  </div>

                  {isAdminOrHR && (
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this bulletin notice?')) {
                          deleteBulletinMutation.mutate(bul._id);
                        }
                      }}
                      disabled={deleteBulletinMutation.isPending}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg border border-transparent hover:border-red-500/10 transition cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed mb-6">
                  {bul.content}
                </p>
              </div>

              <div className="flex items-center justify-between text-[11px] text-gray-400 font-semibold border-t border-white/5 pt-4">
                <span>By: {bul.createdBy?.email}</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-brand-400" /> Expires: {formatLocalDate(bul.expiryDate)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Publish Modal (Admin/HR only) */}
      {modalOpen && isAdminOrHR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          
          <div className="relative glass-card max-w-md w-full rounded-2xl p-6 md:p-8 border border-white/10 shadow-2xl z-10">
            <h3 className="text-lg font-bold text-white mb-2">Publish Corporate Notice</h3>
            <p className="text-gray-400 text-xs mb-6 font-medium">Broadcast announcements to the company bulletin feeds.</p>

            <form onSubmit={handlePublish} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">Notice Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Server Maintenance Notice"
                  className="form-input"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">Notice Content</label>
                <textarea
                  required
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Provide full announcement details..."
                  className="form-input resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">Priority</label>
                  <select
                    value={priority}
                    onChange={(e: any) => setPriority(e.target.value)}
                    className="form-input cursor-pointer"
                  >
                    <option value="Low" className="bg-slate-900 text-white">Low</option>
                    <option value="Medium" className="bg-slate-900 text-white">Medium</option>
                    <option value="High" className="bg-slate-900 text-white">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">Expiration Date</label>
                  <input
                    type="date"
                    required
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="form-input cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl text-xs transition cursor-pointer select-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createBulletinMutation.isPending}
                  className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-brand-500/10"
                >
                  {createBulletinMutation.isPending ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Publish
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

export default Bulletins;
