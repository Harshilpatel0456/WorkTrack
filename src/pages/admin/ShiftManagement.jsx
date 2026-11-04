import React, { useCallback, useEffect, useState } from 'react';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { adminApi } from '../../services/adminApi';
import {
  Calendar, Clock, Edit2, Moon, Plus, Power, Sun, Sunset, Trash2, XCircle,
} from 'lucide-react';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const EMPTY_SHIFT = {
  name: '', startTime: '08:00', endTime: '16:00', description: '',
  gracePeriodMinutes: 15, isOvernight: false,
  workingDays: [0, 1, 2, 3, 4, 5, 6], is_active: true,
};

const localDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const timeValue = (value) => (value || '').slice(0, 5);
const minutesOfDay = (value) => {
  const [hours, minutes] = timeValue(value).split(':').map(Number);
  return hours * 60 + minutes;
};

const dateInMinutes = (value) => {
  const [year, month, day] = value.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / 60000;
};

const getScheduleConflict = ({ schedules, assignments, shifts, schedule, excludeId }) => {
  const assignment = assignments.find((item) => item.id === schedule.assignmentId);
  const shift = shifts.find((item) => item.id === schedule.shiftId);
  if (!assignment || !shift || !schedule.shiftDate) return '';

  const weekday = (new Date(`${schedule.shiftDate}T00:00:00Z`).getUTCDay() + 6) % 7;
  if (!(shift.workingDays || []).includes(weekday)) {
    return `${shift.name} does not run on the selected day. Choose another date or shift.`;
  }

  const start = dateInMinutes(schedule.shiftDate) + minutesOfDay(shift.startTime);
  const duration = minutesOfDay(shift.endTime) - minutesOfDay(shift.startTime)
    + (shift.isOvernight ? 1440 : 0);
  const end = start + duration;

  const conflictingSchedule = schedules.find((item) => {
    if (
      item.id === excludeId
      || item.employeeId !== assignment.employeeId
      || !['SCHEDULED', 'IN_PROGRESS'].includes(item.status)
    ) return false;

    const existingStart = dateInMinutes(item.shiftDate) + minutesOfDay(item.shiftStartTime);
    const existingDuration = minutesOfDay(item.shiftEndTime) - minutesOfDay(item.shiftStartTime)
      + (item.isOvernight ? 1440 : 0);
    const existingEnd = existingStart + existingDuration;
    return start < existingEnd && existingStart < end;
  });

  if (!conflictingSchedule) return '';
  return `${assignment.employeeName} already has ${conflictingSchedule.shiftName} scheduled on ${conflictingSchedule.shiftDate} (${timeValue(conflictingSchedule.shiftStartTime)}–${timeValue(conflictingSchedule.shiftEndTime)}). Choose a different shift or date.`;
};

const findAvailableSchedule = ({ assignments, shifts, schedules, shiftDate }) => {
  for (const assignment of assignments) {
    for (const shift of shifts.filter((item) => item.is_active)) {
      const candidate = { assignmentId: assignment.id, shiftId: shift.id, shiftDate };
      if (!getScheduleConflict({ schedules, assignments, shifts, schedule: candidate })) {
        return candidate;
      }
    }
  }
  return null;
};

