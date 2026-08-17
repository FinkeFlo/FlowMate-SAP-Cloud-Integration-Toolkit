import type { ArtifactStatus } from './ArtifactStatus';
import { ArtifactRefreshButton } from './ArtifactRefreshButton';
import { ArtifactDeployButton } from './ArtifactDeployButton';
import { ArtifactUndeployButton } from './ArtifactUndeployButton';
import { t } from '@/features/shared/i18n';

interface PackageArtifactsPanelProps {
  artifactStatus: ArtifactStatus;
}

function SectionLabel({ label }: { label: string }) {
  return (
    <span class="px-1 text-[10px] font-semibold uppercase tracking-wide opacity-40 select-none">
      {label}
    </span>
  );
}

export function PackageArtifactsPanel({ artifactStatus }: PackageArtifactsPanelProps) {
  return (
    <>
      <SectionLabel label={t('packagePanelStatus')} />
      <ArtifactRefreshButton artifactStatus={artifactStatus} />

      <div class="my-0.5 border-t border-base-300" />

      <SectionLabel label={t('packagePanelDeployment')} />
      <div class="flex gap-1">
        <div class="min-w-0 flex-1">
          <ArtifactDeployButton artifactStatus={artifactStatus} />
        </div>
        <div class="min-w-0 flex-1">
          <ArtifactUndeployButton artifactStatus={artifactStatus} />
        </div>
      </div>
    </>
  );
}
