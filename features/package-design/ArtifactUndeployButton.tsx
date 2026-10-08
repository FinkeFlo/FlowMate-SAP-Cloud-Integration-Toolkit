import { useState } from 'preact/hooks';
import { LoaderCircle, CloudOff } from 'lucide-preact';
import type { ArtifactStatus, DeployedArtifactInfo } from './ArtifactStatus';
import { getCpiBaseUrl } from '@/features/shared/navigation';
import { fetchCpi } from '@/features/shared/fetch-client';
import { t, tSub } from '@/features/shared/i18n';
import { ConfirmDialog } from '@/features/shared/ConfirmDialog';
import { showToast } from '@/features/shared/toast';
import { devLog } from '@/features/shared/dev-logger';
import {
  SAP_CMD_DELETE_CONTENT,
  SAP_SELECTED_ROW_SELECTORS,
  SAP_CHECKED_ROW_SELECTORS,
} from '@/features/shared/constants';

const LOG_TAG = 'ArtifactUndeploy';

interface ArtifactUndeployButtonProps {
  artifactStatus: ArtifactStatus;
}

function getSelectedArtifactNames(): string[] {
  const names: string[] = [];

  const selectedRows = document.querySelectorAll(SAP_SELECTED_ROW_SELECTORS);

  const rows = selectedRows.length > 0
    ? selectedRows
    : document.querySelectorAll(SAP_CHECKED_ROW_SELECTORS);

  for (const row of Array.from(rows)) {
    const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent?.trim();
      if (text) names.push(text);
    }
  }

  return names;
}

type UndeployTarget = { name: string; info: DeployedArtifactInfo };

export function ArtifactUndeployButton({ artifactStatus }: ArtifactUndeployButtonProps) {
  const [running, setRunning] = useState(false);
  const [pending, setPending] = useState<UndeployTarget[] | null>(null);

  function requestUndeploy() {
    if (running || pending) return;

    const deployedMap = artifactStatus.getDeployedArtifactsMap();
    const selectedNames = getSelectedArtifactNames();

    const toUndeploy: UndeployTarget[] = [];
    const seen = new Set<string>();

    for (const text of selectedNames) {
      const info = deployedMap.get(text);
      if (info && info.deployState === 'DEPLOYED' && info.artifactId && !seen.has(info.artifactId)) {
        seen.add(info.artifactId);
        toUndeploy.push({ name: info.symbolicName ?? text, info });
      }
    }

    if (toUndeploy.length === 0) {
      showToast(t('artifactNoneDeployed'), 'warning');
      return;
    }

    setPending(toUndeploy);
  }

  async function runUndeploy(toUndeploy: UndeployTarget[]) {
    setPending(null);
    setRunning(true);
    let successCount = 0;
    const baseUrl = getCpiBaseUrl();

    try {
      const csrfToken = await artifactStatus.fetchCsrfToken();

      for (const { name, info } of toUndeploy) {
        try {
          devLog.info(LOG_TAG, `Undeploying ${name}`, { artifactId: info.artifactId });

          await fetchCpi(
            `${baseUrl}${SAP_CMD_DELETE_CONTENT}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-CSRF-Token': csrfToken,
              },
              body: `artifactIds=${encodeURIComponent(info.artifactId!)}&tenantId=${encodeURIComponent(info.tenantId!)}`,
            }
          );

          successCount++;
          devLog.info(LOG_TAG, `Successfully undeployed ${name}`);
        } catch (error) {
          devLog.error(LOG_TAG, `Error undeploying ${name}`, { error: String(error) });
          showToast(`${tSub('artifactUndeployError', name)}: ${error}`, 'error');
        }
      }

      showToast(t('artifactUndeployed', [String(successCount), String(toUndeploy.length)]), successCount > 0 ? 'success' : 'error');
    } catch (error) {
      devLog.error(LOG_TAG, 'Failed to fetch CSRF token', { error: String(error) });
      showToast(`${t('artifactCsrfFailed')}: ${error}`, 'error');
    } finally {
      setRunning(false);
      artifactStatus.refresh();
    }
  }

  return (
    <>
    {pending && (
      <ConfirmDialog
        title={pending.length === 1
          ? tSub('confirmUndeployOneTitle', pending[0]!.name)
          : tSub('confirmUndeployTitle', String(pending.length))}
        items={pending.map(a => a.name)}
        confirmLabel={t('artifactUndeploy')}
        confirmClass="btn-error"
        onConfirm={() => runUndeploy(pending)}
        onCancel={() => setPending(null)}
      />
    )}
    <button
      class="btn btn-error btn-soft btn-sm w-full justify-start gap-2"
      disabled={running}
      onClick={requestUndeploy}
    >
      {running ? (
        <>
          <span class="flowmate-spin"><LoaderCircle size={16} /></span>
          <span>{t('artifactUndeploying')}</span>
        </>
      ) : (
        <>
          <CloudOff size={16} />
          <span>{t('artifactUndeploy')}</span>
        </>
      )}
    </button>
    </>
  );
}
