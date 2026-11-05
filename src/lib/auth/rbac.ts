import { NextRequest, NextResponse } from "next/server";
import { Role } from "@/lib/types";

/**
 * TRACE Role-Based Access Control (RBAC)
 * Enforces hierarchical role permissions on backend API endpoints.
 */

export const ROLE_PERMISSIONS: Record<Role, {
  canManageSettings: boolean;
  canManageSubscriptions: boolean;
  canDeleteProducts: boolean;
  canEditInventory: boolean;
  canAdjustStock: boolean;
  canProcessRefunds: boolean;
  canOperatePOS: boolean;
  canViewReports: boolean;
}> = {
  OWNER: {
    canManageSettings: true,
    canManageSubscriptions: true,
    canDeleteProducts: true,
    canEditInventory: true,
    canAdjustStock: true,
    canProcessRefunds: true,
    canOperatePOS: true,
    canViewReports: true,
  },
  MANAGER: {
    canManageSettings: false,
    canManageSubscriptions: false,
    canDeleteProducts: false, // Managers cannot permanently delete products
    canEditInventory: true,
    canAdjustStock: true,
    canProcessRefunds: true,
    canOperatePOS: true,
    canViewReports: true,
  },
  CASHIER: {
    canManageSettings: false,
    canManageSubscriptions: false,
    canDeleteProducts: false,
    canEditInventory: false, // Cashiers cannot edit catalog pricing or cost
    canAdjustStock: false,
    canProcessRefunds: false, // Refunds require Manager/Owner signoff
    canOperatePOS: true,
    canViewReports: false,
  },
  STAFF: {
    canManageSettings: false,
    canManageSubscriptions: false,
    canDeleteProducts: false,
    canEditInventory: false,
    canAdjustStock: false,
    canProcessRefunds: false,
    canOperatePOS: false,
    canViewReports: false,
  },
};

/**
 * Extracts and verifies the role from request headers or query params
 */
export function getRequestRole(req: NextRequest, bodyRole?: string): Role {
  const headerRole = req.headers.get("x-user-role")?.toUpperCase();
  const validRoles: Role[] = ["OWNER", "MANAGER", "CASHIER", "STAFF"];
  
  if (headerRole && validRoles.includes(headerRole as Role)) {
    return headerRole as Role;
  }
  if (bodyRole && validRoles.includes(bodyRole.toUpperCase() as Role)) {
    return bodyRole.toUpperCase() as Role;
  }
  // Default to OWNER in demo/local environment if not specified
  return "OWNER";
}

/**
 * Verifies if the incoming request has permission for the specified action
 */
export function enforcePermission(
  req: NextRequest,
  action: keyof typeof ROLE_PERMISSIONS["OWNER"],
  bodyRole?: string
): { authorized: boolean; role: Role; response?: NextResponse } {
  const role = getRequestRole(req, bodyRole);
  const permissions = ROLE_PERMISSIONS[role];

  if (!permissions || !permissions[action]) {
    return {
      authorized: false,
      role,
      response: NextResponse.json(
        {
          error: `Access Denied: Role "${role}" lacks permission for action "${action}".`,
          role,
          action,
        },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, role };
}
