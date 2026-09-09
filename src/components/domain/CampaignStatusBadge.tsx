import type { CampaignStatus } from '@/types';
import { Badge } from '@/components/ui/Badge';

const dotFor: Partial<Record<CampaignStatus, boolean>> = {
  Running: true,
  Scheduled: true,
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <Badge status={status} dot={dotFor[status]}>
      {status}
    </Badge>
  );
}