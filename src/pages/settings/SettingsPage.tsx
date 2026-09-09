import { useCallback, useState } from 'react';
import { Save, Building2, MessageSquare, Bell, ShieldCheck, CreditCard } from 'lucide-react';
import type { Settings } from '@/types';
import { useApi } from '@/hooks/useApi';
import { settingsService } from '@/services/settingsService';
import { whatsappService } from '@/services/whatsappService';
import { ApiError } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { formatNumber, formatPercent } from '@/utils/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Tabs, type TabItem } from '@/components/ui/Tabs';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { PageLoader } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/States';
import { toastSuccess, toastError } from '@/store/toastStore';

const TZ_OPTIONS = [
  { value: 'Asia/Jakarta', label: 'Asia/Jakarta (WIB)' },
  { value: 'Asia/Makassar', label: 'Asia/Makassar (WITA)' },
  { value: 'Asia/Jayapura', label: 'Asia/Jayapura (WIT)' },
  { value: 'UTC', label: 'UTC' },
];

const LANG_OPTIONS = [
  { value: 'id', label: 'Bahasa Indonesia' },
  { value: 'en', label: 'English' },
];

const TABS: TabItem[] = [
  { key: 'general', label: 'General', icon: <Building2 className="h-4 w-4" /> },
  { key: 'whatsapp', label: 'WhatsApp', icon: <MessageSquare className="h-4 w-4" /> },
  { key: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
  { key: 'security', label: 'Security', icon: <ShieldCheck className="h-4 w-4" /> },
  { key: 'billing', label: 'Billing / Usage', icon: <CreditCard className="h-4 w-4" /> },
];

export default function SettingsPage() {
  const [active, setActive] = useState('general');
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<Settings | null>(null);

  const fetchSettings = useCallback(async () => {
    const settings = await settingsService.get();
    setData(settings);
    return settings;
  }, []);
  const settings = useApi<Settings>(fetchSettings, []);
  const accounts = useApi(() => whatsappService.getAccounts(), []);

  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'Admin' || user?.role === 'Owner';

  const visibleTabs = TABS;
  const activeTab = active;

  const setGeneral = (patch: Partial<Settings['general']>) => {
    if (!data) return;
    setData({ ...data, general: { ...data.general, ...patch } });
  };
  const setWhatsapp = (patch: Partial<Settings['whatsapp']>) => {
    if (!data) return;
    setData({ ...data, whatsapp: { ...data.whatsapp, ...patch } });
  };
  const setNotification = (key: keyof Settings['notifications'], value: boolean) => {
    if (!data) return;
    setData({ ...data, notifications: { ...data.notifications, [key]: value } });
  };
  const setBilling = (patch: Partial<Settings['billing']>) => {
    if (!data) return;
    setData({ ...data, billing: { ...data.billing, ...patch } });
  };

  const save = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await settingsService.save(data);
      toastSuccess('Settings saved', 'Your preferences have been updated.');
    } catch {
      toastError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string> | null>(null);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const handleChangePassword = async () => {
    setPasswordErrors(null);

    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordErrors({ new_password_confirmation: 'The new password confirmation does not match.' });
      return;
    }

    setUpdatingPassword(true);
    try {
      await settingsService.changePassword({
        current_password: passwordForm.current,
        new_password: passwordForm.next,
        new_password_confirmation: passwordForm.confirm,
      });
      toastSuccess('Password updated', 'Your password has been changed.');
      setPasswordForm({ current: '', next: '', confirm: '' });
    } catch (error) {
      const body = ((error as ApiError)?.data ?? null) as { errors?: Record<string, string[]> } | null;
      if (body?.errors) {
        setPasswordErrors(
          Object.fromEntries(Object.entries(body.errors).map(([key, msgs]) => [key, msgs[0] ?? ''])),
        );
      } else {
        toastError((error as Error)?.message || 'Failed to update password');
      }
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (settings.loading) return <PageLoader label="Loading settings..." />;
  if (settings.error || !data) {
    return <ErrorState message="We couldn't load your settings." onRetry={settings.reload} />;
  }

  const quotaUsedPct =
    data.billing.messageQuota > 0
      ? Math.min(100, Math.round((data.billing.messagesUsed / data.billing.messageQuota) * 100))
      : 0;

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Manage your workspace preferences"
        crumbs={[{ label: 'Settings' }]}
        actions={
          <Button onClick={save} loading={saving}>
            <Save className="h-4 w-4" /> Save Changes
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Tabs tabs={visibleTabs} active={activeTab} onChange={setActive} />
      </div>

      {activeTab === 'general' && (
        <Card title="General settings" subtitle="Company and regional preferences">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Input
              label="Company name"
              value={data.general.companyName}
              onChange={(e) => setGeneral({ companyName: e.target.value })}
            />
            <Select
              label="Timezone"
              value={data.general.timezone}
              onChange={(e) => setGeneral({ timezone: e.target.value })}
              options={TZ_OPTIONS}
            />
            <Select
              label="Language"
              value={data.general.language}
              onChange={(e) => setGeneral({ language: e.target.value })}
              options={LANG_OPTIONS}
            />
          </div>
        </Card>
      )}

      {activeTab === 'whatsapp' && (
        <Card title="WhatsApp settings" subtitle="Defaults and rate controls for sending">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Default sender"
              value={data.whatsapp.defaultSenderId}
              onChange={(e) => setWhatsapp({ defaultSenderId: e.target.value })}
              options={(accounts.data ?? []).map((a) => ({ value: a.id, label: `${a.name} (${a.phone})` }))}
            />
            <Input
              label="Rate limit (messages / minute)"
              type="number"
              value={data.whatsapp.rateLimitPerMin}
              onChange={(e) => setWhatsapp({ rateLimitPerMin: Number(e.target.value) })}
            />
            <Input
              label="Retry limit"
              type="number"
              value={data.whatsapp.retryLimit}
              onChange={(e) => setWhatsapp({ retryLimit: Number(e.target.value) })}
            />
            <Input
              label="Delay between messages (ms)"
              type="number"
              value={data.whatsapp.delayBetweenMs}
              onChange={(e) => setWhatsapp({ delayBetweenMs: Number(e.target.value) })}
            />
          </div>
        </Card>
      )}

      {activeTab === 'notifications' && (
        <Card title="Notifications" subtitle="Choose which events notify you">
          <div className="divide-y divide-surface-100 dark:divide-surface-800">
            <SettingRow
              title="Campaign completed"
              description="Notify when a campaign finishes sending"
              checked={data.notifications.campaignCompleted}
              onChange={(v) => setNotification('campaignCompleted', v)}
            />
            <SettingRow
              title="Campaign failed"
              description="Notify when a campaign encounters a failure"
              checked={data.notifications.campaignFailed}
              onChange={(v) => setNotification('campaignFailed', v)}
            />
            <SettingRow
              title="Connection error"
              description="Notify when a WhatsApp account disconnects"
              checked={data.notifications.connectionError}
              onChange={(v) => setNotification('connectionError', v)}
            />
            <SettingRow
              title="Low quota"
              description="Notify when your message quota is running low"
              checked={data.notifications.lowQuota}
              onChange={(v) => setNotification('lowQuota', v)}
            />
          </div>
        </Card>
      )}

      {activeTab === 'security' && (
        <Card className="max-w-xl" title="Change password" subtitle="Update your account password">
          <div className="grid gap-4">
            <Input
              label="Current password"
              type="password"
              placeholder="••••••••"
              value={passwordForm.current}
              onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
              error={passwordErrors?.current_password}
            />
            <Input
              label="New password"
              type="password"
              placeholder="••••••••"
              value={passwordForm.next}
              onChange={(e) => setPasswordForm({ ...passwordForm, next: e.target.value })}
              error={passwordErrors?.new_password}
              hint="Must be at least 8 characters."
            />
            <Input
              label="Confirm new password"
              type="password"
              placeholder="••••••••"
              value={passwordForm.confirm}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
              error={passwordErrors?.new_password_confirmation}
            />
            <Button variant="secondary" onClick={handleChangePassword} loading={updatingPassword}>
              Update Password
            </Button>
          </div>
        </Card>
      )}

      {activeTab === 'billing' && (
        <div className="max-w-xl">
          <Card title="Message usage" subtitle="Your current plan usage for this billing period">
            {isAdmin && (
              <div className="mb-6">
                <Input
                  label="Maximum messages per month"
                  type="number"
                  min={0}
                  value={data.billing.messageQuota}
                  onChange={(e) => setBilling({ messageQuota: Math.max(0, Number(e.target.value)) })}
                  hint="Used to compute usage percentage and low-quota notifications."
                />
              </div>
            )}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold text-surface-900 dark:text-surface-100">{formatNumber(data.billing.messagesUsed)}</p>
                <p className="text-sm text-surface-400">of {formatNumber(data.billing.messageQuota)} messages</p>
              </div>
              <span className="text-lg font-semibold text-whatsapp-600 dark:text-whatsapp-400">{formatPercent(quotaUsedPct, 0)}</span>
            </div>
            <div className="mt-2">
              <ProgressBar value={data.billing.messagesUsed} max={Math.max(data.billing.messageQuota, 1)} tone={quotaUsedPct > 90 ? 'rose' : quotaUsedPct > 70 ? 'amber' : 'green'} size="lg" />
            </div>
            <p className="mt-3 text-sm text-surface-500 dark:text-surface-400">
              Used {formatNumber(data.billing.messagesUsed)} of {formatNumber(data.billing.messageQuota)} messages this month.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}

function SettingRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div>
        <p className="text-sm font-medium text-surface-800 dark:text-surface-100">{title}</p>
        <p className="mt-0.5 text-xs text-surface-400">{description}</p>
      </div>
      <Switch checked={checked} onChange={onChange} label={title} />
    </div>
  );
}
