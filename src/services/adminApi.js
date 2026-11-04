import { apiClient } from './apiClient';

async function listAll(endpoint) {
  const records = [];
  let page = await apiClient(endpoint);

  while (Array.isArray(page?.results)) {
    records.push(...page.results);
    if (!page.next) return records;

    const nextUrl = new URL(page.next, window.location.origin);
    page = await apiClient(`${endpoint.split('?')[0]}${nextUrl.search}`);
  }

  return Array.isArray(page) ? page : records;
}

const normalizeReport = (report) => ({
  ...report,
  shiftAssignment: report.shift_assignment,
  employeeId: report.shift_details?.employeeId,
  employeeName: report.employee_name,
  customerId: report.customer_id,
  customerName: report.customer_name,
  shiftId: report.shift_details?.shiftId,
  shiftName: report.shift_name,
  reportingDate: report.shift_date,
  workCompleted: report.work_summary,
  pendingTasks: report.pending_tasks,
  issues: report.issues_or_blockers,
  additionalRemarks: report.additional_remarks,
  tasksCompleted: report.tasks_completed,
  updatedAt: report.last_updated_at || report.updated_at,
  createdAt: report.created_at,
  attachments: (report.attachments || []).map((file) => ({
    ...file,
    name: file.file_name,
    size: `${(file.file_size / (1024 * 1024)).toFixed(2)} MB`,
  })),
});

const normalizeComment = (comment) => ({
  ...comment,
  authorName: comment.author_name,
  authorRole: comment.author_role,
  message: comment.content,
  timestamp: comment.created_at,
  replies: (comment.replies || []).map(normalizeComment),
});

export const adminApi = {
  employees: {
    list: () => listAll('/employees/'),
    create: (data) => apiClient('/employees/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id, data) => apiClient(`/employees/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    toggleStatus: (id) => apiClient(`/employees/${id}/toggle_status/`, {
      method: 'POST',
    }),
    remove: (id) => apiClient(`/employees/${id}/`, { method: 'DELETE' }),
  },
  customers: {
    list: () => listAll('/customers/'),
    me: () => apiClient('/customers/me/'),
    myEmployees: () => listAll('/customers/my-employees/'),
    create: (data) => apiClient('/customers/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id, data) => apiClient(`/customers/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    toggleStatus: (id) => apiClient(`/customers/${id}/toggle_status/`, {
      method: 'POST',
    }),
    remove: (id) => apiClient(`/customers/${id}/`, { method: 'DELETE' }),
  },
  assignments: {
    list: (filters = {}) => {
      const query = new URLSearchParams(
        Object.entries(filters).filter(([, value]) => value !== '' && value != null)
      ).toString();
      return listAll(`/assignments/${query ? `?${query}` : ''}`);
    },
    create: (data) => apiClient('/assignments/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id, data) => apiClient(`/assignments/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    approve: (id) => apiClient(`/assignments/${id}/approve/`, { method: 'POST' }),
    revoke: (id) => apiClient(`/assignments/${id}/revoke/`, { method: 'POST' }),
    remove: (id) => apiClient(`/assignments/${id}/`, { method: 'DELETE' }),
  },
  shifts: {
    list: () => listAll('/shifts/templates/'),
    create: (data) => apiClient('/shifts/templates/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id, data) => apiClient(`/shifts/templates/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    remove: (id) => apiClient(`/shifts/templates/${id}/`, { method: 'DELETE' }),
  },
  schedules: {
    list: (filters = {}) => {
      const query = new URLSearchParams(
        Object.entries(filters).filter(([, value]) => value !== '' && value != null)
      ).toString();
      return listAll(`/shifts/schedules/${query ? `?${query}` : ''}`);
    },
    create: (data) => apiClient('/shifts/schedules/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id, data) => apiClient(`/shifts/schedules/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    cancel: (id) => apiClient(`/shifts/schedules/${id}/cancel/`, { method: 'POST' }),
    remove: (id) => apiClient(`/shifts/schedules/${id}/`, { method: 'DELETE' }),
  },
  attendance: {
    list: (filters = {}) => {
      const query = new URLSearchParams(
        Object.entries(filters).filter(([, value]) => value !== '' && value != null)
      ).toString();
      return listAll(`/attendance/${query ? `?${query}` : ''}`);
    },
    myAttendance: (filters = {}) => {
      const query = new URLSearchParams(
        Object.entries(filters).filter(([, value]) => value !== '' && value != null)
      ).toString();
      return listAll(`/attendance/my-attendance/${query ? `?${query}` : ''}`);
    },
    myShifts: (date) => apiClient(`/attendance/my-shifts/${date ? `?date=${encodeURIComponent(date)}` : ''}`),
    customerShifts: (date) => apiClient(`/attendance/customer-shifts/?date=${encodeURIComponent(date)}`),
    summary: (filters = {}) => {
      const query = new URLSearchParams(
        Object.entries(filters).filter(([, value]) => value !== '' && value != null)
      ).toString();
      return apiClient(`/attendance/summary/${query ? `?${query}` : ''}`);
    },
    checkIn: (shiftAssignmentId) => apiClient('/attendance/check_in/', {
      method: 'POST',
      body: JSON.stringify({ shift_assignment_id: shiftAssignmentId }),
    }),
    checkOut: (shiftAssignmentId) => apiClient('/attendance/check_out/', {
      method: 'POST',
      body: JSON.stringify({ shift_assignment_id: shiftAssignmentId }),
    }),
    correct: (id, data) => apiClient(`/attendance/${id}/correct/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  },
  reports: {
    async list(filters = {}) {
      const query = new URLSearchParams(
        Object.entries(filters).filter(([, value]) => value !== '' && value != null)
      ).toString();
      const reports = await listAll(`/reports/${query ? `?${query}` : ''}`);
      return reports.map(normalizeReport);
    },
    async create(data) {
      return normalizeReport(await apiClient('/reports/', {
        method: 'POST',
        body: JSON.stringify(data),
      }));
    },
    async update(id, data) {
      return normalizeReport(await apiClient(`/reports/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }));
    },
    async submit(id) {
      return normalizeReport(await apiClient(`/reports/${id}/submit/`, { method: 'POST' }));
    },
    versions: (id) => apiClient(`/reports/${id}/versions/`),
    uploadAttachment: async (id, file) => {
      const data = new FormData();
      data.append('file', file);
      return apiClient(`/reports/${id}/attachments/`, {
        method: 'POST',
        body: data,
      });
    },
    summary: (filters = {}) => {
      const query = new URLSearchParams(
        Object.entries(filters).filter(([, value]) => value !== '' && value != null)
      ).toString();
      return apiClient(`/reports/summary/${query ? `?${query}` : ''}`);
    },
    comments: async (id) => (await listAll(`/feedback/comments/?daily_report=${encodeURIComponent(id)}`)).map(normalizeComment),
    allComments: async () => (await listAll('/feedback/comments/')).map(normalizeComment),
    addComment: (id, content) => apiClient('/feedback/comments/', {
      method: 'POST',
      body: JSON.stringify({ daily_report: id, content }),
    }),
    reply: (commentId, content) => apiClient(`/feedback/comments/${commentId}/reply/`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
  },
};
