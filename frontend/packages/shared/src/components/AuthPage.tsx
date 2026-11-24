import React, { useState } from 'react';
import { FileJson, BarChart3, Mail, Lock, User, KeyRound, Loader2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import type { AppMode } from '../services/chatApi';

export function AuthPage({ mode }: { mode: AppMode }) {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'bootstrap'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteKey, setInviteKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, signup, bootstrap } = useAuth();
  const isGa4 = mode === 'ga4';
  const Icon = isGa4 ? BarChart3 : FileJson;

  const theme = isGa4
    ? {
        orbTop: 'bg-orange-600/20',
        orbBottom: 'bg-amber-600/20',
        badge: 'from-orange-600 to-amber-500 shadow-orange-500/20',
        subtitle: 'text-orange-200/60',
        tabActive: 'bg-orange-600 text-white shadow-lg',
        tabInactive: 'text-orange-200/60 hover:text-white',
        label: 'text-orange-200/50',
        icon: 'text-orange-300/40 group-focus-within:text-orange-400',
        inputFocus: 'focus:border-orange-500/50 focus:ring-orange-500/10',
        submit: 'from-orange-600 to-amber-500 shadow-orange-500/20 hover:shadow-orange-500/40',
        bootstrapLink: 'text-orange-300/40 hover:text-orange-300',
        title: 'BrightHorizon GA4 AI Chat',
        tagline: 'Professional GA4 Auditing & Insights',
      }
    : {
        orbTop: 'bg-blue-600/20',
        orbBottom: 'bg-cyan-600/20',
        badge: 'from-blue-600 to-cyan-500 shadow-blue-500/20',
        subtitle: 'text-blue-200/60',
        tabActive: 'bg-blue-600 text-white shadow-lg',
        tabInactive: 'text-blue-200/60 hover:text-white',
        label: 'text-blue-200/50',
        icon: 'text-blue-300/40 group-focus-within:text-blue-400',
        inputFocus: 'focus:border-blue-500/50 focus:ring-blue-500/10',
        submit: 'from-blue-600 to-cyan-500 shadow-blue-500/20 hover:shadow-blue-500/40',
        bootstrapLink: 'text-blue-300/40 hover:text-blue-300',
        title: 'BrightHorizon GTM AI Chat',
        tagline: 'Professional GTM Auditing & Management',
      };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (authMode === 'login') {
        await login(email, password);
      } else if (authMode === 'signup') {
        await signup(username, email, password, inviteKey);
      } else {
        await bootstrap(username, email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ backgroundColor: '#0f172a' }}
    >
      <div className={`absolute top-0 -left-20 w-96 h-96 ${theme.orbTop} rounded-full blur-[120px]`} />
      <div className={`absolute bottom-0 -right-20 w-96 h-96 ${theme.orbBottom} rounded-full blur-[120px]`} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-8">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className={`inline-flex p-3 rounded-2xl bg-gradient-to-br ${theme.badge} shadow-xl mb-4`}
          >
            <Icon className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white tracking-tight">{theme.title}</h1>
          <p className={`${theme.subtitle} mt-2`}>{theme.tagline}</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="flex bg-white/5 p-1 rounded-xl mb-8">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setError(null);
              }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                authMode === 'login' ? theme.tabActive : theme.tabInactive
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('signup');
                setError(null);
              }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                authMode === 'signup' ? theme.tabActive : theme.tabInactive
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {authMode !== 'login' && (
                <motion.div
                  key="username-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className={`block text-xs font-semibold ${theme.label} uppercase tracking-wider mb-1.5 ml-1`}>
                    Username
                  </label>
                  <div className="relative group">
                    <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme.icon} transition-colors`} />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className={`w-full bg-white/5 border border-white/10 text-white rounded-xl py-2.5 pl-10 pr-4 outline-none ${theme.inputFocus} focus:ring-4 transition-all`}
                      placeholder="johndoe"
                      required
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className={`block text-xs font-semibold ${theme.label} uppercase tracking-wider mb-1.5 ml-1`}>
                Email Address
              </label>
              <div className="relative group">
                <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme.icon} transition-colors`} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full bg-white/5 border border-white/10 text-white rounded-xl py-2.5 pl-10 pr-4 outline-none ${theme.inputFocus} focus:ring-4 transition-all`}
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className={`block text-xs font-semibold ${theme.label} uppercase tracking-wider mb-1.5 ml-1`}>
                Password
              </label>
              <div className="relative group">
                <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme.icon} transition-colors`} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full bg-white/5 border border-white/10 text-white rounded-xl py-2.5 pl-10 pr-4 outline-none ${theme.inputFocus} focus:ring-4 transition-all`}
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              {authMode === 'signup' && (
                <motion.div
                  key="invite-key-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className={`block text-xs font-semibold ${theme.label} uppercase tracking-wider mb-1.5 ml-1`}>
                    Invite Key
                  </label>
                  <div className="relative group">
                    <KeyRound className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme.icon} transition-colors`} />
                    <input
                      type="text"
                      value={inviteKey}
                      onChange={(e) => setInviteKey(e.target.value)}
                      className={`w-full bg-white/5 border border-white/10 text-white rounded-xl py-2.5 pl-10 pr-4 outline-none ${theme.inputFocus} focus:ring-4 transition-all`}
                      placeholder="INV-XXXXXXXXXXXXXXXX"
                      required
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium text-center"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full bg-gradient-to-r ${theme.submit} text-white rounded-xl py-3 font-semibold shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-2 group`}
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {authMode === 'login' ? 'Sign In' : authMode === 'signup' ? 'Create Account' : 'Initialize App'}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {authMode === 'login' && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('bootstrap');
                  setError(null);
                }}
                className={`text-xs ${theme.bootstrapLink} transition-colors`}
              >
                Need to initialize the first account?
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
