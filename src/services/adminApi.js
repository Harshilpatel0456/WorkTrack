import { apiClient } from './apiClient';

async function listAll(endpoint) {
  const records = [];
  let page = await apiClient(endpoint);

  while (Array.isArray(page?.results)) {
    records.push(...page.results);
    if (!page.next) return records;

    const nextUrl = new URL(page.next, window.location.origin);
    page = await apiClient(`${endpoint}${nextUrl.search}`);
  }

  return Array.isArray(page) ? page : records;
}

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
    list: () => listAll('/assignments/'),
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
    list: () => listAll('/shifts/schedules/'),
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
};
