export interface TenantLink {
  id: string;
  label: string;
  path: string;
  color?: 'green' | 'red' | 'gray' | 'blue';
}

// All links in a flat array — single source of truth
export const ALL_LINKS: TenantLink[] = [
  { id: 'processed-messages', label: 'Processed Messages', path: '/shell/monitoring/Messages/', color: 'green' },
  { id: 'failed-messages', label: 'Failed Messages', path: '/shell/monitoring/Messages/%7B%22status%22%3A%22FAILED%22%2C%22time%22%3A%22PASTHOUR%22%2C%22type%22%3A%22INTEGRATION_FLOW%22%7D', color: 'red' },
  { id: 'integration-content', label: 'Integration Content', path: '/shell/monitoring/Artifacts/', color: 'gray' },
  { id: 'design', label: 'Design', path: '/shell/design', color: 'blue' },
  { id: 'security-material', label: 'Security Material', path: '/shell/monitoring/SecurityMaterials' },
  { id: 'keystore', label: 'Keystore', path: '/shell/monitoring/Keystore' },
  { id: 'certificate-user-mappings', label: 'Certificate User Mappings', path: '/shell/monitoring/CertificateUserMappings' },
  { id: 'access-policies', label: 'Access Policies', path: '/shell/monitoring/AccessPolicies' },
  { id: 'jdbc-material', label: 'JDBC Material', path: '/shell/monitoring/JdbcMaterial' },
  { id: 'connectivity-tests', label: 'Connectivity Tests', path: '/shell/monitoring/Connectivity' },
  { id: 'data-stores', label: 'Data Stores', path: '/shell/monitoring/DataStores' },
  { id: 'variables', label: 'Variables', path: '/shell/monitoring/Variables' },
  { id: 'message-queues', label: 'Message Queues', path: '/shell/monitoring/MessageQueues' },
  { id: 'number-ranges', label: 'Number Ranges', path: '/shell/monitoring/NumberRangeObject' },
  { id: 'user-roles', label: 'User Roles', path: '/shell/monitoring/UserRoles' },
  { id: 'message-usage', label: 'Message Usage', path: '/shell/monitoring/MessageUsage' },
  { id: 'top-flows', label: 'Top Flows', path: '/shell/rc/monitoring-storage/flow-usage?time=PAST_WEEK&mplStatus=ALL&topFlows=15' },
  { id: 'system-logs', label: 'System Logs', path: '/shell/monitoring/SystemLogs' },
  { id: 'message-locks', label: 'Message Locks', path: '/shell/monitoring/Locks' },
  { id: 'designtime-locks', label: 'Designtime Artifact Locks', path: '/shell/monitoring/DesigntimeLocks' },
];

// Default quick link IDs for first-time users
export const DEFAULT_QUICK_IDS = ['processed-messages', 'failed-messages', 'integration-content', 'design'];

