import { useState, useEffect, useRef } from 'preact/hooks';
import { LoaderCircle, ToggleRight } from 'lucide-preact';
import { showToast } from '@/features/shared/toast';
import { devLog } from '@/features/shared/dev-logger';
import { extractIFlowId, fetchTraceState, setTraceLevel } from './trace-api';

const LOG_TAG = 'TraceToggle';
const INITIAL_FETCH_DELAY_MS = 1500;
const INITIAL_FETCH_RETRIES = 3;
const INITIAL_FETCH_RETRY_DELAY_MS = 3000;

export function TraceToggleButton() {
  const [traceActive, setTraceActive] = useState(false);
  const [toggling, setToggling] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    fetchInitial();
    return () => { mountedRef.current = false; };
  }, []);

  async function fetchInitial() {
    const iflowId = extractIFlowId();
    if (!iflowId) return;

    await new Promise(r => setTimeout(r, INITIAL_FETCH_DELAY_MS));

    for (let attempt = 1; attempt <= INITIAL_FETCH_RETRIES; attempt++) {
      if (!mountedRef.current) return;
      try {
        devLog.debug(LOG_TAG, `Fetching initial trace state (attempt ${attempt}/${INITIAL_FETCH_RETRIES})`, { iflowId });
        const isActive = await fetchTraceState(iflowId);
        if (mountedRef.current) {
          setTraceActive(isActive);
          devLog.info(LOG_TAG, 'Initial trace state loaded', { iflowId, traceActive: isActive });
        }
        return;
      } catch (error) {
        devLog.warn(LOG_TAG, `Failed to fetch initial state (attempt ${attempt})`, { error: String(error) });
        if (attempt < INITIAL_FETCH_RETRIES) {
          await new Promise(r => setTimeout(r, INITIAL_FETCH_RETRY_DELAY_MS));
        }
      }
    }
    devLog.warn(LOG_TAG, 'Could not determine initial trace state after all retries - defaulting to OFF');
  }

  async function handleToggle() {
    const iflowId = extractIFlowId();
    if (!iflowId || toggling) return;

    setToggling(true);
    const newLevel = traceActive ? 'INFO' : 'TRACE';
    devLog.info(LOG_TAG, `Toggling trace: ${traceActive ? 'ON -> OFF' : 'OFF -> ON'}`, { iflowId, newLevel });

    try {
      await setTraceLevel(iflowId, newLevel);
      const newState = newLevel === 'TRACE';
      if (mountedRef.current) {
        setTraceActive(newState);
        devLog.info(LOG_TAG, `Trace ${newState ? 'enabled' : 'disabled'} successfully`, { iflowId });
        showToast(
          newState ? 'Trace enabled - log level set to TRACE' : 'Trace disabled - log level set to INFO',
          newState ? 'success' : 'info',
        );
      }
    } catch (error) {
      devLog.error(LOG_TAG, 'Failed to toggle trace', { error: String(error), iflowId });
      showToast(`Failed to toggle trace: ${error}`, 'error');
    } finally {
      if (mountedRef.current) setToggling(false);
    }
  }

  return (
    <button
      class={`btn btn-sm w-full justify-start gap-2 ${traceActive ? 'btn-success' : 'btn-primary'}`}
      onClick={handleToggle}
      disabled={toggling}
    >
      {toggling ? (
        <>
          <span class="animate-spin"><LoaderCircle size={16} /></span>
          <span>Loading...</span>
        </>
      ) : (
        <>
          <ToggleRight size={16} />
          <span>{traceActive ? 'Trace ON' : 'Trace OFF'}</span>
        </>
      )}
    </button>
  );
}
