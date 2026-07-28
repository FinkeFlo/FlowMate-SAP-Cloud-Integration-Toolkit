/**
 * TypeScript interfaces for SAP CPI Trace OData responses.
 */

/** RunStep from the OData API */
export interface RunStep {
  StepId: string;
  ModelStepId: string;
  RunId: string;
  ChildCount: number;
  StepStart: string;       // "/Date(...)/"
  StepStop: string | null;
  BranchId: string;
  Error: string | null;
}

export interface RunStepsODataResponse {
  d: { results: RunStep[] };
}

/** TraceMessage — contains the TraceId */
export interface TraceMessage {
  TraceId: number;
}

export interface TraceMessagesODataResponse {
  d: { results: TraceMessage[] };
}

/** Exchange Property / Message Header */
export interface TraceProperty {
  Name: string;
  Value: string;
}

export interface TracePropertiesODataResponse {
  d: { results: TraceProperty[] };
}

/** RunStep with expanded Properties */
export interface RunStepDetail {
  StepId: string;
  ModelStepId: string;
  ChildCount: number;
  StepStart: string;
  StepStop: string | null;
  RunId: string;
  BranchId: string;
  Error: string | null;
  RunStepProperties: { results: TraceProperty[] };
}

export interface RunStepDetailODataResponse {
  d: RunStepDetail;
}

/** Processed element for the overlay */
export interface InlineTraceElement {
  stepId: string;
  modelStepId: string;
  childCount: number;
  runId: string;
  branchId: string;
  stepStart: string;
  stepStop: string;
  durationMs: number;
  error: string | null;
}

/** Performance classification */
export type PerformanceTier = 'max' | 'min' | 'avg' | 'above-avg' | 'below-avg';
