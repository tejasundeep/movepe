export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auditService } from '../../../../lib/services/auditService';
import { withAdminApiMiddleware } from '../../../../lib/middleware/adminApiMiddleware';

async function getAuditLogs(request) {
  // Get query parameters
  const { searchParams } = new URL(request.url);
  
  // Validate and parse pagination parameters
  let page = parseInt(searchParams.get('page') || '1', 10);
  let limit = parseInt(searchParams.get('limit') || '20', 10);
  
  // Ensure page and limit are valid numbers
  if (isNaN(page) || page < 1) {
    page = 1;
  }
  
  if (isNaN(limit) || limit < 1 || limit > 100) {
    limit = 20; // Default to 20, max 100 to prevent excessive data fetching
  }
  
  const adminEmail = searchParams.get('adminEmail');
  const entityType = searchParams.get('entityType');
  const action = searchParams.get('action');
  
  // Validate date parameters
  let startDate = searchParams.get('startDate');
  let endDate = searchParams.get('endDate');
  
  // Ensure dates are valid
  if (startDate && isNaN(Date.parse(startDate))) {
    startDate = null;
  }
  
  if (endDate && isNaN(Date.parse(endDate))) {
    endDate = null;
  }

  // Get audit logs
  const result = await auditService.getLogs({
    page,
    limit,
    adminEmail,
    entityType,
    action,
    startDate,
    endDate
  });

  return result;
}

export const GET = withAdminApiMiddleware(getAuditLogs, {
  action: 'view_audit_logs',
  entityType: 'audit_log',
  skipAudit: false // We want to audit access to audit logs
}); 