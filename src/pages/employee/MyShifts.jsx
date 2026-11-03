import React, { useCallback, useEffect, useState } from 'react';
import { Badge } from '../../components/common/Badge';
import { adminApi } from '../../services/adminApi';
import { Building2, CalendarDays, Clock, MapPin, Phone, ShieldCheck } from 'lucide-react';

export const MyShifts = () => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadShifts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setShifts(await adminApi.schedules.list());
    } catch (loadError) {
      setError(loadError.message || 'Unable to load your shift schedule.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadShifts(); }, [loadShifts]);

  const activeCount = shifts.filter((shift) => (
    shift.status === 'SCHEDULED' || shift.status === 'IN_PROGRESS'
  )).length;

  return (
    <div className="space-y-6">
      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</div>}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-[#245CE2]" /> My Scheduled Shifts
          </h2>
          <p className="text-xs text-slate-500 mt-1">Shift details assigned to your authenticated employee account.</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-1.5 rounded-xl text-xs font-bold self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4 text-emerald-600" /> {activeCount} Active Schedules
        </div>
      </div>

      {loading ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">Loading your shifts…</div>
      ) : shifts.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">No shifts have been scheduled for your account.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {shifts.map((shift) => (
            <article key={shift.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-blue-50 text-[#245CE2]">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{shift.customerName}</h3>
                    <p className="text-[11px] text-slate-500">{shift.customerIndustry}</p>
                  </div>
                </div>
                <Badge status={shift.status} />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-slate-500"><Clock className="w-3.5 h-3.5 text-[#245CE2]" />{shift.shiftName}</span>
                  <span className="font-bold text-slate-800">{shift.shiftStartTime?.slice(0, 5)}–{shift.shiftEndTime?.slice(0, 5)}{shift.isOvernight ? ' (+1 day)' : ''}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-500"><CalendarDays className="w-3.5 h-3.5" />Shift date</span>
                  <span className="font-mono text-slate-700">{shift.shiftDate}</span>
                </div>
              </div>

              {shift.customerAddress && (
                <div className="mt-3 flex items-start gap-2 text-[11px] text-slate-600">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" /> {shift.customerAddress}
                </div>
              )}
              {(shift.customerContactPerson || shift.customerPhone) && (
                <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-600">
                  <Phone className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  {shift.customerContactPerson}{shift.customerPhone ? ` (${shift.customerPhone})` : ''}
                </div>
              )}
              {shift.notes && <p className="mt-3 rounded-lg bg-blue-50/50 border border-blue-100 p-2.5 text-[11px] text-blue-900">{shift.notes}</p>}
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
