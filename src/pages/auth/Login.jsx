import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Shield, User, Building2, ArrowRight, Lock, Mail, Sparkles, CheckCircle2 } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('admin@worktrack.demo');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('admin');
  const { login, quickLoginAs } = useAuth();
  const navigate = useNavigate();

  const handlePresetSelect = (presetRole, presetEmail, presetPassword) => {
    setSelectedPreset(presetRole);
    setEmail(presetEmail);
    setPassword(presetPassword);
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const res = login(email, password);
    if (res.success) {
      if (res.role === 'admin') navigate('/admin');
      else if (res.role === 'employee') navigate('/employee');
      else if (res.role === 'customer') navigate('/customer');
    } else {
      setError(res.message || 'Invalid credentials');
    }
  };

  const handleInstantLogin = (role) => {
    quickLoginAs(role);
    if (role === 'admin') navigate('/admin');
    else if (role === 'employee') navigate('/employee');
    else if (role === 'customer') navigate('/customer');
  };

  return (
    <div className="min-h-screen bg-[#F6F8FC] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      {/* Top Tagline */}
      <div className="text-center mb-8 max-w-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#245CE2] text-xs font-bold mb-4 shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          Enterprise Workforce Management Platform
        </div>
        <div className="flex items-center justify-center gap-2.5 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-[#245CE2] flex items-center justify-center text-white shadow-card font-black text-xl">
            W
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Work<span className="text-[#245CE2]">Track</span>
          </h1>
        </div>
        <p className="text-sm font-semibold text-slate-500">
          Smart Workforce. Transparent Reporting.
        </p>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Preset Cards */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              One-Click Evaluator Personas
            </h2>
            <p className="text-xs text-slate-600 mb-4">
              Select any role below to prefill credentials or launch instantly into that dashboard.
            </p>

            <div className="space-y-3">
              {/* Admin Card */}
              <div
                onClick={() => handlePresetSelect('admin', 'admin@worktrack.demo', 'admin123')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  selectedPreset === 'admin'
                    ? 'border-[#245CE2] bg-blue-50/60 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-blue-100 text-[#245CE2]">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">Administrator</h3>
                      <p className="text-[11px] text-slate-500">admin@worktrack.demo</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInstantLogin('admin');
                    }}
                    className="text-[11px] font-bold text-[#245CE2] hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    Launch &rarr;
                  </button>
                </div>
              </div>

              {/* Employee Card */}
              <div
                onClick={() => handlePresetSelect('employee', 'employee@worktrack.demo', 'employee123')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  selectedPreset === 'employee'
                    ? 'border-[#245CE2] bg-blue-50/60 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">Employee (Aarav Shah)</h3>
                      <p className="text-[11px] text-slate-500">employee@worktrack.demo</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInstantLogin('employee');
                    }}
                    className="text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    Launch &rarr;
                  </button>
                </div>
              </div>

              {/* Customer Card */}
              <div
                onClick={() => handlePresetSelect('customer', 'customer@worktrack.demo', 'customer123')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  selectedPreset === 'customer'
                    ? 'border-[#245CE2] bg-blue-50/60 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">Customer (Acme Industries)</h3>
                      <p className="text-[11px] text-slate-500">customer@worktrack.demo</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInstantLogin('customer');
                    }}
                    className="text-[11px] font-bold text-purple-700 hover:bg-purple-100 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    Launch &rarr;
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>Full LocalStorage state simulation enabled</span>
            </div>
          </div>
        </div>

        {/* Right Column: Sign In Form */}
        <div className="lg:col-span-7">
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-card">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">Sign in to your account</h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter your credentials or use the presets on the left.
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@worktrack.demo"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#245CE2] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#245CE2] focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                  <input type="checkbox" defaultChecked className="rounded text-[#245CE2] focus:ring-[#245CE2]" />
                  <span>Remember demo session</span>
                </label>
                <span className="text-[#245CE2] font-semibold">Demo credentials valid</span>
              </div>

              <button
                type="submit"
                className="w-full mt-4 bg-[#245CE2] hover:bg-[#1A45B0] text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20"
              >
                <span>Authorize & Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>WorkTrack v1.0 Enterprise Prototype</span>
              <span>College Faculty Demo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
