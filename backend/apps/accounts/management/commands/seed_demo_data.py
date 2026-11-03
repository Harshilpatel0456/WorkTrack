from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import time, date, timedelta
from apps.accounts.models import User
from apps.employees.models import EmployeeProfile
from apps.customers.models import CustomerProfile
from apps.assignments.models import EmployeeCustomerAssignment
from apps.shifts.models import Shift, ShiftAssignment
from apps.attendance.models import Attendance
from apps.reports.models import DailyReport, ReportVersion
from apps.surveillance.models import SurveillanceBatch, CameraSnapshot
from apps.notifications.models import NotificationPreference


class Command(BaseCommand):
    help = 'Seeds initial WorkTrack demonstration users, customers, shifts, reports, and CCTV feeds'

    def handle(self, *args, **options):
        self.stdout.write("Starting WorkTrack demo data seeding...")

        # 1. Create Users
        admin_user, _ = User.objects.get_or_create(
            email='admin@worktrack.demo',
            defaults={
                'first_name': 'Alexander',
                'last_name': 'Wright',
                'role': User.Role.ADMIN,
                'is_staff': True,
                'is_superuser': True,
            }
        )
        admin_user.set_password('admin123')
        admin_user.save()

        emp_user, _ = User.objects.get_or_create(
            email='employee@worktrack.demo',
            defaults={
                'first_name': 'Aarav',
                'last_name': 'Shah',
                'role': User.Role.EMPLOYEE,
            }
        )
        emp_user.set_password('employee123')
        emp_user.save()

        cust_user, _ = User.objects.get_or_create(
            email='customer@worktrack.demo',
            defaults={
                'first_name': 'Robert',
                'last_name': 'Henderson',
                'role': User.Role.CUSTOMER,
            }
        )
        cust_user.set_password('customer123')
        cust_user.save()

        # 2. Profiles
        emp_profile, _ = EmployeeProfile.objects.get_or_create(
            user=emp_user,
            defaults={
                'employee_code': 'EMP-AARAV',
                'phone': '+1 (555) 349-8201',
                'designation': 'Senior CCTV Surveillance Operator',
                'department': 'Security & Loss Prevention',
                'joining_date': date(2024, 3, 15),
                'status': EmployeeProfile.Status.ACTIVE,
            }
        )

        cust_profile, _ = CustomerProfile.objects.get_or_create(
            user=cust_user,
            defaults={
                'customer_code': 'CUST-104',
                'company_name': 'Acme Retail Store #104 (US Flagship)',
                'industry': 'Retail Superstore',
                'contact_person': 'Robert Henderson',
                'phone': '+1 (555) 892-4100',
                'address': '742 Evergreen Terrace, Chicago, IL',
                'timezone': 'America/Chicago',
                'brand_color': '#245CE2',
            }
        )

        NotificationPreference.objects.get_or_create(
            customer=cust_profile,
            defaults={
                'frequency': NotificationPreference.Frequency.HOURLY,
                'immediate_alert_on_suspicious': True,
                'in_app_enabled': True,
                'email_enabled': True,
                'push_enabled': True,
            }
        )

        # 3. Shifts
        morning_shift, _ = Shift.objects.get_or_create(
            name='Morning Shift',
            defaults={
                'start_time': time(6, 0),
                'end_time': time(14, 0),
                'is_overnight': False,
                'color_tag': '#F59E0B',
                'description': 'Store opening & morning register checkout security.'
            }
        )
        afternoon_shift, _ = Shift.objects.get_or_create(
            name='Afternoon Shift',
            defaults={
                'start_time': time(14, 0),
                'end_time': time(22, 0),
                'is_overnight': False,
                'color_tag': '#3B82F6',
                'description': 'Peak shopping hours & cash drops.'
            }
        )
        night_shift, _ = Shift.objects.get_or_create(
            name='Night Shift',
            defaults={
                'start_time': time(22, 0),
                'end_time': time(6, 0),
                'is_overnight': True,
                'color_tag': '#6366F1',
                'description': 'Store closing, safe vault locking & overnight perimeter.'
            }
        )

        # 4. Assignment
        assignment, _ = EmployeeCustomerAssignment.objects.get_or_create(
            employee=emp_profile,
            customer=cust_profile,
            defaults={
                'assigned_by': admin_user,
                'status': EmployeeCustomerAssignment.Status.ACTIVE,
                'notes': 'Dedicated primary surveillance operator for Acme Store #104'
            }
        )

        # 5. Shift Schedule for Today
        today = timezone.now().date()
        shift_assignment, _ = ShiftAssignment.objects.get_or_create(
            employee_customer_assignment=assignment,
            shift=morning_shift,
            shift_date=today,
            defaults={
                'assigned_by': admin_user,
                'status': ShiftAssignment.Status.IN_PROGRESS
            }
        )

        # 6. Attendance
        Attendance.objects.get_or_create(
            shift_assignment=shift_assignment,
            defaults={
                'check_in': timezone.now() - timedelta(hours=3),
                'attendance_status': Attendance.Status.PRESENT,
                'duration_hours': 3.0,
                'notes': 'Checked in on-time via security terminal.'
            }
        )

        # 7. Daily Report
        report, created = DailyReport.objects.get_or_create(
            shift_assignment=shift_assignment,
            defaults={
                'title': 'Morning Shift Store Security & Register Telemetry',
                'work_summary': 'Active register checkout operations supervised. Armored car cash transfer confirmed.',
                'tasks_completed': '- 10 CCTV camera feeds inspected\n- Safe Room access protocol audited',
                'pending_tasks': '- Handover Cash Register #2 audit to Afternoon Shift',
                'issues_or_blockers': 'None. Emergency alleyway exit secured.',
                'version': 1,
                'status': DailyReport.Status.SUBMITTED,
                'submitted_at': timezone.now() - timedelta(minutes=45),
                'created_by': emp_user,
            }
        )

        if created:
            ReportVersion.objects.create(
                daily_report=report,
                version_number=1,
                title_snapshot=report.title,
                content_snapshot={
                    'work_summary': report.work_summary,
                    'tasks_completed': report.tasks_completed,
                },
                modified_by=emp_user,
                change_summary='Initial shift report submission'
            )

        # 8. Surveillance Batch with 10 Camera Feeds
        batch, _ = SurveillanceBatch.objects.get_or_create(
            id='cctv-batch-14',
            defaults={
                'customer': cust_profile,
                'employee': emp_profile,
                'date': today,
                'hour_slot': '02:00 PM',
                'hour24': '14:00',
                'status': SurveillanceBatch.Status.READY_FOR_REVIEW,
                'total_cameras': 10,
                'overall_assessment': 'Store security operating normally across all 10 cameras.',
                'actions_taken': 'Verified cash register drawer closures. Safe room locked.'
            }
        )

        # 10 Camera Snapshots
        cameras = [
            ('CAM-01', 'Front Register #1 (Main Cashier)', 'Zone A - Cash Counters (High Robbery Hotspot)', True, '14:02:14', True, 2, 'OK', '96%', 'Human detected: Authorized cashier and customer. Drawer closed normally.', 'Verified OK', 'Cashier badge active.'),
            ('CAM-02', 'Express Register #2 (Secondary)', 'Zone A - Cash Counters (High Robbery Hotspot)', True, '14:08:45', True, 1, 'OK', '97%', 'Human detected: Cashier scanning items. Cash drawer securely closed.', 'Verified OK', 'Standard register operation.'),
            ('CAM-03', 'Back-Office Safe & Cash Deposit', 'Zone B - Safe Room (Restricted Vault)', True, '14:14:20', False, 0, 'OK', '95%', 'Zero human presence in Safe Room. Safe lock mechanism engaged and secure.', 'Verified OK', 'Audited lock seal.'),
            ('CAM-04', 'High-Value Electronics Display', 'Zone C - Electronics Showcase', False, '14:20:00', True, 3, 'OK', '94%', 'Normal customer browsing. Glass case locked.', 'Verified OK', 'Keys with staff.'),
            ('CAM-05', 'Fine Jewelry & Luxury Lockup', 'Zone C - Locked Cabinets', True, '14:25:30', False, 0, 'OK', '99%', 'Zero human presence. Security sensor active.', 'Verified OK', 'Display locked.'),
            ('CAM-06', 'Customer Service & Returns Counter', 'Zone A - Service Counter', False, '14:32:10', True, 2, 'OK', '92%', 'Associate handling return receipt transaction.', 'Verified OK', 'Normal return.'),
            ('CAM-07', 'Main Store Entrance & Turnstiles', 'Zone E - Front Doors', False, '14:38:40', True, 4, 'OK', '93%', 'Patrons entering store. Turnstiles clear.', 'Verified OK', 'Door sensors OK.'),
            ('CAM-08', 'Emergency Rear Fire Exit & Alley', 'Zone D - Emergency Egress', True, '14:44:00', False, 0, 'OK', '98%', 'Emergency exit door closed and latched. Alley clear.', 'Verified OK', 'Alarm engaged.'),
            ('CAM-09', 'Stockroom & Freight Receiving', 'Zone F - Warehouse Bay', False, '14:50:15', True, 1, 'OK', '91%', 'Forklift operator staging delivery pallets.', 'Verified OK', 'Warehouse active.'),
            ('CAM-10', 'South Parking Lot & Perimeter', 'Zone G - Exterior Perimeter', False, '14:55:00', True, 2, 'OK', '89%', 'Vehicles parked normally. Lighting operational.', 'Verified OK', 'Perimeter clear.'),
        ]

        for cam in cameras:
            CameraSnapshot.objects.update_or_create(
                id=f"snap-14-{cam[0]}",
                batch=batch,
                defaults={
                    'camera_id': cam[0],
                    'camera_name': cam[1],
                    'zone': cam[2],
                    'is_high_risk': cam[3],
                    'capture_time': cam[4],
                    'human_detected': cam[5],
                    'human_count': cam[6],
                    'ai_status': cam[7],
                    'ai_confidence': cam[8],
                    'ai_analysis': cam[9],
                    'employee_verification': cam[10],
                    'employee_notes': cam[11],
                    'simulated_visual': 'normal'
                }
            )

        self.stdout.write(self.style.SUCCESS("Successfully seeded WorkTrack initial demo database!"))

