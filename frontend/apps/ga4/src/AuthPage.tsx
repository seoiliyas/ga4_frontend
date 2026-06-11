import React, { useState } from 'react';
import { BarChart3, Mail, Lock, User, KeyRound, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '@brighthorizon/shared';
import { motion, AnimatePresence } from 'motion/react';

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup' | 'bootstrap'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteKey, setInviteKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, signup, bootstrap } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else if (mode === 'signup') {
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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ backgroundColor: '#0f172a' }}>
      {/* Background Orbs */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-orange-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-amber-600/20 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-8">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-orange-600 to-amber-500 shadow-xl shadow-orange-500/20 mb-4"
          >
            <BarChart3 className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white tracking-tight">BrightHorizon GA4 AI Chat</h1>
          <p className="text-orange-200/60 mt-2">Professional GA4 Auditing & Insights</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="flex bg-white/5 p-1 rounded-xl mb-8">
            <button 
              onClick={() => { setMode('login'); setError(null); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === 'login' ? 'bg-orange-600 text-white shadow-lg' : 'text-orange-200/60 hover:text-white'}`}
            >
              Sign In
            </button>
            <button 
              onClick={() => { setMode('signup'); setError(null); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === 'signup' ? 'bg-orange-600 text-white shadow-lg' : 'text-orange-200/60 hover:text-white'}`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode !== 'login' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="block text-xs font-semibold text-orange-200/50 uppercase tracking-wider mb-1.5 ml-1">Username</label>
                  <div className="relative group">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-300/40 group-focus-within:text-orange-400 transition-colors" />
                    <input
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-white rounded-xl py-2.5 pl-10 pr-4 outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 transition-all"
                      placeholder="johndoe"
                      required
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-xs font-semibold text-orange-200/50 uppercase tracking-wider mb-1.5 ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-300/40 group-focus-within:text-orange-400 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl py-2.5 pl-10 pr-4 outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 transition-all"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-orange-200/50 uppercase tracking-wider mb-1.5 ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-300/40 group-focus-within:text-orange-400 transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl py-2.5 pl-10 pr-4 outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              {mode === 'signup' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="block text-xs font-semibold text-orange-200/50 uppercase tracking-wider mb-1.5 ml-1">Invite Key</label>
                  <div className="relative group">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-300/40 group-focus-within:text-orange-400 transition-colors" />
                    <input
                      type="text"
                      value={inviteKey}
                      onChange={e => setInviteKey(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-white rounded-xl py-2.5 pl-10 pr-4 outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 transition-all"
                      placeholder="bh-xxxx-xxxx"
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
              className="w-full bg-gradient-to-r from-orange-600 to-amber-500 text-white rounded-xl py-3 font-semibold shadow-xl shadow-orange-500/20 hover:shadow-orange-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-2 group"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Initialize App'}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {mode === 'login' && (
            <div className="mt-6 text-center">
              <button 
                onClick={() => setMode('bootstrap')}
                className="text-xs text-orange-300/40 hover:text-orange-300 transition-colors"
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
