import React, { createContext, useContext, useState, useEffect } from 'react';
import { storageService } from '../services/storageService';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [customers, setCustomers] = useState(() => storageService.getCustomers());
  const [employees, setEmployees] = useState(() => storageService.getEmployees());
  const [shifts, setShifts] = useState(() => storageService.getShifts());
  const [assignments, setAssignments] = useState(() => storageService.getAssignments());
  const [attendance, setAttendance] = useState(() => storageService.getAttendance());
  const [reports, setReports] = useState(() => storageService.getReports());
  const [notifications, setNotifications] = useState(() => storageService.getNotifications());
  const [notificationSettings, setNotificationSettings] = useState(() => storageService.getNotificationSettings());
  const [cameras, setCameras] = useState(() => storageService.getCameras());
  const [surveillanceBatches, setSurveillanceBatches] = useState(() => storageService.getSurveillanceBatches());
  const [toast, setToast] = useState(null);

  // Sidebar collapsed state with localStorage persistence
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('worktrack_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('worktrack_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Sync to LocalStorage on updates
  useEffect(() => { storageService.saveCustomers(customers); }, [customers]);
  useEffect(() => { storageService.saveEmployees(employees); }, [employees]);
  useEffect(() => { storageService.saveShifts(shifts); }, [shifts]);
  useEffect(() => { storageService.saveAssignments(assignments); }, [assignments]);
  useEffect(() => { storageService.saveAttendance(attendance); }, [attendance]);
  useEffect(() => { storageService.saveReports(reports); }, [reports]);
  useEffect(() => { storageService.saveNotifications(notifications); }, [notifications]);
  useEffect(() => { storageService.saveNotificationSettings(notificationSettings); }, [notificationSettings]);
  useEffect(() => { storageService.saveCameras(cameras); }, [cameras]);
  useEffect(() => { storageService.saveSurveillanceBatches(surveillanceBatches); }, [surveillanceBatches]);

  // Show Toast helper
  const showToast = (message, type = 'success') => {
    setToast({ id: Date.now(), message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Helper to trigger simulated notification
  const triggerNotification = ({ targetRole, targetId, targetCustomerId, targetEmployeeId, type, title, message, link, meta }) => {
    const newNotif = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      targetRole,
      targetId: targetId || (targetRole === 'admin' ? 'admin' : undefined),
      targetCustomerId,
      targetEmployeeId,
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      isRead: false,
      link: link || '#',
      meta: meta || {},
    };

    setNotifications(prev => [newNotif, ...prev]);
  };

  // ================= EMPLOYEES =================
  const addEmployee = (empData) => {
    const newId = `emp-${Date.now()}`;
    const newEmp = {
      id: newId,
      employeeId: empData.employeeId || `EMP-${Math.floor(100 + Math.random() * 900)}`,
      name: empData.name,
      email: empData.email,
      phone: empData.phone,
      joiningDate: empData.joiningDate || new Date().toISOString().split('T')[0],
      status: empData.status || 'Active',
      roleTitle: empData.roleTitle || 'Field Specialist',
      department: empData.department || 'Operations',
      avatar: empData.avatar || `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 1000000)}?w=150&auto=format&fit=crop&q=80`,
      assignedCustomerIds: empData.assignedCustomerIds || [],
      currentShiftId: empData.currentShiftId || 'shift-1',
    };
    setEmployees(prev => [newEmp, ...prev]);
    showToast(`Employee ${newEmp.name} registered successfully`);
    return newEmp;
  };

  const updateEmployee = (id, updatedFields) => {
    setEmployees(prev => prev.map(emp => emp.id === id ? { ...emp, ...updatedFields } : emp));
    showToast('Employee information updated');
  };

  const toggleEmployeeStatus = (id) => {
    setEmployees(prev => prev.map(emp => {
      if (emp.id === id) {
        const nextStatus = emp.status === 'Active' ? 'Inactive' : 'Active';
        showToast(`Employee status changed to ${nextStatus}`, 'info');
        return { ...emp, status: nextStatus };
      }
      return emp;
    }));
  };

  // ================= CUSTOMERS =================
  const addCustomer = (custData) => {
    const newId = `cust-${Date.now()}`;
    const colors = ['#245CE2', '#0EA5E9', '#8B5CF6', '#10B981', '#F59E0B'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newCust = {
      id: newId,
      companyName: custData.companyName,
      industry: custData.industry || 'Enterprise Services',
      contactPerson: custData.contactPerson,
      email: custData.email,
      phone: custData.phone,
      address: custData.address,
      accountStatus: custData.accountStatus || 'Active',
      assignedEmployeesCount: 0,
      logoLetter: custData.companyName.charAt(0).toUpperCase(),
      color: randomColor,
      notes: custData.notes || '',
      joinedDate: new Date().toISOString().split('T')[0],
    };
    setCustomers(prev => [newCust, ...prev]);
    showToast(`Customer account for ${newCust.companyName} created`);
    return newCust;
  };

  const updateCustomer = (id, updatedFields) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updatedFields } : c));
    showToast('Customer profile updated');
  };

  const toggleCustomerStatus = (id) => {
    setCustomers(prev => prev.map(c => {
      if (c.id === id) {
        const nextStatus = c.accountStatus === 'Active' ? 'Suspended' : 'Active';
        showToast(`Customer account set to ${nextStatus}`, 'info');
        return { ...c, accountStatus: nextStatus };
      }
      return c;
    }));
  };

  // ================= SHIFTS =================
  const createShift = (shiftData) => {
    const newShift = {
      id: `shift-${Date.now()}`,
      name: shiftData.name,
      startTime: shiftData.startTime,
      endTime: shiftData.endTime,
      time24Start: shiftData.time24Start || '09:00',
      time24End: shiftData.time24End || '17:00',
      description: shiftData.description,
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      dotColor: 'bg-blue-600',
      activeCount: 0,
    };
    setShifts(prev => [...prev, newShift]);
    showToast(`New shift schedule '${newShift.name}' added`);
    return newShift;
  };

  const updateShift = (id, updatedFields) => {
    setShifts(prev => prev.map(s => s.id === id ? { ...s, ...updatedFields } : s));
    showToast('Shift timing updated');
  };

  // ================= ASSIGNMENTS =================
  const createAssignment = ({ customerId, employeeId, shiftId, assignmentDate, notes }) => {
    // Duplicate check: Prevent assigning same employee to same customer on same shift
    const existing = assignments.find(a => 
      a.customerId === customerId && 
      a.employeeId === employeeId && 
      a.shiftId === shiftId && 
      a.status === 'Approved'
    );

    if (existing) {
      showToast('This employee is already actively assigned to this shift for this customer', 'error');
      return { success: false, error: 'Duplicate allocation' };
    }

    const customer = customers.find(c => c.id === customerId);
    const employee = employees.find(e => e.id === employeeId);
    const shift = shifts.find(s => s.id === shiftId);

    const newAssignment = {
      id: `asg-${Date.now()}`,
      customerId,
      customerName: customer ? customer.companyName : 'Customer',
      employeeId,
      employeeName: employee ? employee.name : 'Employee',
      shiftId,
      shiftName: shift ? `${shift.name} (${shift.startTime} – ${shift.endTime})` : 'Assigned Shift',
      assignmentDate: assignmentDate || new Date().toISOString().split('T')[0],
      status: 'Approved', // Auto-approved by Admin action
      approvedBy: 'Admin (System)',
      notes: notes || 'Direct deployment approved by Admin.',
    };

    setAssignments(prev => [newAssignment, ...prev]);

    // Update customer assigned employee count and employee assignedCustomerIds
    setEmployees(prev => prev.map(e => {
      if (e.id === employeeId) {
        const ids = e.assignedCustomerIds || [];
        return {
          ...e,
          assignedCustomerIds: ids.includes(customerId) ? ids : [...ids, customerId],
          currentShiftId: shiftId,
        };
      }
      return e;
    }));

    setCustomers(prev => prev.map(c => {
      if (c.id === customerId) {
        return { ...c, assignedEmployeesCount: (c.assignedEmployeesCount || 0) + 1 };
      }
      return c;
    }));

    // Trigger notification to employee
    triggerNotification({
      targetRole: 'employee',
      targetEmployeeId: employeeId,
      type: 'assignment_new',
      title: 'New Approved Shift Assignment',
      message: `You have been allocated to ${customer?.companyName} for ${shift?.name}.`,
      link: '/employee/shifts',
      meta: { customer: customer?.companyName, shift: shift?.name }
    });

    showToast(`Assignment created: ${employee?.name} assigned to ${customer?.companyName}`);
    return { success: true, assignment: newAssignment };
  };

  const updateAssignmentStatus = (assignmentId, newStatus) => {
    setAssignments(prev => prev.map(a => {
      if (a.id === assignmentId) {
        return { ...a, status: newStatus };
      }
      return a;
    }));
    showToast(`Assignment marked as ${newStatus}`);
  };

  // ================= ATTENDANCE =================
  const checkInEmployee = (employeeId) => {
    const today = new Date().toISOString().split('T')[0];
    const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    // Check if already checked in today for active shift
    const existing = attendance.find(a => a.employeeId === employeeId && a.date === today);

    if (existing && existing.status === 'Checked In') {
      showToast('You are already checked in for today!', 'warning');
      return { success: false, error: 'Already checked in' };
    }

    if (existing && existing.status === 'Checked Out') {
      showToast('You have already checked out for your shift today.', 'warning');
      return { success: false, error: 'Shift already ended' };
    }

    const employee = employees.find(e => e.id === employeeId);
    const empAssignments = assignments.filter(a => a.employeeId === employeeId && a.status === 'Approved');
    const primaryAssignment = empAssignments[0];
    const shift = shifts.find(s => s.id === (primaryAssignment ? primaryAssignment.shiftId : employee?.currentShiftId)) || shifts[0];

    const newRecord = {
      id: existing ? existing.id : `att-${Date.now()}`,
      employeeId,
      employeeName: employee ? employee.name : 'Employee',
      customerId: primaryAssignment ? primaryAssignment.customerId : (employee?.assignedCustomerIds?.[0] || 'cust-1'),
      customerName: primaryAssignment ? primaryAssignment.customerName : 'Acme Industries',
      shiftId: shift.id,
      shiftName: shift.name,
      date: today,
      checkInTime: nowTimeStr,
      checkOutTime: null,
      duration: 'In progress',
      status: 'Checked In',
      notes: 'Checked in on time via WorkTrack self-service.',
    };

    if (existing) {
      setAttendance(prev => prev.map(a => a.id === existing.id ? newRecord : a));
    } else {
      setAttendance(prev => [newRecord, ...prev]);
    }

    // Trigger Admin notification
    triggerNotification({
      targetRole: 'admin',
      type: 'attendance_checkin',
      title: 'Shift Check-In Recorded',
      message: `${employee?.name} checked into ${shift.name} at ${nowTimeStr}.`,
      link: '/admin/attendance',
      meta: { employee: employee?.name, time: nowTimeStr }
    });

    showToast(`Checked in successfully at ${nowTimeStr}`);
    return { success: true, record: newRecord };
  };

  const checkOutEmployee = (employeeId) => {
    const today = new Date().toISOString().split('T')[0];
    const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    const existing = attendance.find(a => a.employeeId === employeeId && a.date === today);

    if (!existing || existing.status !== 'Checked In') {
      showToast('You must check in first before checking out!', 'error');
      return { success: false, error: 'Must check in before checking out' };
    }

    // Compute approximate duration string
    const updatedRecord = {
      ...existing,
      checkOutTime: nowTimeStr,
      status: 'Checked Out',
      duration: '8h 00m', // Calculated representation
      notes: 'Completed shift duties and checked out.',
    };

    setAttendance(prev => prev.map(a => a.id === existing.id ? updatedRecord : a));

    // Admin notification
    triggerNotification({
      targetRole: 'admin',
      type: 'attendance_checkout',
      title: 'Shift Check-Out Recorded',
      message: `${existing.employeeName} checked out of ${existing.shiftName} at ${nowTimeStr}.`,
      link: '/admin/attendance',
      meta: { employee: existing.employeeName, time: nowTimeStr }
    });

    showToast(`Checked out successfully at ${nowTimeStr}`);
    return { success: true, record: updatedRecord };
  };

  // ================= DAILY REPORTS =================
  const submitDailyReport = (reportData) => {
    const today = reportData.reportingDate || new Date().toISOString().split('T')[0];
    
    // Business rule: One report per employee per shift assignment
    const existing = reports.find(r => 
      r.employeeId === reportData.employeeId && 
      r.shiftId === reportData.shiftId && 
      r.customerId === reportData.customerId &&
      r.reportingDate === today
    );

    if (existing && !reportData.isEdit) {
      showToast('A report for this shift and customer has already been submitted today. You can edit the existing report.', 'error');
      return { success: false, error: 'Report already exists for this shift' };
    }

    const employee = employees.find(e => e.id === reportData.employeeId);
    const customer = customers.find(c => c.id === reportData.customerId);
    const shift = shifts.find(s => s.id === reportData.shiftId);

    const nowISO = new Date().toISOString();

    const newReport = {
      id: `rep-${Date.now()}`,
      assignmentId: reportData.assignmentId || 'asg-custom',
      employeeId: reportData.employeeId,
      employeeName: employee ? employee.name : reportData.employeeName,
      customerId: reportData.customerId,
      customerName: customer ? customer.companyName : reportData.customerName,
      shiftId: reportData.shiftId,
      shiftName: shift ? `${shift.name} (${shift.startTime} – ${shift.endTime})` : reportData.shiftName,
      reportingDate: today,
      workCompleted: reportData.workCompleted,
      pendingTasks: reportData.pendingTasks || '',
      issues: reportData.issues || 'None reported.',
      additionalRemarks: reportData.additionalRemarks || '',
      attachments: reportData.attachments || [],
      status: reportData.isDraft ? 'Draft' : 'Submitted',
      version: 1,
      createdAt: nowISO,
      updatedAt: nowISO,
      versionHistory: [
        {
          version: 1,
          timestamp: nowISO,
          author: `${employee?.name || 'Employee'} (Initial Submission)`,
          summary: reportData.isDraft ? 'Draft created' : 'Initial complete shift report submitted.',
          workCompleted: reportData.workCompleted,
          pendingTasks: reportData.pendingTasks || '',
          issues: reportData.issues || 'None',
          additionalRemarks: reportData.additionalRemarks || '',
        }
      ],
      comments: []
    };

    setReports(prev => [newReport, ...prev]);

    // Send notification to Customer and Admin
    if (!reportData.isDraft) {
      triggerNotification({
        targetRole: 'customer',
        targetCustomerId: reportData.customerId,
        type: 'report_submitted',
        title: `New Daily Report: ${shift?.name}`,
        message: `${employee?.name} submitted the shift report for ${customer?.companyName}.`,
        link: '/customer/reports',
        meta: { reportId: newReport.id, employee: employee?.name }
      });

      triggerNotification({
        targetRole: 'admin',
        type: 'report_submitted',
        title: 'Daily Report Submitted',
        message: `${employee?.name} submitted shift report for ${customer?.companyName}.`,
        link: '/admin/reports',
        meta: { reportId: newReport.id }
      });
    }

    showToast(reportData.isDraft ? 'Draft report saved' : 'Daily report submitted successfully!');
    return { success: true, report: newReport };
  };

  const updateDailyReport = (reportId, updatedFields, editSummary = 'Report updated by employee') => {
    const existing = reports.find(r => r.id === reportId);
    if (!existing) {
      showToast('Report not found', 'error');
      return { success: false };
    }

    const nextVersion = (existing.version || 1) + 1;
    const nowISO = new Date().toISOString();

    const historyEntry = {
      version: nextVersion,
      timestamp: nowISO,
      author: `${existing.employeeName} (Employee)`,
      summary: editSummary || `Version ${nextVersion} update`,
      workCompleted: updatedFields.workCompleted || existing.workCompleted,
      pendingTasks: updatedFields.pendingTasks || existing.pendingTasks,
      issues: updatedFields.issues || existing.issues,
      additionalRemarks: updatedFields.additionalRemarks || existing.additionalRemarks,
    };

    const updatedReport = {
      ...existing,
      ...updatedFields,
      version: nextVersion,
      updatedAt: nowISO,
      status: 'Submitted',
      versionHistory: [historyEntry, ...(existing.versionHistory || [])]
    };

    setReports(prev => prev.map(r => r.id === reportId ? updatedReport : r));

    // CRITICAL REQUIREMENT: "When an employee edits a report, the customer must see the updated report and a new notification event."
    triggerNotification({
      targetRole: 'customer',
      targetCustomerId: existing.customerId,
      type: 'report_updated',
      title: `Report Updated (v${nextVersion}) by ${existing.employeeName}`,
      message: `${existing.employeeName} made modifications to the ${existing.shiftName} report. Summary: ${editSummary}`,
      link: '/customer/reports',
      meta: { reportId: existing.id, version: nextVersion }
    });

    triggerNotification({
      targetRole: 'admin',
      type: 'report_updated',
      title: `Report Revision (v${nextVersion})`,
      message: `${existing.employeeName} updated shift report for ${existing.customerName}.`,
      link: '/admin/reports',
      meta: { reportId: existing.id }
    });

    showToast(`Report updated to version ${nextVersion}! Customer notified.`);
    return { success: true, report: updatedReport };
  };

  // ================= FEEDBACK & COMMENTS =================
  const addFeedbackComment = (reportId, { authorName, authorRole, message }) => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    const newComment = {
      id: `cmt-${Date.now()}`,
      authorName,
      authorRole,
      avatarColor: authorRole.toLowerCase().includes('customer') ? '#245CE2' : '#10B981',
      timestamp: new Date().toISOString(),
      message,
      replies: []
    };

    const updatedReport = {
      ...report,
      comments: [...(report.comments || []), newComment]
    };

    setReports(prev => prev.map(r => r.id === reportId ? updatedReport : r));

    // Notify the employee about customer feedback
    triggerNotification({
      targetRole: 'employee',
      targetEmployeeId: report.employeeId,
      type: 'feedback_received',
      title: `Customer Feedback: ${authorName}`,
      message: `New feedback on your ${report.shiftName} report: "${message.slice(0, 75)}..."`,
      link: '/employee/feedback',
      meta: { reportId: report.id }
    });

    showToast('Feedback submitted successfully');
  };

  const replyToComment = (reportId, commentId, { authorName, authorRole, message }) => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    const newReply = {
      id: `rep-cmt-${Date.now()}`,
      authorName,
      authorRole,
      timestamp: new Date().toISOString(),
      message
    };

    const updatedComments = (report.comments || []).map(c => {
      if (c.id === commentId) {
        return {
          ...c,
          replies: [...(c.replies || []), newReply]
        };
      }
      return c;
    });

    const updatedReport = {
      ...report,
      comments: updatedComments
    };

    setReports(prev => prev.map(r => r.id === reportId ? updatedReport : r));

    // Notify customer about employee reply
    triggerNotification({
      targetRole: 'customer',
      targetCustomerId: report.customerId,
      type: 'employee_reply',
      title: `Employee Response: ${authorName}`,
      message: `${authorName} replied to your comment on report #${report.id.slice(-4)}: "${message.slice(0, 70)}..."`,
      link: '/customer/feedback',
      meta: { reportId: report.id }
    });

    showToast('Response sent to customer');
  };

  // ================= NOTIFICATIONS =================
  const markNotificationRead = (notifId) => {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, isRead: true } : n));
  };

  const markAllNotificationsRead = (role, targetId) => {
    setNotifications(prev => prev.map(n => {
      if (role === 'admin' && n.targetRole === 'admin') return { ...n, isRead: true };
      if (role === 'employee' && n.targetRole === 'employee' && (!n.targetEmployeeId || n.targetEmployeeId === targetId)) return { ...n, isRead: true };
      if (role === 'customer' && n.targetRole === 'customer' && (!n.targetCustomerId || n.targetCustomerId === targetId)) return { ...n, isRead: true };
      return n;
    }));
    showToast('All notifications marked as read', 'info');
  };

  const updateNotificationSettings = (newSettings) => {
    setNotificationSettings(newSettings);
    showToast('Notification preferences updated');
  };

  // ================= CCTV HOURLY SURVEILLANCE =================
  const updateSnapshotVerification = (batchId, snapshotId, verifiedStatus, employeeNotes) => {
    setSurveillanceBatches(prev => prev.map(b => {
      if (b.id === batchId) {
        const updatedSnapshots = b.snapshots.map(s => {
          if (s.id === snapshotId) {
            return {
              ...s,
              employeeVerification: verifiedStatus,
              employeeNotes: employeeNotes !== undefined ? employeeNotes : s.employeeNotes,
            };
          }
          return s;
        });

        const suspiciousCount = updatedSnapshots.filter(s => s.employeeVerification === 'Flagged Suspicious').length;
        return {
          ...b,
          snapshots: updatedSnapshots,
          flaggedSuspiciousCount: suspiciousCount,
        };
      }
      return b;
    }));
    showToast(`Camera verification marked as ${verifiedStatus}`);
  };

  const submitHourlySurveillanceBatch = (batchId, overallAssessment, actionsTaken) => {
    const batch = surveillanceBatches.find(b => b.id === batchId);
    if (!batch) return { success: false };

    const nowISO = new Date().toISOString();
    const hasSuspicious = batch.snapshots.some(s => s.employeeVerification === 'Flagged Suspicious');
    const suspiciousCam = batch.snapshots.find(s => s.employeeVerification === 'Flagged Suspicious');

    const updatedBatch = {
      ...batch,
      status: 'Submitted',
      submittedAt: nowISO,
      customerNotified: true,
      overallAssessment: overallAssessment || batch.overallAssessment,
      actionsTaken: actionsTaken || batch.actionsTaken,
    };

    setSurveillanceBatches(prev => prev.map(b => b.id === batchId ? updatedBatch : b));

    // Handle customer notification based on user's exact specification:
    // "once in hour or at 6 hrs or at the day end"
    const freq = notificationSettings.frequency || 'hourly';
    const immediateRobberyAlert = notificationSettings.immediateAlertOnSuspicious !== false;

    // 1. If hourly: customer gets alert immediately for every 1-hour report
    if (freq === 'hourly') {
      triggerNotification({
        targetRole: 'customer',
        targetCustomerId: batch.customerId,
        type: hasSuspicious ? 'suspicious_incident_flagged' : 'hourly_surveillance_submitted',
        title: hasSuspicious
          ? `⚠️ Security Alert: Suspicious Anomaly in ${batch.hourSlot} Audit`
          : `Hourly Surveillance Report: ${batch.hourSlot} Submitted`,
        message: hasSuspicious
          ? `${batch.employeeName} flagged a suspicious security event on ${suspiciousCam?.cameraName} during the ${batch.hourSlot} audit. Please check immediately.`
          : `${batch.employeeName} submitted the ${batch.hourSlot} CCTV Surveillance Report. All 10 cameras checked — Store verified safe.`,
        link: '/customer/surveillance',
        meta: { batchId: batch.id, hour: batch.hourSlot, status: hasSuspicious ? 'Suspicious' : 'All Clear' }
      });
    } else if (hasSuspicious && immediateRobberyAlert) {
      // 2. If 6hrs or dayEnd, BUT a suspicious robbery/safe anomaly was flagged -> trigger emergency override alert!
      triggerNotification({
        targetRole: 'customer',
        targetCustomerId: batch.customerId,
        type: 'suspicious_incident_flagged',
        title: `🚨 Emergency Security Alert: ${suspiciousCam?.cameraName}`,
        message: `High robbery risk/safe area anomaly detected during ${batch.hourSlot} audit! Immediate review recommended despite your ${freq === '6hours' ? '6-Hour' : 'Daily'} digest setting.`,
        link: '/customer/surveillance',
        meta: { batchId: batch.id, hour: batch.hourSlot, risk: 'High' }
      });
    }

    // Always notify Admin for oversight
    triggerNotification({
      targetRole: 'admin',
      type: 'hourly_surveillance_submitted',
      title: `Hourly CCTV Audit: ${batch.customerName} (${batch.hourSlot})`,
      message: `${batch.employeeName} completed the ${batch.hourSlot} audit (${batch.totalCameras} cameras). Status: ${hasSuspicious ? '1 Suspicious Incident' : 'All Clear'}.`,
      link: '/admin/reports',
      meta: { batchId: batch.id }
    });

    showToast(`Hourly Report for ${batch.hourSlot} submitted! Customer notified according to their alert settings.`);
    return { success: true, batch: updatedBatch };
  };

  // ================= DEMO RESET =================
  const resetDemoData = () => {
    storageService.resetAllData();
    window.location.reload();
  };

  return (
    <AppContext.Provider
      value={{
        customers,
        employees,
        shifts,
        assignments,
        attendance,
        reports,
        notifications,
        notificationSettings,
        cameras,
        surveillanceBatches,
        toast,
        showToast,
        // Employee Actions
        addEmployee,
        updateEmployee,
        toggleEmployeeStatus,
        // Customer Actions
        addCustomer,
        updateCustomer,
        toggleCustomerStatus,
        // Shift Actions
        createShift,
        updateShift,
        // Assignment Actions
        createAssignment,
        updateAssignmentStatus,
        // Attendance Actions
        checkInEmployee,
        checkOutEmployee,
        // Report Actions
        submitDailyReport,
        updateDailyReport,
        // Feedback Actions
        addFeedbackComment,
        replyToComment,
        // Surveillance Actions
        updateSnapshotVerification,
        submitHourlySurveillanceBatch,
        // Notification Actions
        markNotificationRead,
        markAllNotificationsRead,
        updateNotificationSettings,
        triggerNotification,
        // Demo
        resetDemoData,
        // Sidebar Layout State
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        toggleSidebarCollapse,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
