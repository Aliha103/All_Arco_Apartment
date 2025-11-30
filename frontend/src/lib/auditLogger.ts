/**
 * PMS Audit Logger
 *
 * Logs security-sensitive operations for compliance and monitoring
 */

export type AuditAction =
  | 'pms_access'
  | 'booking_view'
  | 'booking_create'
  | 'booking_update'
  | 'booking_delete'
  | 'payment_view'
  | 'payment_refund'
  | 'invoice_create'
  | 'invoice_update'
  | 'guest_view'
  | 'guest_update'
  | 'pricing_update'
  | 'team_create'
  | 'team_update'
  | 'team_delete'
  | 'report_generate';

export interface AuditLogEntry {
  timestamp: string;
  action: AuditAction;
  userId: string;
  userEmail: string;
  userRole: string;
  resource?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

class AuditLogger {
  private logs: AuditLogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory

  /**
   * Log an audit event
   */
  log(entry: Omit<AuditLogEntry, 'timestamp' | 'ipAddress' | 'userAgent' | 'sessionId'>) {
    const fullEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      ipAddress: this.getClientIP(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      sessionId: this.getSessionId(),
    };

    // Add to in-memory logs
    this.logs.push(fullEntry);

    // Trim logs if exceeding max
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // In production, this would send to backend API for persistent storage
    if (process.env.NODE_ENV === 'development') {
      console.log('[AUDIT]', fullEntry);
    }

    // TODO: Send to backend audit log API
    // api.audit.create(fullEntry);

    return fullEntry;
  }

  /**
   * Get client IP (best effort in browser)
   */
  private getClientIP(): string {
    // In browser, we can't directly get IP
    // This would be set by backend or proxy headers
    return 'client';
  }

  /**
   * Get or create session ID
   */
  private getSessionId(): string {
    if (typeof window === 'undefined') return 'server';

    let sessionId = sessionStorage.getItem('pms_session_id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('pms_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Get recent logs (for debugging/monitoring)
   */
  getRecentLogs(count = 50): AuditLogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * Clear logs (use with caution)
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Singleton instance
export const auditLogger = new AuditLogger();

// Convenience functions
export const logPMSAccess = (user: { id: string; email: string; role_info: { name: string } }) => {
  auditLogger.log({
    action: 'pms_access',
    userId: user.id,
    userEmail: user.email,
    userRole: user.role_info.name,
    resource: 'pms',
  });
};

export const logResourceAction = (
  action: AuditAction,
  user: { id: string; email: string; role_info: { name: string } },
  resource: string,
  resourceId?: string,
  details?: Record<string, unknown>
) => {
  auditLogger.log({
    action,
    userId: user.id,
    userEmail: user.email,
    userRole: user.role_info.name,
    resource,
    resourceId,
    details,
  });
};
