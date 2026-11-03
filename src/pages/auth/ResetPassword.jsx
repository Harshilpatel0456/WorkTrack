import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { authApi } from '../../services/apiClient';
import { Lock, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Loader2, Sparkles, KeyRound, Eye, EyeOff } from 'lucide-react';

export const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const uid = searchParams.get('uid') || '';
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!uid || !token) {
      setError('Invalid or expired password reset link. Please request a new one.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await authApi.confirmPasswordReset({
        uid,
        token,
        newPassword,
        confirmNewPassword,
      });
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FC] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      <div className="text-center mb-6 max-w-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#245CE2] text-xs font-bold mb-3 shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          Security Credentials
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

          <h2 className="text-xl font-bold text-slate-900">Set New Password</h2>
          <p className="text-xs text-slate-500 mt-1 mb-5">
            Choose a strong password containing at least 8 characters.
          </p>

          {(!uid || !token) && !isSuccess && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Missing reset token in URL. Please use the exact link sent to your email.</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isSuccess ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Password Reset Successfully!</span>
                </div>
                <p className="text-[11px] text-emerald-700 leading-relaxed">
                  Your credentials have been securely updated. You will be redirected to the sign in page in a moment.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  to="/login"
                  className="w-full bg-[#245CE2] hover:bg-[#1A45B0] text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Go to Sign In Immediately</span>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#245CE2] focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#245CE2] focus:bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !uid || !token}
                className="w-full bg-[#245CE2] hover:bg-[#1A45B0] disabled:bg-blue-300 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Resetting Password...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Update Password</span>
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
                  <span>Cancel and return to Sign In</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

