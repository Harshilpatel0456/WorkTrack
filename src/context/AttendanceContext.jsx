import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useApp } from './AppContext';
import { adminApi } from '../services/adminApi';

const AttendanceContext = createContext();

const localDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const formatStopwatch = (ms) => {
  if (ms == null || isNaN(ms) || ms < 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const AttendanceProvider = ({ children }) => {
  const { role, isAuthenticated } = useAuth();
  const { showToast } = useApp();

  const [todayShift, setTodayShift] = useState(null);
  const [myShiftRows, setMyShiftRows] = useState([]);
  const [activeAttendance, setActiveAttendance] = useState(() => {
    try {
      const cached = localStorage.getItem('worktrack_active_attendance');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [attendanceError, setAttendanceError] = useState('');
  const [punching, setPunching] = useState(false);
  const [stopwatchTime, setStopwatchTime] = useState('00:00:00');

  const isCheckedIn = Boolean(activeAttendance?.check_in && !activeAttendance?.check_out);
  const isCheckedOut = Boolean(activeAttendance?.check_out);

  // Sync to localStorage
  useEffect(() => {
    try {
      if (activeAttendance) {
        localStorage.setItem('worktrack_active_attendance', JSON.stringify(activeAttendance));
      } else {
        localStorage.removeItem('worktrack_active_attendance');
      }
    } catch {}
  }, [activeAttendance]);

  // Load attendance data
  const refreshAttendance = useCallback(async () => {
    const roleLower = (role || '').toLowerCase();
    if (!isAuthenticated || roleLower !== 'employee') return;

    try {
      const todayDateStr = localDate();
      const shiftRows = await adminApi.attendance.myShifts(todayDateStr);
      const rows = shiftRows || [];
      setMyShiftRows(rows);

      // Prioritize active open shift session (checked in, not checked out)
      const openShift = rows.find((row) => row.check_in && !row.check_out);
      // Or latest shift session for today
      const latestTodayShift = rows.slice().reverse().find((row) => row.shift_date === todayDateStr);
      const currentShift = openShift || latestTodayShift || rows[0];

      setTodayShift(currentShift || null);

      if (currentShift?.attendance) {
        setActiveAttendance(currentShift.attendance);
      } else {
        setActiveAttendance(null);
      }
      setAttendanceError('');
    } catch (err) {
      setAttendanceError(err.message || 'Error fetching shift attendance');
    }
  }, [isAuthenticated, role]);

  useEffect(() => {
    refreshAttendance();
  }, [refreshAttendance]);

  // Running stopwatch effect
  useEffect(() => {
    if (!activeAttendance?.check_in) {
      setStopwatchTime('00:00:00');
      return;
    }

    const checkInMs = new Date(activeAttendance.check_in).getTime();

    if (activeAttendance?.check_out) {
      const checkOutMs = new Date(activeAttendance.check_out).getTime();
      setStopwatchTime(formatStopwatch(checkOutMs - checkInMs));
      return;
    }

    const updateTimer = () => {
      const nowMs = Date.now();
      const elapsed = Math.max(0, nowMs - checkInMs);
      setStopwatchTime(formatStopwatch(elapsed));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeAttendance?.check_in, activeAttendance?.check_out]);

  // Multiple sessions metrics for today
  const todaySessions = myShiftRows.filter((row) => row.shift_date === localDate());
  const completedSessions = todaySessions.filter((row) => row.check_in && row.check_out);
  const totalCompletedHours = completedSessions.reduce((acc, row) => acc + (Number(row.duration_hours) || 0), 0);
  const currentSessionNumber = isCheckedIn
    ? todaySessions.length
    : (completedSessions.length + 1);

  // Check In action (supports multiple shifts / sessions)
  const checkIn = async (customAssignmentId) => {
    setPunching(true);
    try {
      // If current shift already has check_out recorded, pass undefined so backend auto-creates a new session
      const assignmentId = (todayShift && !todayShift.check_out)
        ? todayShift.shift_assignment_id
        : customAssignmentId;
      const res = await adminApi.attendance.checkIn(assignmentId);
      setActiveAttendance(res);
      showToast(`Shift session ${currentSessionNumber} started! Stopwatch running.`);
      await refreshAttendance();
      return res;
    } catch (err) {
      showToast(err.message || 'Check-in failed', 'error');
      throw err;
    } finally {
      setPunching(false);
    }
  };

  // Check Out action
  const checkOut = async (customAssignmentId) => {
    setPunching(true);
    try {
      const assignmentId = customAssignmentId || todayShift?.shift_assignment_id;
      const res = await adminApi.attendance.checkOut(assignmentId);
      setActiveAttendance(res);
      showToast(`Shift session completed! Working time recorded.`);
      await refreshAttendance();
      return res;
    } catch (err) {
      showToast(err.message || 'Check-out failed', 'error');
      throw err;
    } finally {
      setPunching(false);
    }
  };

  return (
    <AttendanceContext.Provider
      value={{
        todayShift,
        myShiftRows,
        todaySessions,
        completedSessions,
        totalCompletedHours,
        currentSessionNumber,
        activeAttendance,
        isCheckedIn,
        isCheckedOut,
        stopwatchTime,
        punching,
        attendanceError,
        checkIn,
        checkOut,
        refreshAttendance,
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
};

export const useAttendance = () => {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  return context;
};
