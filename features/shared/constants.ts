/**
 * Shared constants for SAP CPI-specific values, CSS selectors, and configuration.
 *
 * Centralizes magic strings and values that would otherwise be scattered
 * across multiple feature modules.
 */

// ---------------------------------------------------------------------------
// SAP CPI API paths (relative to the CPI base URL)
// ---------------------------------------------------------------------------

/** Runtime artifacts list command (XML response). */
export const SAP_CMD_LIST_ARTIFACTS =
  '/Operations/com.sap.it.op.tmn.commands.dashboard.webui.IntegrationComponentsListCommand';

/** Single artifact detail command (XML response). */
export const SAP_CMD_ARTIFACT_DETAIL =
  '/Operations/com.sap.it.op.tmn.commands.dashboard.webui.IntegrationComponentDetailCommand';

/** Set MPL log level command (POST, JSON body). */
export const SAP_CMD_SET_LOG_LEVEL =
  '/Operations/com.sap.it.op.tmn.commands.dashboard.webui.IntegrationComponentSetMplLogLevelCommand';

/** Undeploy / delete content command (POST). */
export const SAP_CMD_DELETE_CONTENT =
  '/Operations/com.sap.it.nm.commands.deploy.DeleteContentCommand';

/** CSRF token endpoint. */
export const SAP_CSRF_ENDPOINT = '/api/1.0/user';

/** Resource usage endpoint — returns per-iFlow daily MPL counts. */
export const SAP_API_RESOURCE_USAGE = '/api/v1/resourceusage';

/** OData base path for Message Processing Logs. */
export const SAP_ODATA_MPL = '/odata/api/v1/MessageProcessingLogs';

/** OData base path for Message Store Entries. */
export const SAP_ODATA_STORE_ENTRIES = '/odata/api/v1/MessageStoreEntries';

/** OData base path for MessageProcessingLogRuns (to get RunSteps). */
export const SAP_ODATA_RUN_STEPS = '/odata/api/v1/MessageProcessingLogRuns';

/** OData base path for MessageProcessingLogRunSteps (individual step detail). */
export const SAP_ODATA_RUN_STEP_DETAIL = '/odata/api/v1/MessageProcessingLogRunSteps';

/** OData base path for TraceMessages. */
export const SAP_ODATA_TRACE_MESSAGES = '/odata/api/v1/TraceMessages';

/** Default runtime location ID for Cloud Integration. */
export const SAP_RUNTIME_LOCATION_ID = 'cloudintegration';

// ---------------------------------------------------------------------------
// SAP UI CSS selectors (used to find and enhance DOM elements)
// ---------------------------------------------------------------------------

/** Selectors for table/list containers in SAP UI5. */
export const SAP_TABLE_SELECTORS = '.sapMList, .sapMTable, table';

/** Selectors for data rows in SAP UI5 tables/lists. */
export const SAP_ROW_SELECTORS =
  'tr.sapMListTblRow, li.sapMListTblRow, li.sapMLIB, tbody tr';

/** Selectors for selected rows in SAP UI5 tables. */
export const SAP_SELECTED_ROW_SELECTORS =
  'tr.sapMListTblRowSelected, li.sapMLIBSelected';

/** Fallback selectors for rows with checked checkboxes. */
export const SAP_CHECKED_ROW_SELECTORS =
  'tr:has(input[type="checkbox"]:checked), li:has(input[type="checkbox"]:checked)';

// ---------------------------------------------------------------------------
// Flowmate DOM markers
// ---------------------------------------------------------------------------

/** CSS class applied to status badges injected by ArtifactStatus. */
export const STATUS_BADGE_CLASS = 'cpi-helper-status-badge';

/** Data attribute marking rows already processed by ArtifactStatus. */
export const STATUS_CHECKED_ATTR = 'data-cpi-status-checked';

// ---------------------------------------------------------------------------
// MPL Status Colors (shared between MessageLogPanel and MessageDetailPopup)
// ---------------------------------------------------------------------------

/** Color map for MPL status values. */
export const MPL_STATUS_COLORS: Record<string, string> = {
  COMPLETED: '#10b981',
  FAILED: '#ef4444',
  PROCESSING: '#f59e0b',
  ESCALATED: '#f59e0b',
  RETRY: '#f59e0b',
  CANCELLED: '#6b7280',
  ABANDONED: '#6b7280',
};