export const ShiftManagement = () => {
  const [shifts, setShifts] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [shiftModal, setShiftModal] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [shiftForm, setShiftForm] = useState(EMPTY_SHIFT);
  const [scheduleModal, setScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    assignmentId: '', shiftId: '', shiftDate: localDate(),
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [shiftRows, scheduleRows, assignmentRows, employeeRows, customerRows] = await Promise.all([
        adminApi.shifts.list(),
        adminApi.schedules.list(),
        adminApi.assignments.list(),
        adminApi.employees.list(),
        adminApi.customers.list(),
      ]);
      setShifts(shiftRows);
      setSchedules(scheduleRows);
      setAssignments(assignmentRows);
      setEmployees(employeeRows);
      setCustomers(customerRows);
      return true;
    } catch (loadError) {
      setError(loadError.message || 'Unable to load shift management data.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));
  const customerById = new Map(customers.map((customer) => [customer.id, customer]));
  const activeAssignments = assignments.filter((assignment) => (
    assignment.status === 'ACTIVE'
    && employeeById.get(assignment.employeeId)?.status === 'ACTIVE'
    && employeeById.get(assignment.employeeId)?.is_active !== false
    && customerById.get(assignment.customerId)?.accountStatus !== 'SUSPENDED'
  ));
  const scheduleConflict = getScheduleConflict({
    schedules,
    assignments: activeAssignments,
    shifts,
    schedule: scheduleForm,
    excludeId: editingSchedule?.id,
  });

  const notifyAfter = async (message) => {
    if (await loadData()) setNotice(message);
  };

  const saveShift = async (event) => {
    event.preventDefault();
    const overnight = shiftForm.endTime < shiftForm.startTime;
    if (shiftForm.endTime === shiftForm.startTime || overnight !== shiftForm.isOvernight) {
      setError('Use distinct times and enable overnight when the end time is earlier than the start.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: shiftForm.name,
        startTime: shiftForm.startTime,
        endTime: shiftForm.endTime,
        gracePeriodMinutes: Number(shiftForm.gracePeriodMinutes),
        description: shiftForm.description,
        isOvernight: overnight,
        workingDays: shiftForm.workingDays,
        is_active: shiftForm.is_active,
      };
      if (editingShift) await adminApi.shifts.update(editingShift.id, payload);
      else await adminApi.shifts.create(payload);
      setShiftModal(false);
      setEditingShift(null);
      await notifyAfter(editingShift ? 'Shift template updated.' : 'Shift template created.');
    } catch (saveError) {
      setError(saveError.message || 'Unable to save shift template.');
    } finally {
      setSaving(false);
    }
  };

  const toggleShiftDay = (day) => {
    const days = shiftForm.workingDays.includes(day)
      ? shiftForm.workingDays.filter((item) => item !== day)
      : [...shiftForm.workingDays, day].sort((a, b) => a - b);
    setShiftForm({ ...shiftForm, workingDays: days });
  };

  const saveSchedule = async (event) => {
    event.preventDefault();
    if (scheduleConflict) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        assignmentId: scheduleForm.assignmentId,
        shiftId: scheduleForm.shiftId,
        shiftDate: scheduleForm.shiftDate,
      };
      if (editingSchedule) await adminApi.schedules.update(editingSchedule.id, payload);
      else await adminApi.schedules.create(payload);
      setScheduleModal(false);
      setEditingSchedule(null);
      await notifyAfter(editingSchedule ? 'Shift assignment updated.' : 'Employee scheduled.');
    } catch (saveError) {
      setError(saveError.message || 'Unable to save shift assignment.');
    } finally {
      setSaving(false);
    }
  };

  const cancelSchedule = async (schedule) => {
    setSaving(true);
    setError('');
    try {
      await adminApi.schedules.cancel(schedule.id);
      await notifyAfter('Shift assignment cancelled.');
    } catch (saveError) {
      setError(saveError.message || 'Unable to cancel shift assignment.');
    } finally {
      setSaving(false);
    }
  };

  const handleShiftToggle = async (shift) => {
    setSaving(true);
    setError('');
    try {
      await adminApi.shifts.update(shift.id, { is_active: !shift.is_active });
      await notifyAfter(`Shift ${shift.is_active ? 'deactivated' : 'activated'}.`);
    } catch (saveError) {
      setError(saveError.message || 'Unable to change shift status.');
    } finally {
      setSaving(false);
    }
  };

  const deleteShift = async (shift) => {
    if (!window.confirm(`Delete "${shift.name}"? Shifts with existing schedules must be deactivated instead.`)) return;
    setSaving(true);
    setError('');
    try {
      await adminApi.shifts.remove(shift.id);
      await notifyAfter('Shift template deleted.');
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to delete shift template.');
    } finally {
      setSaving(false);
    }
  };

  const openNewShift = () => {
    setEditingShift(null);
    setShiftForm({ ...EMPTY_SHIFT, workingDays: [...EMPTY_SHIFT.workingDays] });
    setError('');
    setShiftModal(true);
  };

  const openEditShift = (shift) => {
    setEditingShift(shift);
    setShiftForm({
      ...EMPTY_SHIFT,
      ...shift,
      startTime: timeValue(shift.startTime),
      endTime: timeValue(shift.endTime),
      gracePeriodMinutes: shift.gracePeriodMinutes ?? 15,
      workingDays: shift.workingDays || [0, 1, 2, 3, 4, 5, 6],
    });
    setError('');
    setShiftModal(true);
  };

  const openNewSchedule = () => {
    setEditingSchedule(null);
    const shiftDate = localDate();
    const availableSchedule = findAvailableSchedule({
      assignments: activeAssignments,
      shifts,
      schedules,
      shiftDate,
    });
    setScheduleForm(availableSchedule || {
      assignmentId: activeAssignments[0]?.id || '',
      shiftId: shifts.find((shift) => shift.is_active)?.id || '',
      shiftDate,
    });
    setError('');
    setScheduleModal(true);
  };

  const openEditSchedule = (schedule) => {
    setEditingSchedule(schedule);
    setScheduleForm({
      assignmentId: schedule.assignmentId,
      shiftId: schedule.shiftId,
      shiftDate: schedule.shiftDate,
    });
    setError('');
    setScheduleModal(true);
  };

  const getShiftIcon = (name) => {
    const value = name.toLowerCase();
    if (value.includes('morning')) return <Sun className="w-5 h-5 text-amber-500" />;
    if (value.includes('afternoon')) return <Sunset className="w-5 h-5 text-orange-500" />;
    return <Moon className="w-5 h-5 text-indigo-500" />;
  };

  return (
    <div className="space-y-6">
      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">{notice}</div>}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-[#245CE2]" /> Shift Templates & Schedules
          </h2>
          <p className="text-xs text-slate-500 mt-1">Configure recurring shift windows and schedule employees for specific dates.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={openNewShift} className="bg-white border border-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Template
          </button>
          <button onClick={openNewSchedule} disabled={!activeAssignments.length || !shifts.some((shift) => shift.is_active)} className="bg-[#245CE2] disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-md">
            <Calendar className="w-4 h-4" /> Schedule Employee
          </button>
        </div>
      </div>

      <section>
        <h3 className="text-sm font-bold text-slate-900 mb-3">Shift Templates</h3>
        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-400">Loading shifts…</div>
        ) : shifts.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-400">No shift templates yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {shifts.map((shift) => {
              const people = schedules.filter((item) => item.shiftId === shift.id && item.status !== 'CANCELLED');
              return (
                <article key={shift.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">{getShiftIcon(shift.name)}</div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{shift.name}</h4>
                        <p className="text-[11px] font-mono font-bold text-[#245CE2] mt-0.5">
                          {timeValue(shift.startTime)} – {timeValue(shift.endTime)}{shift.isOvernight ? ' (+1 day)' : ''}
                        </p>
                      </div>
                    </div>
                    <Badge status={shift.is_active ? 'Active' : 'Inactive'} />
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed mt-3 min-h-8">{shift.description || 'No description provided.'}</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {(shift.workingDays || []).map((day) => (
                      <span key={day} className="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">{WEEKDAYS[day]}</span>
                    ))}
                  </div>
                  <p className="mt-3 text-[11px] text-slate-500">{people.length} scheduled shifts</p>
                  <div className="mt-4 flex justify-end gap-1 border-t border-slate-100 pt-3">
                    <button onClick={() => openEditShift(shift)} title="Edit template" className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleShiftToggle(shift)} disabled={saving} title={shift.is_active ? 'Deactivate template' : 'Activate template'} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><Power className="w-4 h-4" /></button>
                    <button onClick={() => deleteShift(shift)} disabled={saving} title="Delete template" className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Employee Schedule</h3>
          <p className="text-xs text-slate-500 mt-1">Schedules are date-specific; overlapping shifts for an employee are rejected.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Date</th><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Shift</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="6" className="p-8 text-center text-slate-400">Loading schedules…</td></tr>
              ) : schedules.length === 0 ? (
                <tr><td colSpan="6" className="p-8 text-center text-slate-400">No employee shifts scheduled.</td></tr>
              ) : schedules.map((schedule) => (
                <tr key={schedule.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-mono">{schedule.shiftDate}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{schedule.employeeName} <span className="text-slate-400">({schedule.employeeCode})</span></td>
                  <td className="px-4 py-3">{schedule.customerName}</td>
                  <td className="px-4 py-3">{schedule.shiftName} <span className="text-slate-500">{timeValue(schedule.shiftStartTime)}–{timeValue(schedule.shiftEndTime)}</span></td>
                  <td className="px-4 py-3"><Badge status={schedule.status} /></td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {schedule.status === 'SCHEDULED' && <>
                      <button onClick={() => openEditSchedule(schedule)} disabled={saving} title="Edit schedule" className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => cancelSchedule(schedule)} disabled={saving} title="Cancel schedule" className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><XCircle className="w-4 h-4" /></button>
                    </>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Modal isOpen={shiftModal} onClose={() => setShiftModal(false)} title={editingShift ? 'Edit Shift Template' : 'Create Shift Template'} subtitle="Set shift hours and recurring working days.">
        <form onSubmit={saveShift} className="space-y-4 text-xs">
          <label className="block font-bold text-slate-700">Shift name *
            <input required maxLength={100} value={shiftForm.name} onChange={(event) => setShiftForm({ ...shiftForm, name: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 font-normal" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="font-bold text-slate-700">Start time *
              <input type="time" required value={shiftForm.startTime} onChange={(event) => {
                const startTime = event.target.value;
                setShiftForm({ ...shiftForm, startTime, isOvernight: shiftForm.endTime < startTime });
              }} className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 font-normal" />
            </label>
            <label className="font-bold text-slate-700">End time *
              <input type="time" required value={shiftForm.endTime} onChange={(event) => {
                const endTime = event.target.value;
                setShiftForm({ ...shiftForm, endTime, isOvernight: endTime < shiftForm.startTime });
              }} className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 font-normal" />
            </label>
          </div>
          <label className="block font-bold text-slate-700">Late arrival grace period (minutes)
            <input type="number" min="0" max="240" required value={shiftForm.gracePeriodMinutes} onChange={(event) => setShiftForm({ ...shiftForm, gracePeriodMinutes: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 font-normal" />
          </label>
          <label className="block font-bold text-slate-700">Description
            <textarea rows={2} value={shiftForm.description || ''} onChange={(event) => setShiftForm({ ...shiftForm, description: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 font-normal" />
          </label>
          <fieldset>
            <legend className="font-bold text-slate-700 mb-2">Working days *</legend>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((day, index) => (
                <label key={day} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2">
                  <input type="checkbox" checked={shiftForm.workingDays.includes(index)} onChange={() => toggleShiftDay(index)} />
                  {day}
                </label>
              ))}
            </div>
          </fieldset>
          {editingShift && <label className="flex items-center gap-2 font-semibold text-slate-700"><input type="checkbox" checked={shiftForm.is_active} onChange={(event) => setShiftForm({ ...shiftForm, is_active: event.target.checked })} /> Active template</label>}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={() => setShiftModal(false)} className="px-4 py-2.5 text-slate-600 rounded-xl">Cancel</button>
            <button disabled={saving || !shiftForm.workingDays.length} className="px-5 py-2.5 rounded-xl bg-[#245CE2] font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : editingShift ? 'Save Changes' : 'Create Shift'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={scheduleModal} onClose={() => setScheduleModal(false)} title={editingSchedule ? 'Edit Employee Schedule' : 'Schedule Employee'} subtitle="Assign an employee-customer relationship to a shift and date.">
        <form onSubmit={saveSchedule} className="space-y-4 text-xs">
          <label className="block font-bold text-slate-700">Employee and customer assignment *
            <select required value={scheduleForm.assignmentId} onChange={(event) => setScheduleForm({ ...scheduleForm, assignmentId: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 font-normal">
              {activeAssignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>{assignment.employeeName} — {assignment.customerName}</option>
              ))}
            </select>
          </label>
          <label className="block font-bold text-slate-700">Shift template *
            <select required value={scheduleForm.shiftId} onChange={(event) => setScheduleForm({ ...scheduleForm, shiftId: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 font-normal">
              {shifts.filter((shift) => shift.is_active).map((shift) => <option key={shift.id} value={shift.id}>{shift.name} ({timeValue(shift.startTime)}–{timeValue(shift.endTime)})</option>)}
            </select>
          </label>
          <label className="block font-bold text-slate-700">Shift date *
            <input type="date" required value={scheduleForm.shiftDate} onChange={(event) => setScheduleForm({ ...scheduleForm, shiftDate: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 font-normal" />
          </label>
          {scheduleConflict && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{scheduleConflict}</p>}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={() => setScheduleModal(false)} className="px-4 py-2.5 text-slate-600 rounded-xl">Cancel</button>
            <button disabled={saving || !!scheduleConflict || !activeAssignments.length || !shifts.some((shift) => shift.is_active)} className="px-5 py-2.5 rounded-xl bg-[#245CE2] font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : editingSchedule ? 'Save Changes' : 'Schedule'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
