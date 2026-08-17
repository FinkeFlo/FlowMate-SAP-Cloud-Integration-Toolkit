import { useState } from 'preact/hooks';
import { LoaderCircle, CloudUpload } from 'lucide-preact';
import type { ArtifactStatus } from './ArtifactStatus';
import { getCpiBaseUrl } from '@/features/shared/navigation';
import { fetchCpi } from '@/features/shared/fetch-client';
import { t } from '@/features/shared/i18n';
import { showToast } from '@/features/shared/toast';
import { devLog } from '@/features/shared/dev-logger';
import {
  SAP_ODATA_DEPLOY_ARTIFACT,
  SAP_SELECTED_ROW_SELECTORS,
  SAP_CHECKED_ROW_SELECTORS,
} from '@/features/shared/constants';

const LOG_TAG = 'ArtifactDeploy';

interface ArtifactDeployButtonProps {
  artifactStatus: ArtifactStatus;
}

function getSelectedArtifactNames(): string[] {
  const names: string[] = [];

  const selectedRows = document.querySelectorAll(SAP_SELECTED_ROW_SELECTORS);
  const rows =
    selectedRows.length > 0
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

export function ArtifactDeployButton({ artifactStatus }: ArtifactDeployButtonProps) {
  const [running, setRunning] = useState(false);

  async function handleDeploy() {
    if (running) return;

    const deployedMap = artifactStatus.getDeployedArtifactsMap();
    const designtimeMap = artifactStatus.getDesigntimeArtifactsMap();
    const selectedNames = getSelectedArtifactNames();

    const toDeploy: Array<{ displayName: string; artifactId: string }> = [];
    const seen = new Set<string>();

    for (const text of selectedNames) {
      // Prefer design-time map (covers deployed + undeployed artifacts)
      const dtInfo = designtimeMap.get(text);
      if (dtInfo && !seen.has(dtInfo.id)) {
        seen.add(dtInfo.id);
        toDeploy.push({ displayName: dtInfo.name, artifactId: dtInfo.id });
        continue;
      }

      // Fall back to deployed map (e.g. if design-time fetch failed)
      const rtInfo = deployedMap.get(text);
      if (rtInfo?.artifactId && !seen.has(rtInfo.artifactId)) {
        seen.add(rtInfo.artifactId);
        toDeploy.push({
          displayName: rtInfo.symbolicName ?? text,
          artifactId: rtInfo.artifactId,
        });
      }
    }

    if (toDeploy.length === 0) {
      showToast('No deployable artifacts selected', 'warning');
      return;
    }

    const nameList = toDeploy.map(a => `  - ${a.displayName}`).join('\n');
    const confirmed = window.confirm(
      `Deploy ${toDeploy.length} artifact(s)?\n\n${nameList}`
    );
    if (!confirmed) return;

    setRunning(true);
    let successCount = 0;
    const baseUrl = getCpiBaseUrl();

    try {
      const csrfToken = await artifactStatus.fetchCsrfToken();

      for (const { displayName, artifactId } of toDeploy) {
        try {
          devLog.info(LOG_TAG, `Deploying ${displayName}`, { artifactId });

          await fetchCpi(
            `${baseUrl}${SAP_ODATA_DEPLOY_ARTIFACT}?Id='${encodeURIComponent(artifactId)}'&Version='active'`,
            {
              method: 'POST',
              headers: {
                'X-CSRF-Token': csrfToken,
                'Accept': 'application/json',
              },
            }
          );

          successCount++;
          devLog.info(LOG_TAG, `Successfully triggered deploy for ${displayName}`);
        } catch (error) {
          devLog.error(LOG_TAG, `Error deploying ${displayName}`, { error: String(error) });
          showToast(`Error deploying ${displayName}: ${error}`, 'error');
        }
      }

      showToast(
        `${successCount} of ${toDeploy.length} artifact(s) deployment triggered`,
        successCount > 0 ? 'success' : 'error'
      );
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
      class="btn btn-success btn-soft btn-sm w-full justify-start gap-2"
      disabled={running}
      onClick={handleDeploy}
    >
      {running ? (
        <>
          <span class="flowmate-spin"><LoaderCircle size={16} /></span>
          <span>{t('artifactDeploying')}</span>
        </>
      ) : (
        <>
          <CloudUpload size={16} />
          <span>{t('artifactDeploy')}</span>
        </>
      )}
    </button>
  );
}
