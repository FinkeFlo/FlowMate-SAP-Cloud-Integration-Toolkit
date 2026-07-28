import { useState, useRef, useEffect } from 'preact/hooks';
import { DesignTimeToolbar } from '@/features/design-tools/DesignTimeToolbar';
import { TraceToggleButton } from '@/features/trace-mode/TraceToggleButton';
import { MessageLogPanel } from '@/features/message-log/MessageLogPanel';
import { MessageDetailPopup } from '@/features/message-log/MessageDetailPopup';
import { ArtifactRefreshButton } from '@/features/package-design/ArtifactRefreshButton';
import { ArtifactUndeployButton } from '@/features/package-design/ArtifactUndeployButton';
import { ArtifactStatus } from '@/features/package-design/ArtifactStatus';
import { ExportButton } from '@/features/message-usage/ExportButton';
import { LogThrottlePanel } from '@/features/log-throttle';
import { InlineTraceOverlay, TraceStepPopup } from '@/features/inline-trace';
import type { TracePopupState } from '@/features/inline-trace';
import { usePageType } from '@/features/shared/usePageType';
import { getCpiBaseUrl } from '@/features/shared/navigation';
import { ToastContainer } from '@/features/shared/ToastContainer';

interface DetailPopupState {
  guid: string;
  baseUrl: string;
}

export function ContentApp() {
  const pageType = usePageType();
  const artifactStatusRef = useRef(new ArtifactStatus());
  const overlayRef = useRef(new InlineTraceOverlay());
  const [detailPopup, setDetailPopup] = useState<DetailPopupState | null>(null);
  const [activeInlineTrace, setActiveInlineTrace] = useState<string | null>(null);
  const [tracePopup, setTracePopup] = useState<(TracePopupState & { baseUrl: string }) | null>(null);
  const prevPageTypeRef = useRef(pageType);

  const artifactStatus = artifactStatusRef.current;

  // Handle ArtifactStatus show/hide based on page type
  useEffect(() => {
    if (pageType === 'package-artifacts') {
      artifactStatus.show();
    } else if (prevPageTypeRef.current === 'package-artifacts') {
      artifactStatus.hide();
    }
    prevPageTypeRef.current = pageType;
  }, [pageType, artifactStatus]);

  function handleShowDetail(guid: string, baseUrl: string) {
    setDetailPopup({ guid, baseUrl });
  }

  async function handleStartInlineTrace(messageGuid: string) {
    const overlay = overlayRef.current;

    // Toggle off if already active for this message
    if (activeInlineTrace === messageGuid) {
      overlay.hide();
      setActiveInlineTrace(null);
      setTracePopup(null);
      return;
    }

    // Hide previous overlay
    overlay.hide();
    setTracePopup(null);

    const baseUrl = getCpiBaseUrl();
    const success = await overlay.show(messageGuid, (element, allElements) => {
      overlay.setActiveStep(element.stepId);
      setTracePopup({ element, allElements, baseUrl });
    });

    if (success) {
      setActiveInlineTrace(messageGuid);
    }
  }

  function handleTraceNavigate(element: TracePopupState['element']) {
    overlayRef.current.setActiveStep(element.stepId);
    setTracePopup(prev => prev ? { ...prev, element } : null);
  }

  return (
    <>
      {/* iFlow Design Page: Trace toggle + Message Log */}
      {pageType === 'iflow-design' && (
        <DesignTimeToolbar>
          <TraceToggleButton />
          <MessageLogPanel
            onShowDetail={handleShowDetail}
            onStartInlineTrace={handleStartInlineTrace}
            activeInlineTrace={activeInlineTrace}
          />
        </DesignTimeToolbar>
      )}

      {/* Package Artifacts Page: Refresh + Undeploy */}
      {pageType === 'package-artifacts' && (
        <DesignTimeToolbar>
          <ArtifactRefreshButton artifactStatus={artifactStatus} />
          <ArtifactUndeployButton artifactStatus={artifactStatus} />
        </DesignTimeToolbar>
      )}

      {/* Message Usage Page: Export button */}
      {pageType === 'message-usage' && <ExportButton />}

      {/* Top Flows Monitoring Page: Log throttle panel */}
      {pageType === 'top-flows-monitoring' && (
        <DesignTimeToolbar>
          <LogThrottlePanel />
        </DesignTimeToolbar>
      )}

      {/* Message Detail Popup (rendered at top level for z-index) */}
      {detailPopup && (
        <MessageDetailPopup
          guid={detailPopup.guid}
          baseUrl={detailPopup.baseUrl}
          onClose={() => setDetailPopup(null)}
        />
      )}

      {/* Trace Step Popup (rendered at top level for z-index) */}
      {tracePopup && (
        <TraceStepPopup
          element={tracePopup.element}
          allElements={tracePopup.allElements}
          baseUrl={tracePopup.baseUrl}
          onNavigate={handleTraceNavigate}
          onClose={() => setTracePopup(null)}
        />
      )}

      <ToastContainer />
    </>
  );
}
