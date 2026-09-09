import { PageHeader } from '@/components/ui/PageHeader';
import { CampaignWizard } from '@/components/domain/CampaignWizard';

export default function CreateCampaignPage() {
  return (
    <div>
      <PageHeader
        title="Create Campaign"
        subtitle="Follow the wizard to build your next WhatsApp campaign"
        crumbs={[{ label: 'Campaigns', to: '/campaigns' }, { label: 'Create' }]}
      />
      <CampaignWizard />
    </div>
  );
}