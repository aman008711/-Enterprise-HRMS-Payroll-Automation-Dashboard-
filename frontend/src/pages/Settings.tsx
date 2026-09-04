import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../utils/api';
import { 
  Settings as SettingsIcon, 
  Mail, 
  Hash, 
  MessageSquare, 
  Send, 
  Save, 
  Loader, 
  CheckCircle, 
  AlertCircle,
  Palette,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface SettingsData {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  fromEmail: string;
  fromName: string;
  discordWebhookUrl: string;
  slackWebhookUrl: string;
}

const Settings: React.FC = () => {
  // Form State
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(2525);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState('');
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');

  // UI Feedback Statuses
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Theme state
  const { theme, resolvedTheme, setTheme } = useTheme();

  // Tab State
  const [activeTab, setActiveTab] = useState<'appearance' | 'smtp' | 'webhooks'>('appearance');

  // 1. Fetch current settings configuration
  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await api.get('/settings');
      return res.data?.data as SettingsData;
    }
  });

  // Populate form fields once data is loaded
  useEffect(() => {
    if (data) {
      setSmtpHost(data.smtpHost || '');
      setSmtpPort(data.smtpPort || 2525);
      setSmtpUser(data.smtpUser || '');
      setSmtpPass(data.smtpPass || '');
      setFromEmail(data.fromEmail || 'noreply@company.com');
      setFromName(data.fromName || 'Enterprise HRMS');
      setDiscordWebhookUrl(data.discordWebhookUrl || '');
      setSlackWebhookUrl(data.slackWebhookUrl || '');
    }
  }, [data]);

  // 2. Save settings Mutation
  const saveMutation = useMutation({
    mutationFn: async (updatedConfig: SettingsData) => {
      const res = await api.post('/settings', updatedConfig);
      return res.data;
    },
    onSuccess: () => {
      setSuccessMsg('System Integration settings saved successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Failed to save configuration settings');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  });

  // 3. Test Email Mutation
  const testEmailMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/settings/test-email', {
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPass,
        fromEmail,
        fromName
      });
      return res.data;
    },
    onSuccess: (resData) => {
      setSuccessMsg(resData.message || 'Test email dispatched successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'SMTP Test Connection Failed');
      setTimeout(() => setErrorMsg(null), 5000);
    }
  });

  // 4. Test Webhooks Mutation
  const testChatMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/settings/test-chat', {
        discordWebhookUrl,
        slackWebhookUrl
      });
      return res.data;
    },
    onSuccess: (resData) => {
      setSuccessMsg(`Test Chat Integration completed. Discord: ${resData.discordStatus}. Slack: ${resData.slackStatus}.`);
      setTimeout(() => setSuccessMsg(null), 5000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Chat Webhook Connection Failed');
      setTimeout(() => setErrorMsg(null), 5000);
    }
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      fromEmail,
      fromName,
      discordWebhookUrl,
      slackWebhookUrl
    });
  };

  const handleTestEmail = () => {
    testEmailMutation.mutate();
  };

  const handleTestChat = () => {
    testChatMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center gap-3 select-none">
        <SettingsIcon className="w-7 h-7 text-brand-400" />
        <h1 className="text-2xl font-black tracking-tight text-white">System Integrations & Settings</h1>
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
      <div className="flex border-b border-surface-border select-none">
        <button
          type="button"
          onClick={() => setActiveTab('appearance')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'appearance' 
              ? 'border-brand-500 text-brand-400' 
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <Palette className="w-4 h-4" />
          Appearance & Theme
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('smtp')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'smtp' 
              ? 'border-brand-500 text-brand-400' 
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <Mail className="w-4 h-4" />
          SMTP Mail Server
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('webhooks')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'webhooks' 
              ? 'border-brand-500 text-brand-400' 
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Chat Webhooks (Discord / Slack)
        </button>
      </div>

      <div className="glass-card rounded-2xl p-6 md:p-8 border border-surface-border shadow-xl space-y-6">
        {activeTab === 'appearance' ? (
          /* SECTION 0: Appearance & Theme Settings */
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white pb-1">Visual Theme & Display Preferences</h2>
              <p className="text-xs text-zinc-400">
                Choose how Enterprise HRMS looks on your device. Themes dynamically adjust backgrounds, high-contrast borders, and executive card styling.
              </p>
            </div>

            {/* Theme Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Dark Theme Card */}
              <div
                onClick={() => setTheme('dark')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  theme === 'dark'
                    ? 'border-brand-500 bg-brand-500/10 shadow-lg shadow-brand-500/10'
                    : 'border-surface-border bg-surface-card hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-indigo-950/60 text-indigo-400 border border-indigo-800/40">
                      <Moon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-white">Dark Mode</span>
                  </div>
                  {theme === 'dark' && (
                    <span className="px-2 py-0.5 rounded-full bg-brand-500 text-white text-[10px] font-bold">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Deep obsidian and slate enterprise palette designed for low-glare productivity and sleek high contrast.
                </p>
                <div className="mt-4 pt-3 border-t border-surface-border flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#090a0f] border border-zinc-700" />
                  <span className="w-3 h-3 rounded-full bg-[#11131a] border border-zinc-700" />
                  <span className="w-3 h-3 rounded-full bg-indigo-600" />
                  <span className="text-[10px] text-zinc-500 ml-auto font-mono">#090a0f • #11131a</span>
                </div>
              </div>

              {/* Light Theme Card */}
              <div
                onClick={() => setTheme('light')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  theme === 'light'
                    ? 'border-brand-500 bg-brand-500/10 shadow-lg shadow-brand-500/10'
                    : 'border-surface-border bg-surface-card hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      <Sun className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-white">Light Mode</span>
                  </div>
                  {theme === 'light' && (
                    <span className="px-2 py-0.5 rounded-full bg-brand-500 text-white text-[10px] font-bold">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Clean alabaster backgrounds with crisp slate borders and high-readability executive typography.
                </p>
                <div className="mt-4 pt-3 border-t border-surface-border flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#f4f6fb] border border-zinc-300" />
                  <span className="w-3 h-3 rounded-full bg-white border border-zinc-300" />
                  <span className="w-3 h-3 rounded-full bg-indigo-600" />
                  <span className="text-[10px] text-zinc-500 ml-auto font-mono">#f4f6fb • #ffffff</span>
                </div>
              </div>

              {/* System Sync Card */}
              <div
                onClick={() => setTheme('system')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  theme === 'system'
                    ? 'border-brand-500 bg-brand-500/10 shadow-lg shadow-brand-500/10'
                    : 'border-surface-border bg-surface-card hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Monitor className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-white">System Auto</span>
                  </div>
                  {theme === 'system' && (
                    <span className="px-2 py-0.5 rounded-full bg-brand-500 text-white text-[10px] font-bold">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Automatically harmonizes with your operating system's light or dark mode preference in real-time.
                </p>
                <div className="mt-4 pt-3 border-t border-surface-border flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400 font-medium">Currently resolved to:</span>
                  <span className="text-[10px] font-bold text-indigo-400 uppercase font-mono">{resolvedTheme}</span>
                </div>
              </div>
            </div>

            {/* Current Active Status Banner */}
            <div className="p-4 rounded-xl bg-surface-card border border-surface-border flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-zinc-300 font-medium">
                  Preference persisted: Theme changes apply instantly and save automatically to your local browser profile.
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-surface-border font-mono text-[11px] text-indigo-400">
                Mode: {theme.toUpperCase()} ({resolvedTheme})
              </span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
        
        {activeTab === 'smtp' ? (
          /* SECTION 1: SMTP Settings */
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-white border-b border-white/5 pb-2">SMTP Mail Configuration</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">SMTP Host</label>
                <input
                  type="text"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="e.g. smtp.mailtrap.io"
                  className="form-input"
                />
              </div>

              <div className="space-y-2 col-span-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">SMTP Port</label>
                <input
                  type="number"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(parseInt(e.target.value, 10))}
                  placeholder="e.g. 587 or 2525"
                  className="form-input"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">From Sender Name</label>
                <input
                  type="text"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  placeholder="e.g. Enterprise HRMS"
                  className="form-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">SMTP Username</label>
                <input
                  type="text"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder="SMTP User account ID"
                  className="form-input"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">SMTP Password</label>
                <input
                  type="password"
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  placeholder="••••••••••••••"
                  className="form-input"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">From Sender Email</label>
                <input
                  type="email"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  placeholder="e.g. noreply@company.com"
                  className="form-input"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={handleTestEmail}
                disabled={testEmailMutation.isPending}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-brand-400 border border-brand-500/25 hover:border-brand-500/50 font-bold rounded-xl text-xs transition duration-200 flex items-center gap-2 cursor-pointer select-none"
              >
                {testEmailMutation.isPending ? (
                  <>
                    <Loader className="w-3.5 h-3.5 animate-spin" /> Verifying Connection...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" /> Send Test Email
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* SECTION 2: Webhooks Settings */
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-white border-b border-white/5 pb-2">Chat Webhooks Configurations</h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" /> Discord Webhook URL
                </label>
                <input
                  type="text"
                  value={discordWebhookUrl}
                  onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="form-input"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> Slack Webhook URL
                </label>
                <input
                  type="text"
                  value={slackWebhookUrl}
                  onChange={(e) => setSlackWebhookUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                  className="form-input"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={handleTestChat}
                disabled={testChatMutation.isPending}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-brand-400 border border-brand-500/25 hover:border-brand-500/50 font-bold rounded-xl text-xs transition duration-200 flex items-center gap-2 cursor-pointer select-none"
              >
                {testChatMutation.isPending ? (
                  <>
                    <Loader className="w-3.5 h-3.5 animate-spin" /> Verifying Connection...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" /> Send Test Chat Alert
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Global Save Button */}
        <div className="flex justify-end pt-6 border-t border-white/5">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl text-sm transition duration-200 flex items-center gap-2 shadow-lg hover:shadow-brand-500/25 cursor-pointer select-none"
          >
            {saveMutation.isPending ? (
              <>
                <Loader className="w-4 h-4 animate-spin" /> Saving Configuration...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Integration Settings
              </>
            )}
          </button>
        </div>
      </form>
    )}
      </div>
    </div>
  );
};

export default Settings;
