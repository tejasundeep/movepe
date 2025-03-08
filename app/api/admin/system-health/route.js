import { NextResponse } from 'next/server';
import { systemHealthService } from '../../../../lib/services/systemHealthService';
import { withAdminApiMiddleware } from '../../../../lib/middleware/adminApiMiddleware';

async function getSystemHealth(request) {
  // Create a timeout promise to prevent long-running requests
  const timeout = new Promise((_, reject) => {
    setTimeout(() => {
      const error = new Error('Request timeout');
      error.name = 'TimeoutError';
      reject(error);
    }, 15000); // 15 second timeout
  });
  
  // Get system health metrics with timeout protection
  const healthMetrics = await Promise.race([
    systemHealthService.getHealthMetrics(),
    timeout
  ]);
  
  return healthMetrics;
}

export const GET = withAdminApiMiddleware(getSystemHealth, {
  action: 'view_system_health',
  entityType: 'system',
  skipAudit: false
}); 