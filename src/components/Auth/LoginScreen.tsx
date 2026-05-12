import { useState, useEffect } from 'react';
import { Pill, Shield, Lock, Mail, Eye, EyeOff, ArrowRight, CheckCircle2, Activity, Boxes, TrendingUp, FileText, Building2, Sparkles, ChevronRight, Users, BarChart3, AlertCircle, Sun, Moon, Zap, Globe, Award, Database, Star, Quote } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import type { User } from '../../types';

interface LoginScreenProps {
  onLogin: () => void;
}

const ROLE_COLORS: Record<string, string> = {
  Admin: 'from-red-500 via-rose-500 to-pink-600',
  'Inventory Manager': 'from-blue-500 via-indigo-500 to-violet-600',
  'Sales Manager': 'from-emerald-500 via-teal-500 to-cyan-600',
  'Purchase Manager': 'from-violet-500 via-purple-500 to-fuchsia-600',
  Accountant: 'from-amber-500 via-orange-500 to-red-500',
  Auditor: 'from-cyan-500 via-blue-500 to-indigo-600',
  Custom: 'from-pink-500 via-rose-500 to-red-500',
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  Admin: 'Full system access · All modules',
  'Inventory Manager': 'Drugs · Batches · Warehouses',
  'Sales Manager': 'Customers · Invoices · Returns',
  'Purchase Manager': 'Vendors · POs · GRN',
  Accountant: 'P&L · Reports · Audit',
  Auditor: 'Read-only · All modules',
  Custom: 'Custom permissions',
};

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const { users } = useApp();
  const { switchUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const [step, setStep] = useState<'welcome' | 'select' | 'login'>('welcome');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-rotate features
  useEffect(() => {
    const t = setInterval(() => setActiveFeature(f => (f + 1) % 6), 3000);
    return () => clearInterval(t);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setLoading(true);
    setTimeout(() => {
      switchUser(selectedUser);
      showToast('success', `Welcome back, ${selectedUser.name}!`, `Logged in as ${selectedUser.role}`);
      onLogin();
    }, 800);
  };

  const handleQuickLogin = (user: User) => {
    if (!user.isActive) {
      showToast('error', 'Account Disabled', 'This account has been disabled.');
      return;
    }
    setLoading(true);
    setSelectedUser(user);
    setTimeout(() => {
      switchUser(user);
      showToast('success', `Welcome, ${user.name}!`, `Logged in as ${user.role}`);
      onLogin();
    }, 600);
  };

  const features = [
    { icon: <Boxes size={22} />, label: 'Smart Inventory', desc: 'FEFO batch tracking with real-time stock visibility across all warehouses', color: 'from-blue-500 to-cyan-500', stat: '15K+ batches tracked' },
    { icon: <Activity size={22} />, label: 'Live Alerts', desc: 'Instant notifications for low stock, expiry, and price anomalies', color: 'from-orange-500 to-red-500', stat: '24/7 monitoring' },
    { icon: <TrendingUp size={22} />, label: 'P&L Analytics', desc: 'Auto-calculated profit per warehouse with FY-wise drill-down', color: 'from-emerald-500 to-teal-500', stat: '40% avg margin' },
    { icon: <Shield size={22} />, label: 'Audit Trail', desc: 'Immutable activity logging for full regulatory compliance', color: 'from-violet-500 to-purple-500', stat: '100% compliant' },
    { icon: <FileText size={22} />, label: 'PDF/Excel Export', desc: 'Generate professional reports from any module with one click', color: 'from-pink-500 to-rose-500', stat: 'Unlimited exports' },
    { icon: <Building2 size={22} />, label: 'Multi-Warehouse', desc: 'Centralized control across hubs with FEFO transfer logic', color: 'from-amber-500 to-orange-500', stat: '4+ warehouses' },
  ];

  const stats = [
    { value: '12+', label: 'Drug SKUs', icon: <Pill size={14} /> },
    { value: '15K+', label: 'Batches', icon: <Boxes size={14} /> },
    { value: '4', label: 'Warehouses', icon: <Building2 size={14} /> },
    { value: '99.9%', label: 'Uptime', icon: <Zap size={14} /> },
  ];

  const benefits = [
    { icon: <Lock size={16} />, text: 'Bank-grade Security' },
    { icon: <Globe size={16} />, text: 'GST & Compliance Ready' },
    { icon: <Award size={16} />, text: 'ISO 27001 Aligned' },
    { icon: <Database size={16} />, text: 'Daily Auto Backups' },
  ];

  const testimonial = {
    text: "DDIAS transformed our distribution operations. We've reduced expired stock losses by 80% and improved our profit margins significantly.",
    author: "Operations Director",
    company: "Leading Pharma Distributor",
  };

  return (
    <div className={`min-h-screen relative overflow-hidden ${isDark ? 'bg-slate-950' : 'bg-gradient-to-br from-slate-50 via-blue-50/30 to-violet-50/30'}`}>
      {/* Animated Mesh Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-blue-400 via-indigo-500 to-violet-600 rounded-full opacity-20 dark:opacity-30 blur-3xl animate-blob" />
        <div className="absolute top-1/3 -left-40 w-[500px] h-[500px] bg-gradient-to-br from-violet-400 via-pink-500 to-rose-600 rounded-full opacity-20 dark:opacity-25 blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute -bottom-40 right-1/3 w-[500px] h-[500px] bg-gradient-to-br from-emerald-400 via-cyan-500 to-blue-600 rounded-full opacity-20 dark:opacity-25 blur-3xl animate-blob animation-delay-4000" />
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-gradient-to-br from-amber-400 to-orange-500 rounded-full opacity-10 dark:opacity-15 blur-3xl animate-blob animation-delay-6000" />
      </div>

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04] pointer-events-none" style={{
        backgroundImage: `linear-gradient(${isDark ? '#fff' : '#000'} 1px, transparent 1px), linear-gradient(90deg, ${isDark ? '#fff' : '#000'} 1px, transparent 1px)`,
        backgroundSize: '50px 50px',
      }} />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-blue-500/30 dark:bg-blue-400/30 animate-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${8 + Math.random() * 8}s`,
            }}
          />
        ))}
      </div>

      {/* Top Bar */}
      <div className="relative z-10 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-600 to-violet-700 flex items-center justify-center shadow-lg shadow-blue-500/40">
              <Pill size={20} className="text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white dark:border-slate-950 animate-pulse-soft" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">DDIAS</h1>
            <p className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-semibold">Pharma ERP · v2.0</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-full border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">All Systems Operational</span>
          </div>
          <div className="hidden lg:block text-right">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">{currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
            <p className="text-[10px] text-slate-500">{currentTime.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
          </div>
          <button onClick={toggleTheme} className="p-2 rounded-xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800 hover:scale-105 transition-all shadow-sm">
            {isDark ? <Sun size={16} className="text-yellow-500" /> : <Moon size={16} className="text-slate-600" />}
          </button>
        </div>
      </div>

      {/* WELCOME STEP */}
      {step === 'welcome' && (
        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-4 pb-12 lg:pt-8">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            {/* LEFT - Content */}
            <div className="lg:col-span-7 space-y-7 animate-fade-in">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-100 via-violet-100 to-pink-100 dark:from-blue-900/40 dark:via-violet-900/40 dark:to-pink-900/40 rounded-full border border-blue-200/50 dark:border-blue-700/30">
                <Sparkles size={14} className="text-blue-600 animate-pulse" />
                <span className="text-xs font-bold bg-gradient-to-r from-blue-700 via-violet-700 to-pink-700 dark:from-blue-300 dark:via-violet-300 dark:to-pink-300 bg-clip-text text-transparent uppercase tracking-wider">India's Modern Pharma ERP</span>
              </div>

              {/* Headline */}
              <div>
                <h1 className="text-4xl lg:text-6xl font-extrabold text-slate-900 dark:text-white leading-[1.05] tracking-tight">
                  Distribute <br />
                  <span className="relative inline-block">
                    <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">smarter, faster.</span>
                    <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 8" fill="none">
                      <path d="M0 4 Q 50 0, 100 4 T 200 4" stroke="url(#gradient)" strokeWidth="3" strokeLinecap="round" />
                      <defs>
                        <linearGradient id="gradient" x1="0" y1="0" x2="200" y2="0">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="50%" stopColor="#8b5cf6" />
                          <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </span>
                </h1>
                <p className="mt-5 text-base lg:text-lg text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
                  Complete inventory, audit, and financial visibility platform built for drug distributors.
                  Track every batch from purchase to sale with full regulatory compliance.
                </p>
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setStep('select')}
                  className="group relative flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white rounded-xl font-bold shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.03] transition-all overflow-hidden"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative flex items-center gap-2">
                    Get Started Free
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>
                <button onClick={() => setStep('select')} className="flex items-center gap-2 px-5 py-3.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur text-slate-700 dark:text-slate-300 rounded-xl font-semibold border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 hover:scale-[1.02] transition-all shadow-sm">
                  <Activity size={16} /> Explore Demo
                </button>
              </div>

              {/* Stats inline */}
              <div className="grid grid-cols-4 gap-3 pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                {stats.map((stat, i) => (
                  <div key={i} className="group">
                    <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                      <span className="text-blue-500">{stat.icon}</span>
                      <p className="text-[10px] uppercase tracking-wider font-semibold">{stat.label}</p>
                    </div>
                    <p className="text-2xl lg:text-3xl font-extrabold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent group-hover:from-blue-600 group-hover:to-violet-600 transition-all">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Benefits row */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                {benefits.map((b, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <span className="text-emerald-500">{b.icon}</span>
                    <span className="font-medium">{b.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT - Feature Showcase */}
            <div className="lg:col-span-5 relative">
              {/* Feature carousel */}
              <div className="relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl rounded-3xl border border-slate-200/50 dark:border-slate-700/50 p-6 shadow-2xl shadow-blue-500/10 overflow-hidden">
                {/* Decorative gradient blob inside */}
                <div className={`absolute -top-20 -right-20 w-60 h-60 rounded-full bg-gradient-to-br ${features[activeFeature].color} opacity-20 blur-3xl transition-all duration-1000`} />

                <div className="relative">
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Featured Capability</span>
                    <div className="flex gap-1">
                      {features.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveFeature(i)}
                          className={`h-1.5 rounded-full transition-all ${i === activeFeature ? 'w-6 bg-blue-600' : 'w-1.5 bg-slate-300 dark:bg-slate-600'}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${features[activeFeature].color} flex items-center justify-center text-white shadow-xl mb-4 animate-scale-in`}>
                    {features[activeFeature].icon}
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">{features[activeFeature].label}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">{features[activeFeature].desc}</p>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-full">
                    <CheckCircle2 size={12} className="text-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{features[activeFeature].stat}</span>
                  </div>
                </div>
              </div>

              {/* Floating mini cards */}
              <div className="absolute -top-4 -left-4 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl p-3 text-white shadow-xl rotate-[-6deg] animate-float">
                <CheckCircle2 size={18} />
                <p className="text-[10px] font-bold mt-1">100% Compliant</p>
              </div>
              <div className="absolute -bottom-4 -right-4 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-2xl p-3 text-white shadow-xl rotate-[6deg] animate-float animation-delay-2000">
                <BarChart3 size={18} />
                <p className="text-[10px] font-bold mt-1">Real-time</p>
              </div>
              <div className="absolute top-1/2 -right-6 bg-gradient-to-br from-violet-500 to-pink-600 rounded-xl px-3 py-2 text-white shadow-xl animate-float animation-delay-4000">
                <div className="flex items-center gap-1">
                  <Zap size={12} className="fill-white" />
                  <p className="text-[10px] font-bold">Lightning Fast</p>
                </div>
              </div>
            </div>
          </div>

          {/* Testimonial + Trust Strip */}
          <div className="mt-12 grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-gradient-to-br from-white/70 to-blue-50/40 dark:from-slate-800/70 dark:to-blue-900/20 backdrop-blur rounded-2xl p-5 border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
              <Quote size={20} className="text-blue-400 mb-2" />
              <p className="text-sm text-slate-700 dark:text-slate-300 italic leading-relaxed">"{testimonial.text}"</p>
              <div className="mt-3 flex items-center gap-3 pt-3 border-t border-slate-200/50 dark:border-slate-700/50">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">OD</div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{testimonial.author}</p>
                  <p className="text-[10px] text-slate-500">{testimonial.company}</p>
                </div>
                <div className="ml-auto flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={10} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-violet-50/70 to-pink-50/70 dark:from-violet-900/20 dark:to-pink-900/20 backdrop-blur rounded-2xl p-5 border border-violet-200/50 dark:border-violet-800/30 flex flex-col justify-center">
              <p className="text-[10px] uppercase tracking-widest font-bold text-violet-500 mb-2">Trusted by</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {['CIPLA', 'AIIMS', 'Apollo', 'Fortis', 'MedPlus', 'Max'].map(brand => (
                  <span key={brand} className="text-sm font-extrabold text-slate-700 dark:text-slate-300 tracking-tight">{brand}</span>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">+ 100s of distributors across India</p>
            </div>
          </div>
        </div>
      )}

      {/* SELECT USER STEP */}
      {step === 'select' && (
        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-2 pb-12 animate-fade-in">
          <div className="text-center mb-8">
            <button onClick={() => setStep('welcome')} className="text-sm text-slate-500 hover:text-blue-600 mb-4 inline-flex items-center gap-1 group">
              <ChevronRight size={14} className="rotate-180 group-hover:-translate-x-1 transition-transform" /> Back to Home
            </button>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-violet-100 to-pink-100 dark:from-violet-900/40 dark:to-pink-900/40 rounded-full mb-4 border border-violet-200/50">
              <Users size={14} className="text-violet-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">Demo Mode · Quick Login</span>
            </div>
            <h2 className="text-3xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">Choose Your Role</h2>
            <p className="text-sm text-slate-500 mt-3 max-w-md mx-auto">Sign in as any user to explore the system. Each role has tailored permissions and views.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {users.map(user => {
              const roleColor = ROLE_COLORS[user.role] || 'from-slate-500 to-slate-600';
              return (
                <button
                  key={user.id}
                  onClick={() => handleQuickLogin(user)}
                  disabled={!user.isActive}
                  className={`group relative bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl p-5 border border-slate-200/50 dark:border-slate-700/50 text-left hover:shadow-2xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden ${!user.isActive ? '' : 'hover:border-blue-300 dark:hover:border-blue-600'}`}
                >
                  {/* Gradient corner accent */}
                  <div className={`absolute -top-12 -right-12 w-24 h-24 rounded-full bg-gradient-to-br ${roleColor} opacity-20 group-hover:opacity-40 transition-opacity blur-2xl`} />

                  {!user.isActive && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 rounded-full text-[10px] font-bold flex items-center gap-1">
                      <Lock size={9} /> DISABLED
                    </div>
                  )}
                  <div className="relative">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${roleColor} flex items-center justify-center text-white text-xl font-bold shadow-lg mb-3 group-hover:scale-110 group-hover:rotate-3 transition-all`}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{user.name}</h3>
                    <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                    <div className="mt-3">
                      <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-bold bg-gradient-to-r ${roleColor} text-white shadow-sm`}>{user.role}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">{ROLE_DESCRIPTIONS[user.role] || ''}</p>
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Click to login</span>
                      <ChevronRight size={14} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-8 text-center">
            <button onClick={() => { const admin = users.find(u => u.role === 'Admin') || users[0]; setStep('login'); setSelectedUser(admin); setEmail(admin.email); }} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-300 transition-colors">
              <Mail size={14} /> Login with credentials instead
            </button>
          </div>
        </div>
      )}

      {/* LOGIN STEP */}
      {step === 'login' && selectedUser && (
        <div className="relative z-10 min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-8 animate-fade-in">
          <div className="w-full max-w-md">
            <button onClick={() => setStep('select')} className="text-sm text-slate-500 hover:text-blue-600 mb-4 inline-flex items-center gap-1 group">
              <ChevronRight size={14} className="rotate-180 group-hover:-translate-x-1 transition-transform" /> Choose different user
            </button>
            <form onSubmit={handleLogin} className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
              {/* Header */}
              <div className={`relative p-7 bg-gradient-to-br ${ROLE_COLORS[selectedUser.role]} text-white text-center overflow-hidden`}>
                <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 30%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-white opacity-10 blur-2xl" />
                <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-white opacity-10 blur-2xl" />
                <div className="relative">
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl font-extrabold mb-3 shadow-2xl ring-4 ring-white/20">
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </div>
                  <h2 className="text-xl font-bold">{selectedUser.name}</h2>
                  <p className="text-xs opacity-90 mt-0.5">{selectedUser.role}</p>
                  <p className="text-[10px] opacity-75 mt-2">{ROLE_DESCRIPTIONS[selectedUser.role]}</p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Email Address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="you@ddias.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Password</label>
                    <button type="button" className="text-[10px] text-blue-600 hover:underline font-semibold">Forgot?</button>
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Enter any password (demo)"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded text-blue-600" />
                    Remember me
                  </label>
                  <span className="flex items-center gap-1 text-emerald-600 font-bold">
                    <Lock size={11} /> 256-bit SSL
                  </span>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-violet-50 dark:from-blue-900/20 dark:to-violet-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-blue-700 dark:text-blue-400 leading-relaxed">
                    <strong>Demo Mode:</strong> Password is not validated. Click Sign In to enter the system as <strong>{selectedUser.name}</strong>.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r ${ROLE_COLORS[selectedUser.role]} text-white rounded-xl font-bold shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all disabled:opacity-70 disabled:cursor-not-allowed group`}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In Securely
                      <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>

              <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-[10px] text-slate-500">
                <span>© 2026 DDIAS Pharma ERP</span>
                <span className="flex items-center gap-1"><Shield size={10} /> Audit-ready · GDPR Compliant</span>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(40px, -60px) scale(1.1); }
          66% { transform: translate(-30px, 30px) scale(0.9); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(var(--rotate, 0deg)); }
          50% { transform: translateY(-12px) rotate(var(--rotate, 0deg)); }
        }
        @keyframes particle {
          0% { transform: translate(0, 0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translate(100px, -100px); opacity: 0; }
        }
        .animate-blob { animation: blob 12s infinite ease-in-out; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-particle { animation: particle linear infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        .animation-delay-6000 { animation-delay: 6s; }
      `}</style>
    </div>
  );
}
