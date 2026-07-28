/**
 * TypeScript interfaces and helpers for SAP CPI Message Processing Log OData responses.
 */

/**
 * Parse an OData date string (e.g. "/Date(1740000000000)/") into a Date object.
 * Falls back to standard Date parsing for non-OData formats.
 */
export function parseODataDate(odataDate: string): Date {
  const match = odataDate.match(/\/Date\((\d+)\)\//);
  return match ? new Date(Number(match[1])) : new Date(odataDate);
}

export type MplStatus =
  | 'COMPLETED'
  | 'FAILED'
  | 'PROCESSING'
  | 'ESCALATED'
  | 'RETRY'
  | 'CANCELLED'
  | 'ABANDONED'
  | 'DISCARDED';

export interface MessageProcessingLog {
  MessageGuid: string;
  Status: MplStatus;
  LogStart: string;      // e.g. "/Date(1740000000000)/"
  LogEnd: string;        // e.g. "/Date(1740000000000)/"
  LogLevel: string;      // e.g. "INFO", "TRACE", "ERROR"
  AlternateWebLink: string;
}

export interface MplODataResponse {
  d: {
    results: MessageProcessingLog[];
  };
}

export interface MplRun {
  Id: string;
  Status: MplStatus;
  OverallState: MplStatus;
}

export interface MplRunsODataResponse {
  d: {
    results: MplRun[];
  };
}

/** Extended message detail returned by $expand=CustomHeaderProperties */
export interface MessageProcessingLogDetail {
  MessageGuid: string;
  CorrelationId: string;
  ApplicationMessageId: string;
  Sender: string;
  Receiver: string;
  LogStart: string;
  LogEnd: string;
  Status: MplStatus;
  LogLevel: string;
  CustomStatus: string;
  TransactionId: string;
  IntegrationFlowName: string;
  IntegrationArtifact?: {
    Id: string;
    Name: string;
    Type: string;
    PackageId: string;
    PackageName: string;
  };
  CustomHeaderProperties: { results: Array<{ Name: string; Value: string }> };
  AlternateWebLink: string;
}

export interface MplDetailODataResponse {
  d: MessageProcessingLogDetail;
}

/** Persist step entry */
export interface MessageStoreEntry {
  Id: string;
  MessageStoreId: string;
}

export interface MessageStoreEntriesODataResponse {
  d: {
    results: MessageStoreEntry[];
  };
}

/** Property of a persist entry */
export interface MessageStoreProperty {
  Name: string;
  Value: string;
}

export interface MessageStorePropertiesODataResponse {
  d: {
    results: MessageStoreProperty[];
  };
}
