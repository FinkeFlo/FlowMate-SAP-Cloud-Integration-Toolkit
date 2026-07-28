/**
 * InlineTraceOverlay — highlights executed steps on the BPMN SVG diagram.
 *
 * Direct DOM manipulation (like ArtifactStatus.ts) because the BPMN SVG
 * is rendered by SAP UI5 and cannot be managed by Preact's virtual DOM.
 */

import { devLog } from '@/features/shared/dev-logger';
import { getCpiBaseUrl } from '@/features/shared/navigation';
import { showToast } from '@/features/shared/toast';
import { parseODataDate } from '@/features/message-log/mpl-types';
import { fetchRuns } from '@/features/message-log/MplApiClient';
import { fetchRunSteps } from './InlineTraceApiClient';
import type { InlineTraceElement, PerformanceTier, RunStep } from './inline-trace-types';
import './inline-trace-overlay.css';

const LOG_TAG = 'InlineTraceOverlay';

const TRACE_STEP_CLASS = 'flowmate-trace-step';
const TRACE_ACTIVE_CLASS = 'flowmate-trace-step--active';
const TRACE_ERROR_CLASS = 'flowmate-trace-step--error';
const TRACE_CLICKABLE_CLASS = 'flowmate-trace-clickable';
const PERF_CLASS_PREFIX = 'flowmate-trace-perf--';

type StepClickHandler = (element: InlineTraceElement, allElements: InlineTraceElement[]) => void;

export class InlineTraceOverlay {
  private elements: InlineTraceElement[] = [];
  private clickHandlers: Map<Element, (e: Event) => void> = new Map();
  private svgMappingCache: Map<string, { svgElement: Element; target: Element }> = new Map();
  private observer: MutationObserver | null = null;
  private activeStepId: string | null = null;

  /**
   * Show inline trace overlay for a given message GUID.
   * Returns true if the overlay was successfully applied.
   */
  async show(
    messageGuid: string,
    onStepClick: StepClickHandler,
  ): Promise<boolean> {
    const baseUrl = getCpiBaseUrl();

    try {
      // 1. Get runs for this message
      const runs = await fetchRuns(baseUrl, messageGuid);
      if (runs.length === 0) {
        showToast('No trace runs found', 'warning');
        return false;
      }

      // Pick the correct run: if multiple runs and first isn't completed/escalated, use second
      let selectedRun = runs[0];
      if (runs.length > 1) {
        const state = selectedRun.OverallState;
        if (state !== 'COMPLETED' && state !== 'ESCALATED') {
          selectedRun = runs[1];
        }
      }
      const runId = selectedRun.Id;
      devLog.info(LOG_TAG, 'Loading inline trace', { messageGuid, runId });

      // 2. Get all run steps
      const rawSteps = await fetchRunSteps(baseUrl, runId);
      if (rawSteps.length === 0) {
        showToast('No trace steps found', 'warning');
        return false;
      }

      // 3. Convert to InlineTraceElements
      this.elements = rawSteps.map(step => this.convertStep(step));

      // 4. Calculate performance tiers
      const perfMap = this.classifyPerformance(this.elements);

      // 5. Apply to SVG and cache mappings
      this.svgMappingCache.clear();
      let appliedCount = 0;
      for (const el of this.elements) {
        const mapping = this.mapStepToSvgElement(el);
        if (!mapping) continue;

        this.svgMappingCache.set(el.stepId, mapping);
        const { svgElement, target } = mapping;
        appliedCount++;

        // Apply base class
        if (el.error) {
          target.classList.add(TRACE_ERROR_CLASS);
        } else {
          target.classList.add(TRACE_STEP_CLASS);
        }

        // Apply performance tier class
        const tier = perfMap.get(el.stepId);
        if (tier) {
          target.classList.add(`${PERF_CLASS_PREFIX}${tier}`);
        }

        // Make clickable
        svgElement.classList.add(TRACE_CLICKABLE_CLASS);

        // Click handler
        const handler = (e: Event) => {
          e.stopPropagation();
          this.setActiveStep(el.stepId);
          onStepClick(el, this.elements);
        };
        svgElement.addEventListener('click', handler);
        this.clickHandlers.set(svgElement, handler);
      }

      devLog.info(LOG_TAG, `Applied overlay to ${appliedCount}/${this.elements.length} steps`);

      if (appliedCount === 0) {
        showToast('Could not map trace steps to BPMN diagram', 'warning');
        return false;
      }

      // 6. Install MutationObserver to detect diagram re-renders
      this.installMutationObserver();

      showToast(`Inline trace: ${appliedCount} steps highlighted`, 'success');
      return true;

    } catch (error) {
      devLog.error(LOG_TAG, 'Failed to show inline trace', { error: String(error) });
      showToast(`Failed to load inline trace: ${error}`, 'error');
      return false;
    }
  }

  /**
   * Remove all overlay elements and clean up.
   */
  hide(): void {
    // Remove CSS classes from SVG elements
    const allClasses = [
      TRACE_STEP_CLASS,
      TRACE_ACTIVE_CLASS,
      TRACE_ERROR_CLASS,
      TRACE_CLICKABLE_CLASS,
      `${PERF_CLASS_PREFIX}max`,
      `${PERF_CLASS_PREFIX}min`,
      `${PERF_CLASS_PREFIX}avg`,
      `${PERF_CLASS_PREFIX}above-avg`,
      `${PERF_CLASS_PREFIX}below-avg`,
    ];

    for (const cls of allClasses) {
      document.querySelectorAll(`.${cls}`).forEach(el => el.classList.remove(cls));
    }

    // Remove click handlers
    for (const [element, handler] of this.clickHandlers) {
      element.removeEventListener('click', handler);
    }
    this.clickHandlers.clear();

    // Disconnect observer
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    this.elements = [];
    this.svgMappingCache.clear();
    this.activeStepId = null;
    devLog.debug(LOG_TAG, 'Overlay hidden');
  }

