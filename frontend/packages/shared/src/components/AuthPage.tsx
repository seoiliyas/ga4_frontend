import React, { useState } from 'react';
import {
  FileJson,
  BarChart3,
  Mail,
  Lock,
  User,
  KeyRound,
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { BrightHorizonLogo } from './Sidebar';
import type { AppMode } from '../services/chatApi';

export function AuthPage({ mode }: { mode: AppMode }) {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'bootstrap'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [inviteKey, setInviteKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, signup, bootstrap } = useAuth();
  const isGa4 = mode === 'ga4';
  const ModeIcon = isGa4 ? BarChart3 : FileJson;

  const copy = isGa4
    ? {
        eyebrow: 'GA4 Analytics Studio',
        titleLead: 'Turn GA4 data into',
        titleBold: 'clear decisions',
        subtitle:
          'Connect your Google Analytics 4 properties to inspect events, user trends, and acquisition channels in plain language.',
        highlights: [
          'Live property inspection via authenticated GA4 OAuth',
          'Structured tables and generated visual trend charts',
          'Team workspaces protected by invite-key onboarding',
        ],
        formTitle: authMode === 'login' ? 'Sign in to GA4 Studio' : authMode === 'signup' ? 'Create your account' : 'Initialize workspace',
      }
    : {
        eyebrow: 'GTM Container Intelligence',
        titleLead: 'Audit containers with',
        titleBold: 'clarity & speed',
        subtitle:
          'Inspect Google Tag Manager exports for consent gaps, trigger conflicts, and container bloat with grounded AI diagnostics.',
        highlights: [
          'Deep container inspection across tags, triggers, and variables',
          'Prioritized severity findings with exportable audit tables',
          'Team workspaces protected by invite-key onboarding',
        ],
        formTitle: authMode === 'login' ? 'Sign in to GTM Auditor' : authMode === 'signup' ? 'Create your account' : 'Initialize workspace',
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
      setError(err.message || 'Authentication failed. Please check your credentials and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[var(--bg)]">
      {/* Top Horizon Brand Strip */}
      <div className="h-[3px] w-full shrink-0 bh-horizon-strip" aria-hidden="true" />

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left Editorial Brand Panel (Bright Horizons Nile-to-Cerulean Gradient) */}
        <aside
          className="relative lg:w-[46%] xl:w-[44%] flex flex-col justify-between p-7 sm:p-10 lg:p-12 text-white overflow-hidden shrink-0"
          style={{
            background: 'linear-gradient(155deg, #0E2633 0%, #1A475F 56%, #2B6D83 100%)',
          }}
        >
          {/* Architectural Horizon Curves echoing brighthorizons.com */}
          <svg
            aria-hidden="true"
            viewBox="0 0 600 400"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-x-0 bottom-0 w-full h-56 opacity-25"
          >
            <path
              d="M0 320 C 160 220, 380 230, 600 120 L 600 400 L 0 400 Z"
              fill="#3C889E"
            />
            <path
              d="M0 360 C 210 280, 420 300, 600 210 L 600 400 L 0 400 Z"
              fill="#0B8743"
              opacity="0.45"
            />
          </svg>

          {/* Top Lockup */}
          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <BrightHorizonLogo mode={mode} className="w-9 h-9" />
              <div>
                <span className="text-base font-extrabold tracking-tight text-white block leading-none">
                  BrightHorizon
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#92D9E7] block mt-1">
                  {copy.eyebrow}
                </span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-semibold text-white">
              <ModeIcon className="w-3.5 h-3.5 text-[#F0BD1B]" />
              {isGa4 ? 'GA4' : 'GTM'}
            </span>
          </div>

          {/* Center Editorial Statement */}
          <div className="relative z-10 my-8 lg:my-0 max-w-md">
            <h1 className="text-3xl sm:text-4xl font-light tracking-[-0.02em] leading-[1.12] text-white text-balance">
              {copy.titleLead}{' '}
              <strong className="font-extrabold text-white block sm:inline">{copy.titleBold}</strong>
            </h1>
            <div className="w-12 h-1 bg-[#F0BD1B] rounded-full mt-4 mb-5" aria-hidden="true" />
            <p className="text-sm sm:text-[15px] text-[#DCEBF0] leading-relaxed">
              {copy.subtitle}
            </p>

            <ul className="mt-7 space-y-3 hidden sm:block">
              {copy.highlights.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-xs sm:text-[13px] text-[#E6F3F7]">
                  <span className="mt-0.5 w-4 h-4 rounded-full bg-[#F0BD1B]/20 border border-[#F0BD1B]/50 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 text-[#F0BD1B] stroke-[3]" />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom Provenance */}
          <div className="relative z-10 hidden lg:flex items-center justify-between text-[11px] text-[#92D9E7]/85 border-t border-white/10 pt-5">
            <span>BrightHorizon Workspace</span>
            <span className="font-semibold text-white/90">Enterprise Analytics Suite</span>
          </div>
        </aside>

        {/* Right Form Canvas */}
        <main className="flex-1 flex items-center justify-center p-5 sm:p-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
            className="w-full max-w-[440px]"
          >
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 shadow-[0_12px_36px_rgba(20,38,50,0.07)]">
              <div className="mb-6">
                <h2 className="text-xl font-extrabold text-[var(--fg)] tracking-tight">
                  {copy.formTitle}
                </h2>
                <p className="text-xs text-[var(--muted)] mt-1">
                  {authMode === 'bootstrap'
                    ? 'Set up the first administrator account for this workspace.'
                    : 'Enter your workspace credentials to continue.'}
                </p>
              </div>

              {authMode === 'bootstrap' ? (
                <div className="mb-5 flex items-center justify-between px-3.5 py-2.5 rounded-[10px] bg-[var(--bh-buttercup-soft)] border border-[var(--bh-buttercup-border)]">
                  <span className="text-xs font-bold text-[#7D5B00]">Initial Admin Setup</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setError(null);
                    }}
                    className="text-xs font-bold text-[var(--bh-nile)] hover:underline"
                  >
                    ← Back to Sign In
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 bg-[var(--bg)] p-1 rounded-[10px] border border-[var(--border-soft)] mb-6">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setError(null);
                    }}
                    className={`py-2 text-xs font-bold rounded-[8px] transition-all duration-150 ${
                      authMode === 'login'
                        ? 'bg-[var(--surface)] text-[var(--bh-nile)] shadow-sm border border-[var(--border-soft)]'
                        : 'text-[var(--muted)] hover:text-[var(--fg)]'
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
                    className={`py-2 text-xs font-bold rounded-[8px] transition-all duration-150 ${
                      authMode === 'signup'
                        ? 'bg-[var(--surface)] text-[var(--bh-nile)] shadow-sm border border-[var(--border-soft)]'
                        : 'text-[var(--muted)] hover:text-[var(--fg)]'
                    }`}
                  >
                    Register
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <AnimatePresence mode="wait">
                  {authMode !== 'login' && (
                    <motion.div
                      key="username-field"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
                    >
                      <label
                        htmlFor="auth-username"
                        className="block text-[11px] font-bold text-[var(--bh-nile)] uppercase tracking-[0.07em] mb-1.5"
                      >
                        Username
                      </label>
                      <div className="relative group">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)] group-focus-within:text-[var(--bh-cerulean)] transition-colors" />
                        <input
                          id="auth-username"
                          type="text"
                          autoComplete="username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full bg-[var(--surface-warm)] border border-[var(--border)] text-sm font-medium text-[var(--fg)] placeholder:text-[var(--muted)]/70 rounded-[10px] py-2.5 pl-10 pr-4 outline-none focus:bg-white focus:border-[var(--bh-cerulean)] focus:ring-4 focus:ring-[#3C889E]/12 transition-all"
                          placeholder="alex.morgan"
                          required
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div>
                  <label
                    htmlFor="auth-email"
                    className="block text-[11px] font-bold text-[var(--bh-nile)] uppercase tracking-[0.07em] mb-1.5"
                  >
                    Email Address
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)] group-focus-within:text-[var(--bh-cerulean)] transition-colors" />
                    <input
                      id="auth-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[var(--surface-warm)] border border-[var(--border)] text-sm font-medium text-[var(--fg)] placeholder:text-[var(--muted)]/70 rounded-[10px] py-2.5 pl-10 pr-4 outline-none focus:bg-white focus:border-[var(--bh-cerulean)] focus:ring-4 focus:ring-[#3C889E]/12 transition-all"
                      placeholder="name@company.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="auth-password"
                    className="block text-[11px] font-bold text-[var(--bh-nile)] uppercase tracking-[0.07em] mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)] group-focus-within:text-[var(--bh-cerulean)] transition-colors" />
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[var(--surface-warm)] border border-[var(--border)] text-sm font-medium text-[var(--fg)] placeholder:text-[var(--muted)]/70 rounded-[10px] py-2.5 pl-10 pr-10 outline-none focus:bg-white focus:border-[var(--bh-cerulean)] focus:ring-4 focus:ring-[#3C889E]/12 transition-all"
                      placeholder="Minimum 6 characters"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--muted)] hover:text-[var(--bh-nile)] rounded-md transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {authMode === 'signup' && (
                    <motion.div
                      key="invite-key-field"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
                    >
                      <label
                        htmlFor="auth-invite-key"
                        className="block text-[11px] font-bold text-[var(--bh-nile)] uppercase tracking-[0.07em] mb-1.5"
                      >
                        Invite Key
                      </label>
                      <div className="relative group">
                        <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)] group-focus-within:text-[var(--bh-cerulean)] transition-colors" />
                        <input
                          id="auth-invite-key"
                          type="text"
                          value={inviteKey}
                          onChange={(e) => setInviteKey(e.target.value)}
                          className="w-full bg-[var(--surface-warm)] border border-[var(--border)] text-sm font-mono text-[var(--fg)] placeholder:text-[var(--muted)]/70 rounded-[10px] py-2.5 pl-10 pr-4 outline-none focus:bg-white focus:border-[var(--bh-cerulean)] focus:ring-4 focus:ring-[#3C889E]/12 transition-all"
                          placeholder="INV-XXXXXXXXXXXXXXXX"
                          required
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    role="alert"
                    className="flex items-start gap-2.5 p-3 rounded-[10px] bg-[var(--danger-soft)] border border-[#F4C6C6] text-[var(--danger)] text-xs font-semibold"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[var(--bh-buttercup)] hover:bg-[var(--bh-buttercup-hover)] text-[var(--bh-nile-deep)] rounded-[10px] py-3 text-sm font-extrabold shadow-[0_3px_12px_rgba(240,189,27,0.28)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-150 disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-2 group"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>
                        {authMode === 'login' ? 'Sign In' : authMode === 'signup' ? 'Create Account' : 'Initialize App'}
                      </span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-150" />
                    </>
                  )}
                </button>
              </form>

              {authMode === 'login' && (
                <div className="mt-6 pt-5 border-t border-[var(--border-soft)] text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('bootstrap');
                      setError(null);
                    }}
                    className="text-xs font-semibold text-[var(--bh-cerulean)] hover:text-[var(--bh-nile)] hover:underline transition-colors"
                  >
                    Need to initialize the first account?
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
