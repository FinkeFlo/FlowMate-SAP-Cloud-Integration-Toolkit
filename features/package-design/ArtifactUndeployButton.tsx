import { useState } from 'preact/hooks';
import { LoaderCircle, CloudOff } from 'lucide-preact';
import type { ArtifactStatus, DeployedArtifactInfo } from './ArtifactStatus';
import { getCpiBaseUrl } from '@/features/shared/navigation';
import { fetchCpi } from '@/features/shared/fetch-client';
import { t } from '@/features/shared/i18n';
import { showToast } from '@/features/shared/toast';
import { devLog } from '@/features/shared/dev-logger';
import {
  SAP_CMD_DELETE_CONTENT,
  SAP_SELECTED_ROW_SELECTORS,
  SAP_CHECKED_ROW_SELECTORS,
} from '@/features/shared/constants';
import './ArtifactButtons.css';

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
    while (node = walker.nextNode()) {
      const text = node.textContent?.trim();
      if (text) names.push(text);
    }
  }

  return names;
}

export function ArtifactUndeployButton({ artifactStatus }: ArtifactUndeployButtonProps) {
  const [running, setRunning] = useState(false);

  async function handleUndeploy() {
    if (running) return;

    const deployedMap = artifactStatus.getDeployedArtifactsMap();
    const selectedNames = getSelectedArtifactNames();

    const toUndeploy: Array<{ name: string; info: DeployedArtifactInfo }> = [];
    const seen = new Set<string>();

    for (const text of selectedNames) {
      const info = deployedMap.get(text);
      if (info && info.deployState === 'DEPLOYED' && info.artifactId && !seen.has(info.artifactId)) {
        seen.add(info.artifactId);
        toUndeploy.push({ name: info.symbolicName ?? text, info });
      }
    }

    if (toUndeploy.length === 0) {
      showToast('No deployed artifacts selected', 'warning');
      return;
    }

    const nameList = toUndeploy.map(a => `  - ${a.name}`).join('\n');
    const confirmed = window.confirm(
      `Undeploy ${toUndeploy.length} artifact(s)?\n\n${nameList}`
    );
    if (!confirmed) return;

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
          showToast(`Error undeploying ${name}: ${error}`, 'error');
        }
      }

      showToast(`${successCount} of ${toUndeploy.length} artifact(s) undeployed`, successCount > 0 ? 'success' : 'error');
    } catch (error) {
      devLog.error(LOG_TAG, 'Failed to fetch CSRF token', { error: String(error) });
      showToast(`Failed to fetch CSRF token: ${error}`, 'error');
    } finally {
      setRunning(false);
      artifactStatus.refresh();
    }
  }

  return (
    <button
      class="artifact-btn artifact-btn--undeploy"
      disabled={running}
      onClick={handleUndeploy}
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
  );
}
