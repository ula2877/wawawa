import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatNumber } from '@/utils/format';

export function CampaignProgress({
  sent,
  recipients,
  showNumbers = true,
  size = 'md',
}: {
  sent: number;
  recipients: number;
  showNumbers?: boolean;
  size?: 'sm' | 'md';
}) {
  const pct = recipients ? Math.round((sent / recipients) * 100) : 0;
  return (
    <div className="w-full min-w-28 max-w-40">
      <ProgressBar value={pct} tone="green" size={size} />
      {showNumbers && (
        <p className="mt-1 text-xs text-surface-400">
          {formatNumber(sent)} / {formatNumber(recipients)} · {pct}%
        </p>
      )}
    </div>
  );
}