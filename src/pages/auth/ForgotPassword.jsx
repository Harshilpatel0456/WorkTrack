import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../services/apiClient';
import { Mail, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Loader2, Sparkles, KeyRound } from 'lucide-react';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authApi.requestPasswordReset({ email: email.trim().toLowerCase() });
      setIsSubmitted(true);
    } catch (err) {
      setError(err.message || 'Unable to request password reset. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FC] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      <div className="text-center mb-6 max-w-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#245CE2] text-xs font-bold mb-3 shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          Account Recovery
        </div>
        <div className="flex items-center justify-center gap-2.5 mb-1.5">
          <div className="w-9 h-9 rounded-2xl bg-[#245CE2] flex items-center justify-center text-white shadow-card font-black text-lg">
            W
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Work<span className="text-[#245CE2]">Track</span>
          </h1>
        </div>
      </div>

      <div className="w-full max-w-md">
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-card">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#245CE2] flex items-center justify-center mb-4">
            <KeyRound className="w-6 h-6" />
          </div>

          <h2 className="text-xl font-bold text-slate-900">Forgot Password?</h2>
          <p className="text-xs text-slate-500 mt-1 mb-5">
            Enter your registered email address and we'll send you a password reset link.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isSubmitted ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Reset link generated!</span>
                </div>
                <p className="text-[11px] text-emerald-700 leading-relaxed">
                  If an active account exists for <strong>{email}</strong>, a password reset link has been dispatched. Please check your email inbox (or Django server console in development mode).
                </p>
              </div>

              <div className="pt-2">
                <Link
                  to="/login"
                  className="w-full bg-[#245CE2] hover:bg-[#1A45B0] text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to Sign In</span>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#245CE2] focus:bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#245CE2] hover:bg-[#1A45B0] disabled:bg-blue-300 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  <>
                    <span>Send Reset Instructions</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

