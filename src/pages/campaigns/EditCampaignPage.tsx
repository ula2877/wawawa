import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Campaign } from '@/types';
import { useApi } from '@/hooks/useApi';
import { campaignService } from '@/services/campaignService';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageLoader } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/States';
import { CampaignWizard } from '@/components/domain/CampaignWizard';

export default function EditCampaignPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fetchCampaign = useCallback(() => campaignService.getCampaign(id ?? ''), [id]);
  const campaign = useApi<Campaign | undefined>(fetchCampaign, [id]);

  if (campaign.loading) {
    return (
      <>
        <PageHeader title="Edit Campaign" crumbs={[{ label: 'Campaigns', to: '/campaigns' }, { label: 'Edit' }]} />
        <PageLoader label="Loading campaign..." />
      </>
    );
  }

  if (campaign.error || !campaign.data) {
    return (
      <ErrorState
        message="We couldn't find that campaign."
        onRetry={() => {
          if (!campaign.data) navigate('/campaigns');
          campaign.reload();
        }}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={`Edit "${campaign.data.name}"`}
        subtitle="Update the details of this campaign"
        crumbs={[{ label: 'Campaigns', to: '/campaigns' }, { label: campaign.data.name, to: `/campaigns/${campaign.data.id}` }, { label: 'Edit' }]}
      />
      {campaign.data.status !== 'Draft' && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          <span>
            This campaign is <b>{campaign.data.status}</b>. Only <b>Draft</b> campaigns can be edited
            — pause, resume or send it from the campaign detail page instead.
          </span>
          <button
            onClick={() => navigate(`/campaigns/${(campaign.data as Campaign).id}`)}
            className="ml-auto shrink-0 rounded-lg bg-amber-100 px-3 py-1.5 font-medium hover:bg-amber-200 dark:bg-amber-500/20 dark:hover:bg-amber-500/30"
          >
            View campaign
          </button>
        </div>
      )}
      <CampaignWizard initial={campaign.data} />
    </div>
  );
}