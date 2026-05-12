import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Moon, Sun, Shield, Database, Bell, Globe, Key, Palette, Settings as SettingsIcon } from 'lucide-react';
import AccessControl from './AccessControl';

type Tab = 'access' | 'appearance' | 'security' | 'notifications' | 'backup';

export default function Settings() {
  const { isDark, toggleTheme } = useTheme();
  const { currentUser, hasPermission } = useAuth();
  const isAdmin = currentUser.role === 'Admin' || hasPermission('settings.access_control');
  const [activeTab, setActiveTab] = useState<Tab>(isAdmin ? 'access' : 'appearance');

  const tabs: { id: Tab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { id: 'access', label: 'Access Control', icon: <Key size={16} />, adminOnly: true },
    { id: 'appearance', label: 'Appearance', icon: <Palette size={16} /> },
    { id: 'security', label: 'Security & Compliance', icon: <Shield size={16} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
    { id: 'backup', label: 'Backup & Data', icon: <Database size={16} /> },
  ];

  const visibleTabs = tabs.filter(t => !t.adminOnly || isAdmin);

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <SettingsIcon size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">System Settings</h2>
              <p className="text-xs text-slate-500">Configure your DDIAS preferences and access controls</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <span className="text-[10px] uppercase text-slate-500">Logged in as</span>
            <span className="text-xs font-bold text-slate-900 dark:text-white">{currentUser.name}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              currentUser.role === 'Admin' ? 'bg-red-100 text-red-700' :
              currentUser.role === 'Custom' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'
            }`}>{currentUser.role}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-2 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'access' && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-400 text-amber-900 font-bold">ADMIN</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'access' && <AccessControl />}

      {activeTab === 'appearance' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 max-w-3xl">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Globe size={18} /> Appearance
          </h3>
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <div className="flex items-center gap-3">
              {isDark ? <Moon size={20} className="text-blue-400" /> : <Sun size={20} className="text-yellow-500" />}
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Dark Mode</p>
                <p className="text-xs text-slate-500">Toggle dark/light theme</p>
              </div>
            </div>
            <button onClick={toggleTheme} className={`relative w-12 h-6 rounded-full transition-colors ${isDark ? 'bg-blue-600' : 'bg-slate-300'}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isDark ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 max-w-3xl">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Shield size={18} /> Security & Compliance
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Role-Based Access Control', desc: 'Enforce role permissions for all modules', enabled: true },
              { label: 'Audit Log Immutability', desc: 'Prevent editing or deletion of audit logs', enabled: true },
              { label: 'Session Timeout (30 min)', desc: 'Auto-logout after inactivity', enabled: true },
              { label: 'Two-Factor Authentication', desc: 'Require 2FA for admin accounts', enabled: false },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </div>
                <div className={`w-10 h-5 rounded-full ${item.enabled ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'} relative`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow ${item.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 max-w-3xl">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Bell size={18} /> Notifications
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Low Stock Alerts', desc: 'Alert when stock falls below threshold' },
              { label: 'Near Expiry Alerts', desc: 'Alert for 90/60/30 day expiry warnings' },
              { label: 'Overdue Payments', desc: 'Alert for credit sales past due date' },
              { label: 'Unusual Stock Edits', desc: 'Flag suspicious inventory changes' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </div>
                <div className="w-10 h-5 rounded-full bg-green-500 relative">
                  <span className="absolute top-0.5 translate-x-5 w-4 h-4 rounded-full bg-white shadow" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'backup' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 max-w-3xl">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Database size={18} /> Backup & Data
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Auto Backup</p>
                <p className="text-xs text-slate-500">Daily automated backup at 2:00 AM</p>
              </div>
              <div className="w-10 h-5 rounded-full bg-green-500 relative">
                <span className="absolute top-0.5 translate-x-5 w-4 h-4 rounded-full bg-white shadow" />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Data Retention</p>
                <p className="text-xs text-slate-500">7 years data retention policy</p>
              </div>
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">7 Years</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">GST Configuration</p>
                <p className="text-xs text-slate-500">GSTIN: 27AABCD1234F1Z5</p>
              </div>
              <span className="text-sm font-medium text-green-600">Configured</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
