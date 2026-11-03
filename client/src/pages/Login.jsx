import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { HardHat, Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await login(email, password);
    if (res.success) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Subtle Grid & Glow */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Logo */}
        <div className="flex flex-col items-center">
          <div className="h-14 w-14 rounded-2xl bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/30">
            <HardHat className="w-8 h-8 text-slate-950" />
          </div>
          <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            BUILD<span className="text-brand-400">TRACK</span>
          </h1>
          <p className="mt-1 text-xs text-slate-400 font-medium tracking-wide uppercase">
            Construction Project Cost Control & Site Expenses
          </p>
        </div>

        {/* Card */}
        <div className="mt-8 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <h2 className="text-lg font-semibold text-white mb-2">Sign in to your account</h2>
          <p className="text-xs text-slate-400 mb-6">
            Enter your company credentials to access your project expense workspace.
          </p>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold text-sm shadow-lg shadow-brand-500/25 transition-all transform active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-xs text-slate-500">
          Enterprise Construction Expense Management System
        </p>
      </div>
    </div>
  );
}

export default Login;
