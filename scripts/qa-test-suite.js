// Comprehensive QA Automated Test Suite for WorkTrack Frontend
// Run with: node scripts/qa-test-suite.js

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
} from '../src/data/initialData.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.error(`  FAIL: ${message}`);
    failed++;
  }
}

console.log('====================================================');
console.log('   WORKTRACK FRONTEND QA AUTOMATED AUDIT SUITE      ');
console.log('====================================================\n');

// 1. Initial Data Integrity
console.log('Test Group 1: Data Model & Initial Data Integrity');
assert(Array.isArray(INITIAL_CUSTOMERS) && INITIAL_CUSTOMERS.length >= 4, 'INITIAL_CUSTOMERS has at least 4 customers');
assert(INITIAL_CUSTOMERS.every(c => c.id && c.companyName && c.accountStatus), 'All customers have id, companyName, accountStatus');

assert(Array.isArray(INITIAL_EMPLOYEES) && INITIAL_EMPLOYEES.length >= 6, 'INITIAL_EMPLOYEES has at least 6 employees');
assert(INITIAL_EMPLOYEES.every(e => e.id && e.name && e.email && e.roleTitle), 'All employees have id, name, email, roleTitle');

assert(Array.isArray(INITIAL_SHIFTS) && INITIAL_SHIFTS.length === 3, 'INITIAL_SHIFTS has 3 shifts (Morning, Afternoon, Night)');
assert(INITIAL_SHIFTS.every(s => s.id && s.name && s.startTime && s.endTime), 'All shifts have valid schedule bounds');

assert(Array.isArray(INITIAL_ASSIGNMENTS) && INITIAL_ASSIGNMENTS.length > 0, 'INITIAL_ASSIGNMENTS has initial records');
const employeeIds = new Set(INITIAL_EMPLOYEES.map(e => e.id));
const customerIds = new Set(INITIAL_CUSTOMERS.map(c => c.id));
const shiftIds = new Set(INITIAL_SHIFTS.map(s => s.id));

assert(INITIAL_ASSIGNMENTS.every(a => employeeIds.has(a.employeeId)), 'All assignments reference valid employees');
assert(INITIAL_ASSIGNMENTS.every(a => customerIds.has(a.customerId)), 'All assignments reference valid customers');
assert(INITIAL_ASSIGNMENTS.every(a => shiftIds.has(a.shiftId)), 'All assignments reference valid shifts');

assert(Array.isArray(INITIAL_HOURLY_SURVEILLANCE_BATCHES) && INITIAL_HOURLY_SURVEILLANCE_BATCHES.length >= 4, 'Surveillance batches loaded');
assert(INITIAL_HOURLY_SURVEILLANCE_BATCHES.every(b => b.snapshots && b.snapshots.length === 10), 'Every hourly batch contains exactly 10 camera feeds');
assert(INITIAL_HOURLY_SURVEILLANCE_BATCHES.every(b => b.snapshots.every(s => s.id && s.cameraId && s.zone)), 'Every camera snapshot has id, cameraId, and zone');

// 2. Mock LocalStorage and storageService
console.log('\nTest Group 2: Storage Service & Recovery Fallbacks');
const mockStore = {};
global.localStorage = {
  getItem: (key) => mockStore[key] || null,
  setItem: (key, val) => { mockStore[key] = String(val); },
  removeItem: (key) => { delete mockStore[key]; },
  clear: () => { for (const k in mockStore) delete mockStore[k]; }
};

const { storageService } = await import('../src/services/storageService.js');

// Test pristine fallback
assert(storageService.getCustomers().length === INITIAL_CUSTOMERS.length, 'getCustomers falls back to INITIAL_CUSTOMERS when store empty');
assert(storageService.getEmployees().length === INITIAL_EMPLOYEES.length, 'getEmployees falls back to INITIAL_EMPLOYEES when store empty');
assert(storageService.getSurveillanceBatches().length === INITIAL_HOURLY_SURVEILLANCE_BATCHES.length, 'getSurveillanceBatches falls back to default batches');

// Test corrupted/empty array recovery
mockStore['worktrack_customers'] = '[]';
assert(storageService.getCustomers().length === INITIAL_CUSTOMERS.length, 'getCustomers safely recovers from empty array "[]" in localStorage');

mockStore['worktrack_surveillance_batches'] = '{"invalid": true}';
assert(storageService.getSurveillanceBatches().length === INITIAL_HOURLY_SURVEILLANCE_BATCHES.length, 'getSurveillanceBatches safely recovers from corrupted non-array JSON');

// Test saving and loading
const testEmp = [...INITIAL_EMPLOYEES, { id: 'emp-qa-1', name: 'QA Tester', email: 'qa@test.com', status: 'Active' }];
storageService.saveEmployees(testEmp);
assert(storageService.getEmployees().length === INITIAL_EMPLOYEES.length + 1, 'saveEmployees and getEmployees persist correctly');

// Test resetAllData
storageService.resetAllData();
assert(storageService.getEmployees().length === INITIAL_EMPLOYEES.length, 'resetAllData resets employees back to initial pristine data');

// 3. Navigation Route Audit
console.log('\nTest Group 3: Navigation Routes and Dead-Link Verification');
const expectedAdminRoutes = [
  '/admin',
  '/admin/employees',
  '/admin/customers',
  '/admin/assignments',
  '/admin/shifts',
  '/admin/attendance',
  '/admin/reports',
  '/admin/feedback',
  '/admin/notifications',
  '/admin/settings'
];

const expectedEmployeeRoutes = [
  '/employee',
  '/employee/surveillance',
  '/employee/shifts',
  '/employee/attendance',
  '/employee/daily-report',
  '/employee/history',
  '/employee/feedback',
  '/employee/notifications',
  '/employee/profile'
];

const expectedCustomerRoutes = [
  '/customer',
  '/customer/surveillance',
  '/customer/employees',
  '/customer/reports',
  '/customer/shift-reports',
  '/customer/feedback',
  '/customer/notifications',
  '/customer/settings',
  '/customer/profile'
];

import fs from 'fs';
const appJsx = fs.readFileSync('src/App.jsx', 'utf8');

expectedAdminRoutes.forEach(route => {
  const subPath = route === '/admin' ? 'index' : `path="${route.replace('/admin/', '')}"`;
  assert(appJsx.includes(subPath), `Route registered in App.jsx: ${route}`);
});

expectedEmployeeRoutes.forEach(route => {
  const subPath = route === '/employee' ? 'index' : `path="${route.replace('/employee/', '')}"`;
  assert(appJsx.includes(subPath), `Route registered in App.jsx: ${route}`);
});

expectedCustomerRoutes.forEach(route => {
  const subPath = route === '/customer' ? 'index' : `path="${route.replace('/customer/', '')}"`;
  assert(appJsx.includes(subPath), `Route registered in App.jsx: ${route}`);
});

// 4. Notification Settings Configuration Verification
console.log('\nTest Group 4: Notification Frequency Policy Settings');
const defaultSettings = storageService.getNotificationSettings();
assert(defaultSettings.frequency === 'hourly' || defaultSettings.frequency === '6hours' || defaultSettings.frequency === 'daily_end', 'Valid frequency policy config');
assert(typeof defaultSettings.immediateAlertOnSuspicious === 'boolean', 'immediateAlertOnSuspicious boolean configured');
assert(defaultSettings.channels && typeof defaultSettings.channels.inApp === 'boolean', 'channels.inApp boolean configured');

console.log('\n====================================================');
console.log(`   QA AUDIT COMPLETE: ${passed} PASSED | ${failed} FAILED`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
}