  /**
   * Highlight a specific step as active (for popup navigation).
   */
  setActiveStep(stepId: string): void {
    // Remove previous active
    document.querySelectorAll(`.${TRACE_ACTIVE_CLASS}`).forEach(el => {
      el.classList.remove(TRACE_ACTIVE_CLASS);
    });

    this.activeStepId = stepId;

    // Find and highlight the new active step (use cache from show())
    const mapping = this.svgMappingCache.get(stepId);
    if (mapping) {
      mapping.target.classList.add(TRACE_ACTIVE_CLASS);
    }
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private convertStep(step: RunStep): InlineTraceElement {
    const startMs = this.parseODataTimestamp(step.StepStart);
    const stopMs = step.StepStop ? this.parseODataTimestamp(step.StepStop) : startMs;

    return {
      stepId: step.StepId,
      modelStepId: step.ModelStepId,
      childCount: step.ChildCount,
      runId: step.RunId,
      branchId: step.BranchId,
      stepStart: step.StepStart,
      stepStop: step.StepStop ?? step.StepStart,
      durationMs: stopMs - startMs,
      error: step.Error,
    };
  }

  private parseODataTimestamp(dateStr: string): number {
    return parseODataDate(dateStr).getTime();
  }

  /**
   * Map a trace step to its SVG element in the BPMN diagram.
   * Returns the clickable SVG element and the target element for CSS classes.
   */
  private mapStepToSvgElement(
    step: InlineTraceElement,
  ): { svgElement: Element; target: Element } | null {
    const { stepId, modelStepId } = step;

    // Try different BPMN element patterns
    if (/StartEvent/.test(modelStepId)) {
      return this.findBpmnShape(modelStepId, true);
    }

    if (/EndEvent/.test(modelStepId)) {
      return this.findBpmnShape(stepId, true);
    }

    if (/MessageFlow_\d+/.test(modelStepId)) {
      return this.findBpmnEdgeText(modelStepId);
    }

    if (/ExclusiveGateway/.test(modelStepId) || /ParallelGateway/.test(modelStepId)) {
      return this.findBpmnShape(modelStepId, false);
    }

    // ServiceTask, CallActivity, and others
    return this.findBpmnShape(stepId, false);
  }

  /**
   * Find a BPMNShape element and return the clickable parent + colorable target.
   */
  private findBpmnShape(
    id: string,
    isEvent: boolean,
  ): { svgElement: Element; target: Element } | null {
    const shape = document.getElementById(`BPMNShape_${id}`);
    if (!shape) {
      devLog.debug(LOG_TAG, `BPMNShape not found: ${id}`);
      return null;
    }

    if (isEvent) {
      // Events: children[0].children[0] is the circle
      const target = shape.children[0]?.children[0];
      if (!target) return null;
      return { svgElement: shape, target };
    }

    // Tasks/Gateways: first <g> child → first child is the rect/polygon
    const firstG = shape.querySelector('g');
    if (!firstG) return null;
    const target = firstG.children[0];
    if (!target) return null;
    return { svgElement: shape, target };
  }

  /**
   * Find a BPMNEdge text element (for MessageFlow).
   */
  private findBpmnEdgeText(
    modelStepId: string,
  ): { svgElement: Element; target: Element } | null {
    const edge = document.getElementById(`BPMNEdge_${modelStepId}`);
    if (!edge) return null;

    const textEl = edge.querySelector('text.shapeText');
    if (!textEl) return null;

    return { svgElement: edge, target: textEl };
  }

  /**
   * Classify performance of each element relative to all elements.
   */
  private classifyPerformance(elements: InlineTraceElement[]): Map<string, PerformanceTier> {
    const result = new Map<string, PerformanceTier>();

    // Filter elements with meaningful durations
    const withDuration = elements.filter(e => e.durationMs > 0);
    if (withDuration.length < 2) return result;

    const durations = withDuration.map(e => e.durationMs);
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

    for (const el of withDuration) {
      let tier: PerformanceTier;
      if (el.durationMs === maxDuration) {
        tier = 'max';
      } else if (el.durationMs === minDuration) {
        tier = 'min';
      } else if (Math.abs(el.durationMs - avgDuration) < avgDuration * 0.1) {
        tier = 'avg';
      } else if (el.durationMs > avgDuration) {
        tier = 'above-avg';
      } else {
        tier = 'below-avg';
      }
      result.set(el.stepId, tier);
    }

    return result;
  }

  /**
   * Watch for SAP UI5 re-rendering the BPMN diagram. When it happens, clean up.
   */
  private installMutationObserver(): void {
    // Find the SVG container
    const svgContainer = document.querySelector('.sapUiBody svg') ??
                          document.querySelector('svg[class*="BPMN"]') ??
                          document.querySelector('.bpmnCanvas svg') ??
                          document.querySelector('svg');

    if (!svgContainer?.parentElement) {
      devLog.warn(LOG_TAG, 'Could not find SVG container for MutationObserver');
      return;
    }

    this.observer = new MutationObserver((mutations) => {
      // Check if the SVG was removed/replaced
      for (const mutation of mutations) {
        for (const removed of Array.from(mutation.removedNodes)) {
          if (removed === svgContainer || (removed as Element).contains?.(svgContainer)) {
            devLog.info(LOG_TAG, 'BPMN diagram removed - hiding overlay');
            this.hide();
            return;
          }
        }
      }
    });

    this.observer.observe(svgContainer.parentElement, { childList: true });
    devLog.debug(LOG_TAG, 'MutationObserver installed');
  }
}
