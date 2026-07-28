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

const LOG_TAG = 'InlineTraceOverlay';
const TRACE_CLICKABLE_CLASS = 'cursor-pointer';

// Hardcoded hex values (not `var(--color-*)`) — these are applied directly to
// SVG elements on the SAP host page, *outside* our Shadow Root. daisyUI's CSS
// custom properties only exist inside the Shadow Root (`data-theme="flowmate"`),
// so `var(--color-success)` etc. would be invalid there and the SVG `fill`
// would fall back to its initial value (black), painting the shapes solid
// black. Keep these in sync with the `flowmate` theme in assets/flowmate-theme.css.
const COLOR_SUCCESS = '#15803d';
const COLOR_ERROR = '#d32f2f';
const COLOR_PRIMARY = '#0070f2';
const COLOR_INFO = '#0a6ed1';
const COLOR_WARNING = '#b45309';
const COLOR_ACCENT = '#0070f2';

type StepClickHandler = (element: InlineTraceElement, allElements: InlineTraceElement[]) => void;

type SvgMapping = {
  svgElement: Element;
  target: Element;
  originalStyle: string | null;
  color: string;
};

export class InlineTraceOverlay {
  private elements: InlineTraceElement[] = [];
  private clickHandlers: Map<Element, (e: Event) => void> = new Map();
  private svgMappingCache: Map<string, SvgMapping> = new Map();
  private observer: MutationObserver | null = null;
  private activeStepId: string | null = null;

  async show(
    messageGuid: string,
    onStepClick: StepClickHandler,
  ): Promise<boolean> {
    const baseUrl = getCpiBaseUrl();

    try {
      const runs = await fetchRuns(baseUrl, messageGuid);
      if (runs.length === 0) {
        showToast('No trace runs found', 'warning');
        return false;
      }

      // Safe: guarded by the runs.length === 0 check above.
      let selectedRun = runs[0]!;
      if (runs.length > 1) {
        const state = selectedRun.OverallState;
        if (state !== 'COMPLETED' && state !== 'ESCALATED') {
          selectedRun = runs[1]!;
        }
      }
      const runId = selectedRun.Id;
      devLog.info(LOG_TAG, 'Loading inline trace', { messageGuid, runId });

      const rawSteps = await fetchRunSteps(baseUrl, runId);
      if (rawSteps.length === 0) {
        showToast('No trace steps found', 'warning');
        return false;
      }

      this.elements = rawSteps.map(step => this.convertStep(step));
      const perfMap = this.classifyPerformance(this.elements);

      this.svgMappingCache.clear();
      let appliedCount = 0;
      for (const el of this.elements) {
        const mapping = this.mapStepToSvgElement(el);
        if (!mapping) continue;

        const color = this.resolveStepColor(el, perfMap.get(el.stepId));
        const cached: SvgMapping = {
          ...mapping,
          originalStyle: mapping.target.getAttribute('style'),
          color,
        };

        this.svgMappingCache.set(el.stepId, cached);
        this.applyStepColor(cached.target, color);
        cached.svgElement.classList.add(TRACE_CLICKABLE_CLASS);
        appliedCount++;

        const handler = (e: Event) => {
          e.stopPropagation();
          this.setActiveStep(el.stepId);
          onStepClick(el, this.elements);
        };
        cached.svgElement.addEventListener('click', handler);
        this.clickHandlers.set(cached.svgElement, handler);
      }

      devLog.info(LOG_TAG, `Applied overlay to ${appliedCount}/${this.elements.length} steps`);

      if (appliedCount === 0) {
        showToast('Could not map trace steps to BPMN diagram', 'warning');
        return false;
      }

      this.installMutationObserver();

      showToast(`Inline trace: ${appliedCount} steps highlighted`, 'success');
      return true;
    } catch (error) {
      devLog.error(LOG_TAG, 'Failed to show inline trace', { error: String(error) });
      showToast(`Failed to load inline trace: ${error}`, 'error');
      return false;
    }
  }

  hide(): void {
    for (const mapping of this.svgMappingCache.values()) {
      if (mapping.originalStyle === null) {
        mapping.target.removeAttribute('style');
      } else {
        mapping.target.setAttribute('style', mapping.originalStyle);
      }
      mapping.svgElement.classList.remove(TRACE_CLICKABLE_CLASS);
    }

    for (const [element, handler] of this.clickHandlers) {
      element.removeEventListener('click', handler);
    }
    this.clickHandlers.clear();

    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    this.elements = [];
    this.svgMappingCache.clear();
    this.activeStepId = null;
    devLog.debug(LOG_TAG, 'Overlay hidden');
  }

  setActiveStep(stepId: string): void {
    if (this.activeStepId && this.activeStepId !== stepId) {
      const previous = this.svgMappingCache.get(this.activeStepId);
      if (previous) this.applyStepColor(previous.target, previous.color);
    }

    this.activeStepId = stepId;

    const mapping = this.svgMappingCache.get(stepId);
    if (mapping) {
      this.applyStepColor(mapping.target, COLOR_PRIMARY);
    }
  }

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

  private resolveStepColor(element: InlineTraceElement, tier?: PerformanceTier): string {
    if (element.error) return COLOR_ERROR;
    if (!tier) return COLOR_SUCCESS;

    switch (tier) {
      case 'max':
        return COLOR_ERROR;
      case 'min':
        return COLOR_INFO;
      case 'avg':
        return COLOR_SUCCESS;
      case 'above-avg':
        return COLOR_WARNING;
      case 'below-avg':
        return COLOR_ACCENT;
    }
  }

  private applyStepColor(target: Element, color: string): void {
    if (!(target instanceof SVGElement)) return;
    target.style.setProperty('fill', color, 'important');
    target.style.setProperty('stroke', color, 'important');
  }

  private mapStepToSvgElement(
    step: InlineTraceElement,
  ): { svgElement: Element; target: Element } | null {
    const { stepId, modelStepId } = step;

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

    return this.findBpmnShape(stepId, false);
  }

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
      const target = shape.children[0]?.children[0];
      if (!target) return null;
      return { svgElement: shape, target };
    }

    const firstG = shape.querySelector('g');
    if (!firstG) return null;
    const target = firstG.children[0];
    if (!target) return null;
    return { svgElement: shape, target };
  }

  private findBpmnEdgeText(
    modelStepId: string,
  ): { svgElement: Element; target: Element } | null {
    const edge = document.getElementById(`BPMNEdge_${modelStepId}`);
    if (!edge) return null;

    const textEl = edge.querySelector('text.shapeText');
    if (!textEl) return null;

    return { svgElement: edge, target: textEl };
  }

  private classifyPerformance(elements: InlineTraceElement[]): Map<string, PerformanceTier> {
    const result = new Map<string, PerformanceTier>();

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

  private installMutationObserver(): void {
    const svgContainer = document.querySelector('.sapUiBody svg') ??
                          document.querySelector('svg[class*="BPMN"]') ??
                          document.querySelector('.bpmnCanvas svg') ??
                          document.querySelector('svg');

    if (!svgContainer?.parentElement) {
      devLog.warn(LOG_TAG, 'Could not find SVG container for MutationObserver');
      return;
    }

    this.observer = new MutationObserver((mutations) => {
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
