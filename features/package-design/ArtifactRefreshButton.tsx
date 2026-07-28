import { useState, useEffect } from 'preact/hooks';
import { LoaderCircle, RefreshCw } from 'lucide-preact';
import { t } from '@/features/shared/i18n';
import type { ArtifactStatus } from './ArtifactStatus';
import './ArtifactButtons.css';

interface ArtifactRefreshButtonProps {
  artifactStatus: ArtifactStatus;
}

export function ArtifactRefreshButton({ artifactStatus }: ArtifactRefreshButtonProps) {
  const [loading, setLoading] = useState(artifactStatus.isLoading);

  useEffect(() => {
    const unsub = artifactStatus.onLoadingChange(setLoading);
    return unsub;
  }, [artifactStatus]);

  return (
    <button
      class="artifact-btn artifact-btn--refresh"
      disabled={loading}
      onClick={() => artifactStatus.refresh()}
    >
      {loading ? (
        <>
          <span class="flowmate-spin"><LoaderCircle size={16} /></span>
          <span>{t('artifactRefreshLoading')}</span>
        </>
      ) : (
        <>
          <RefreshCw size={16} />
          <span>{t('artifactRefreshStatus')}</span>
        </>
      )}
    </button>
  );
}
