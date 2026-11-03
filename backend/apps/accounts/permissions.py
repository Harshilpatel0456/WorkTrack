from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    """Allows access only to users with the ADMIN role or superusers/staff."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.role == 'ADMIN' or request.user.is_staff or request.user.is_superuser)
        )


class IsEmployee(permissions.BasePermission):
    """Allows access only to users with the EMPLOYEE role."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == 'EMPLOYEE'
        )


class IsCustomer(permissions.BasePermission):
    """Allows access only to users with the CUSTOMER role."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == 'CUSTOMER'
        )


class IsAdminOrReadOnly(permissions.BasePermission):
    """Read permissions are allowed to any authenticated request, write to admin only."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user.role == 'ADMIN' or request.user.is_staff or request.user.is_superuser)


class IsAssignedEmployee(permissions.BasePermission):
    """Allows access if user is the assigned employee on the target record or shift."""
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.role == 'ADMIN' or user.is_staff:
            return True
        if hasattr(obj, 'employee') and hasattr(obj.employee, 'user') and obj.employee.user == user:
            return True
        if hasattr(obj, 'created_by') and obj.created_by == user:
            return True
        if hasattr(obj, 'shift_assignment'):
            try:
                return obj.shift_assignment.employee_customer_assignment.employee.user == user
            except Exception:
                pass
        return False


class IsAssignedCustomer(permissions.BasePermission):
    """Allows access if user is the customer for this organization record."""
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.role == 'ADMIN' or user.is_staff:
            return True
        if hasattr(obj, 'customer') and hasattr(obj.customer, 'user') and obj.customer.user == user:
            return True
        if hasattr(obj, 'shift_assignment'):
            try:
                return obj.shift_assignment.employee_customer_assignment.customer.user == user
            except Exception:
                pass
        return False
