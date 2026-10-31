// Storage service with LocalStorage persistence and initial data fallback

import {
  INITIAL_CUSTOMERS,
  INITIAL_EMPLOYEES,
  INITIAL_SHIFTS,
  INITIAL_ASSIGNMENTS,
  INITIAL_ATTENDANCE,
  INITIAL_REPORTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_NOTIFICATION_SETTINGS,
  INITIAL_CAMERAS,
  INITIAL_HOURLY_SURVEILLANCE_BATCHES,
} from '../data/initialData';

const STORAGE_KEYS = {
  CUSTOMERS: 'worktrack_customers',
  EMPLOYEES: 'worktrack_employees',
  SHIFTS: 'worktrack_shifts',
  ASSIGNMENTS: 'worktrack_assignments',
  ATTENDANCE: 'worktrack_attendance',
  REPORTS: 'worktrack_reports',
  NOTIFICATIONS: 'worktrack_notifications',
  NOTIF_SETTINGS: 'worktrack_notification_settings',
  AUTH: 'worktrack_auth_state',
  CAMERAS: 'worktrack_cameras',
  SURVEILLANCE_BATCHES: 'worktrack_surveillance_batches',
};

export const storageService = {
  getCustomers: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      return data ? JSON.parse(data) : INITIAL_CUSTOMERS;
    } catch {
      return INITIAL_CUSTOMERS;
    }
  },
  saveCustomers: (customers) => {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  },

  getEmployees: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
      return data ? JSON.parse(data) : INITIAL_EMPLOYEES;
    } catch {
      return INITIAL_EMPLOYEES;
    }
  },
  saveEmployees: (employees) => {
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
  },

  getShifts: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SHIFTS);
      return data ? JSON.parse(data) : INITIAL_SHIFTS;
    } catch {
      return INITIAL_SHIFTS;
    }
  },
  saveShifts: (shifts) => {
    localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(shifts));
  },

  getAssignments: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ASSIGNMENTS);
      return data ? JSON.parse(data) : INITIAL_ASSIGNMENTS;
    } catch {
      return INITIAL_ASSIGNMENTS;
    }
  },
  saveAssignments: (assignments) => {
    localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(assignments));
  },

  getAttendance: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      return data ? JSON.parse(data) : INITIAL_ATTENDANCE;
    } catch {
      return INITIAL_ATTENDANCE;
    }
  },
  saveAttendance: (attendance) => {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance));
  },

  getReports: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.REPORTS);
      return data ? JSON.parse(data) : INITIAL_REPORTS;
    } catch {
      return INITIAL_REPORTS;
    }
  },
  saveReports: (reports) => {
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
  },

  getNotifications: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      return data ? JSON.parse(data) : INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  },
  saveNotifications: (notifications) => {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  },

  getNotificationSettings: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NOTIF_SETTINGS);
      return data ? JSON.parse(data) : INITIAL_NOTIFICATION_SETTINGS;
    } catch {
      return INITIAL_NOTIFICATION_SETTINGS;
    }
  },
  saveNotificationSettings: (settings) => {
    localStorage.setItem(STORAGE_KEYS.NOTIF_SETTINGS, JSON.stringify(settings));
  },

  getCameras: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CAMERAS);
      return data ? JSON.parse(data) : INITIAL_CAMERAS;
    } catch {
      return INITIAL_CAMERAS;
    }
  },
  saveCameras: (cameras) => {
    localStorage.setItem(STORAGE_KEYS.CAMERAS, JSON.stringify(cameras));
  },

  getSurveillanceBatches: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SURVEILLANCE_BATCHES);
      if (!data) return INITIAL_HOURLY_SURVEILLANCE_BATCHES;
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_HOURLY_SURVEILLANCE_BATCHES;
    } catch {
      return INITIAL_HOURLY_SURVEILLANCE_BATCHES;
    }
  },
  saveSurveillanceBatches: (batches) => {
    localStorage.setItem(STORAGE_KEYS.SURVEILLANCE_BATCHES, JSON.stringify(batches));
  },

  getAuthState: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUTH);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
  saveAuthState: (auth) => {
    localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(auth));
  },

  resetAllData: () => {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(INITIAL_CUSTOMERS));
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(INITIAL_EMPLOYEES));
    localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(INITIAL_SHIFTS));
    localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(INITIAL_ASSIGNMENTS));
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(INITIAL_ATTENDANCE));
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(INITIAL_REPORTS));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS));
    localStorage.setItem(STORAGE_KEYS.NOTIF_SETTINGS, JSON.stringify(INITIAL_NOTIFICATION_SETTINGS));
    localStorage.setItem(STORAGE_KEYS.CAMERAS, JSON.stringify(INITIAL_CAMERAS));
    localStorage.setItem(STORAGE_KEYS.SURVEILLANCE_BATCHES, JSON.stringify(INITIAL_HOURLY_SURVEILLANCE_BATCHES));
  }
};
