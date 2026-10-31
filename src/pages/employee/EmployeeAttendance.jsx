import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Badge } from '../../components/common/Badge';
import {
  Clock,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Building2,
  ShieldCheck,
  Timer,
  PlayCircle,
  StopCircle,
} from 'lucide-react';

export const EmployeeAttendance = () => {
  const { selectedEmployeeId } = useAuth();
  const { employees, assignments, attendance, checkInEmployee, checkOutEmployee, shifts } = useApp();

  const currentEmp = employees.find((e) => e.id === selectedEmployeeId) || employees[0];

  // Current live clock state
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayAttendance = attendance.find(
    (a) => a.employeeId === currentEmp.id && a.date === todayDateStr
  );

  const myHistory = attendance.filter((a) => a.employeeId === currentEmp.id);

  const empAssignments = assignments.filter(
    (a) => a.employeeId === currentEmp.id && a.status === 'Approved'
  );
  const primaryAssignment = empAssignments[0];
  const primaryShift = shifts.find((s) => s.id === (primaryAssignment ? primaryAssignment.shiftId : currentEmp.currentShiftId)) || shifts[0];

  const handleCheckIn = () => {
    checkInEmployee(currentEmp.id);
  };

  const handleCheckOut = () => {
    checkOutEmployee(currentEmp.id);
  };

  const isCheckedIn = todayAttendance?.status === 'Checked In';
  const isCheckedOut = todayAttendance?.status === 'Checked Out';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Clock className="w-6 h-6 text-[#245CE2]" />
          Shift Attendance & Biometric Punch Terminal
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Record shifts on-duty and departure timestamps. Enforces attendance verification before check-out.
        </p>
      </div>

      {/* Main Punch Clock Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-card flex flex-col md:flex-row items-center justify-between gap-8">
        {/* Left: Live digital clock display */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#245CE2] text-xs font-bold mb-3">
            <Timer className="w-3.5 h-3.5" />
            Synchronized System Clock
          </div>

          <div className="text-4xl sm:text-5xl font-black text-slate-900 font-mono tracking-tight">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
          </div>

          <p className="text-xs text-slate-500 font-medium mt-2 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-400" />
            {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 flex items-center gap-4">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Allocated Client</span>
              <span className="font-bold text-slate-800">{primaryAssignment?.customerName || 'Acme Industries'}</span>
            </div>
            <div className="w-[1px] h-6 bg-slate-200"></div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Assigned Window</span>
              <span className="font-bold text-[#245CE2]">{primaryShift.name}</span>
            </div>
          </div>
        </div>

        {/* Right: Interactive Punch Controls */}
        <div className="w-full md:w-96 bg-slate-50 p-6 rounded-2xl border border-slate-200/80 flex flex-col justify-between gap-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Today's Punch Status
            </span>
            <Badge status={todayAttendance ? todayAttendance.status : 'Scheduled'} />
          </div>

          {/* Current Punch Summary */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Check-In Recorded:</span>
              <span className="font-bold font-mono text-emerald-700">
                {todayAttendance?.checkInTime || '--:--'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Check-Out Recorded:</span>
              <span className="font-bold font-mono text-blue-700">
                {todayAttendance?.checkOutTime || '--:--'}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-1.5">
              <span className="text-slate-400">Working Duration:</span>
              <span className="font-bold font-mono text-slate-900">
                {todayAttendance?.duration || '--'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleCheckIn}
              disabled={isCheckedIn || isCheckedOut}
              className={`py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md ${
                isCheckedIn || isCheckedOut
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
              }`}
            >
              <PlayCircle className="w-4 h-4" />
              Check In
            </button>

            <button
              onClick={handleCheckOut}
              disabled={!isCheckedIn}
              className={`py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md ${
                !isCheckedIn
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
              }`}
            >
              <StopCircle className="w-4 h-4" />
              Check Out
            </button>
          </div>

          {/* Validation note */}
          <div className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Strict check-out validation enabled</span>
          </div>
        </div>
      </div>

      {/* Attendance History Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Personal Shift Attendance History</h3>
          <span className="text-xs text-slate-400 font-medium">
            Showing records for {currentEmp.name}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 sm:px-6">Date</th>
                <th className="py-3 px-4">Client Enterprise</th>
                <th className="py-3 px-4">Shift Name</th>
                <th className="py-3 px-4">Check-In Time</th>
                <th className="py-3 px-4">Check-Out Time</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {myHistory.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    No attendance records logged yet.
                  </td>
                </tr>
              ) : (
                myHistory.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 sm:px-6 font-mono font-bold text-slate-900">
                      {att.date}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {att.customerName}
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px]">
                        {att.shiftName}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-700 font-semibold">
                      {att.checkInTime || '--'}
                    </td>
                    <td className="py-3 px-4 font-mono text-blue-700 font-semibold">
                      {att.checkOutTime || '--'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-900 font-bold">
                      {att.duration}
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={att.status} />
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate text-[11px]">
                      {att.notes || '--'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
