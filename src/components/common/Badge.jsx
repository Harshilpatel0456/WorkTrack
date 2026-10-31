import React from 'react';

export const Badge = ({ status, variant, className = '' }) => {
  const getBadgeClass = () => {
    if (variant) {
      switch (variant) {
        case 'primary': return 'bg-blue-50 text-blue-700 border-blue-200';
        case 'success': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        case 'warning': return 'bg-amber-50 text-amber-700 border-amber-200';
        case 'danger': return 'bg-rose-50 text-rose-700 border-rose-200';
        case 'purple': return 'bg-purple-50 text-purple-700 border-purple-200';
        default: return 'bg-slate-50 text-slate-700 border-slate-200';
      }
    }

    const s = String(status || '').toLowerCase();
    if (s.includes('active') || s.includes('approved') || s.includes('checked in') || s.includes('submitted')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (s.includes('checked out') || s.includes('completed')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (s.includes('scheduled') || s.includes('pending') || s.includes('draft') || s.includes('review')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (s.includes('inactive') || s.includes('suspended') || s.includes('missed') || s.includes('revoked') || s.includes('rejected')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getDotClass = () => {
    const s = String(status || '').toLowerCase();
    if (s.includes('active') || s.includes('approved') || s.includes('checked in') || s.includes('submitted')) {
      return 'bg-emerald-500';
    }
    if (s.includes('checked out') || s.includes('completed')) {
      return 'bg-blue-500';
    }
    if (s.includes('scheduled') || s.includes('pending') || s.includes('draft')) {
      return 'bg-amber-500';
    }
    if (s.includes('inactive') || s.includes('suspended') || s.includes('missed') || s.includes('revoked')) {
      return 'bg-rose-500';
    }
    return 'bg-slate-400';
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getBadgeClass()} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${getDotClass()}`}></span>
      {status}
    </span>
  );
};
