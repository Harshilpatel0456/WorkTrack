import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Sparkles,
  User,
  Building2,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export const SignUp = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('EMPLOYEE'); // EMPLOYEE or CUSTOMER
  const [companyName, setCompanyName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!acceptTerms) {
      setError('You must accept the terms of service.');
      return;
    }

    if (role === 'CUSTOMER' && !companyName.trim()) {
      setError('Company Name is required for Customer accounts.');
      return;
    }

    const payload = {
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      password,
      confirmPassword,
      role, // EMPLOYEE or CUSTOMER
      companyName: role === 'CUSTOMER' ? companyName.trim() : undefined,
    };

    const res = await register(payload);
    if (res.success) {
      setSuccessMsg('Account created successfully! Redirecting...');
      setTimeout(() => {
        if (res.role === 'employee') navigate('/employee');
        else if (res.role === 'customer') navigate('/customer');
        else navigate('/login');
      }, 1000);
    } else {
      setError(res.message || 'Registration failed. Please check your inputs.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FC] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="text-center mb-6 max-w-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#245CE2] text-xs font-bold mb-3 shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          Enterprise Onboarding
        </div>
        <div className="flex items-center justify-center gap-2.5 mb-1.5">
          <div className="w-9 h-9 rounded-2xl bg-[#245CE2] flex items-center justify-center text-white shadow-card font-black text-lg">
            W
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Work<span className="text-[#245CE2]">Track</span>
          </h1>
        </div>
        <p className="text-xs font-semibold text-slate-500">
          Create your workforce or client portal account
        </p>
      </div>

      <div className="w-full max-w-lg">
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-card">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">Create New Account</h2>
            <p className="text-xs text-slate-500 mt-1">
              Select your role and complete registration.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Account Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('EMPLOYEE')}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                    role === 'EMPLOYEE'
                      ? 'border-[#245CE2] bg-blue-50/70 text-[#245CE2] ring-2 ring-blue-500/20 font-bold'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <User className="w-5 h-5 mb-1" />
                  <span className="text-xs">Field Employee</span>
                  <span className="text-[10px] text-slate-400 font-normal">Attendance & Daily Reports</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('CUSTOMER')}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                    role === 'CUSTOMER'
                      ? 'border-[#245CE2] bg-blue-50/70 text-[#245CE2] ring-2 ring-blue-500/20 font-bold'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Building2 className="w-5 h-5 mb-1" />
                  <span className="text-xs">Client Customer</span>
                  <span className="text-[10px] text-slate-400 font-normal">Surveillance & Approvals</span>
                </button>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Aarav Sharma"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#245CE2] focus:bg-white"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Work Email Address
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

            {/* Company Name (only if Customer role selected) */}
            {role === 'CUSTOMER' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Company / Organization Name
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Apex Industries Pvt Ltd"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#245CE2] focus:bg-white"
                  />
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
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

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#245CE2] focus:bg-white"
                />
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-0.5 rounded text-[#245CE2] focus:ring-[#245CE2]"
                />
                <span>
                  I agree to the WorkTrack Workforce Terms of Service and Privacy Policy.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-[#245CE2] hover:bg-[#1A45B0] disabled:bg-blue-300 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-slate-600">
            Already registered?{' '}
            <Link to="/login" className="text-[#245CE2] font-bold hover:underline">
              Sign In here
            </Link>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-400 text-center">
            Note: Administrator accounts can only be provisioned by System Management.
          </div>
        </div>
      </div>
    </div>
  );
};

