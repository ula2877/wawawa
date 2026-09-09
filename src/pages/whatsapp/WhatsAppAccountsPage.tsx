import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Plus, MessageSquare, MoreHorizontal, Star, Trash2, Pencil,
  Plug, Unplug, LogOut, QrCode, Loader2,
} from 'lucide-react';
import type { AccountStatus, WhatsAppAccount } from '@/types';
import { useApi } from '@/hooks/useApi';
import { whatsappService } from '@/services/whatsappService';
import { waSocket, type WaQrEvent } from '@/services/waSocket';
import { formatDateTime } from '@/utils/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { ErrorState, EmptyState } from '@/components/ui/States';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Dropdown } from '@/components/ui/Dropdown';
import { Skeleton } from '@/components/ui/Skeleton';
import { toastSuccess, toastError } from '@/store/toastStore';

const STATUS_LABEL: Record<AccountStatus, string> = {
  connected: 'Connected',
  connecting: 'Connecting...',
  disconnected: 'Disconnected',
  logged_out: 'Logged out',
};

export default function WhatsAppAccountsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<WhatsAppAccount | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [logoutTarget, setLogoutTarget] = useState<WhatsAppAccount | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const [detailTarget, setDetailTarget] = useState<WhatsAppAccount | null>(null);

  const [qrOpen, setQrOpen] = useState(false);
  const [qrTarget, setQrTarget] = useState<{ id: string; name: string } | null>(null);
  const [qrPayload, setQrPayload] = useState<WaQrEvent | null>(null);
  const qrTargetId = useRef<string | null>(null);

  const fetchAccounts = useCallback(() => whatsappService.getAccounts(), []);
  const accounts = useApi<WhatsAppAccount[]>(fetchAccounts, []);

  const openAdd = () => {
    setEditingId(null);
    setFormName('');
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (a: WhatsAppAccount) => {
    setEditingId(a.id);
    setFormName(a.name);
    setFormErrors({});
    setFormOpen(true);
  };

  useEffect(() => {
    const unQr = waSocket.onQr((payload) => {
      if (payload.accountId === qrTargetId.current) {
        setQrPayload(payload);
      }
    });
    const unConnected = waSocket.onConnected(({ accountId }) => {
      if (accountId === qrTargetId.current) {
        setQrOpen(false);
        setQrTarget(null);
        setQrPayload(null);
        qrTargetId.current = null;
        toastSuccess('WhatsApp connected', 'The account is ready to send messages.');
      }
      accounts.reload();
    });
    const unDisconnected = waSocket.onDisconnected(() => {
      accounts.reload();
    });
    const unStatus = waSocket.onStatus(() => {
      accounts.reload();
    });
    return () => {
      unQr();
      unConnected();
      unDisconnected();
      unStatus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = async (a: WhatsAppAccount) => {
    setBusyId(a.id);
    try {
      await whatsappService.connect(a.id);
      await accounts.reload();
      qrTargetId.current = a.id;
      setQrTarget({ id: a.id, name: a.name });
      setQrPayload(null);
      setQrOpen(true);
      toastSuccess('Connecting', `Scan the QR code with WhatsApp to link "${a.name}".`);
    } catch (e) {
      toastError('Failed to connect', e instanceof Error ? e.message : undefined);
    } finally {
      setBusyId(null);
    }
  };

  const handleDisconnect = async (a: WhatsAppAccount) => {
    setBusyId(a.id);
    try {
      await whatsappService.disconnect(a.id);
      await accounts.reload();
      toastSuccess('Disconnected', `"${a.name}" is now disconnected.`);
    } catch (e) {
      toastError('Failed to disconnect', e instanceof Error ? e.message : undefined);
    } finally {
      setBusyId(null);
    }
  };

  const handleLogout = async () => {
    if (!logoutTarget || loggingOut) return;
    setLoggingOut(true);
    try {
      await whatsappService.logout(logoutTarget.id);
      await accounts.reload();
      toastSuccess('Logged out', `"${logoutTarget.name}" was logged out and its session removed.`);
      setLogoutTarget(null);
    } catch (e) {
      toastError('Failed to log out', e instanceof Error ? e.message : undefined);
    } finally {
      setLoggingOut(false);
    }
  };

  const cancelQr = async () => {
    const id = qrTarget?.id;
    setQrOpen(false);
    setQrTarget(null);
    setQrPayload(null);
    qrTargetId.current = null;
    if (id) {
      try {
        await whatsappService.disconnect(id);
      } catch {
        // best-effort cleanup, socket status events will reconcile anyway
      }
      await accounts.reload();
    }
  };

  const setDefault = async (a: WhatsAppAccount) => {
    try {
      await whatsappService.setDefault(a.id);
      toastSuccess('Default sender updated', `"${a.name}" is now the default sender.`);
      accounts.reload();
    } catch (e) {
      toastError('Failed to update default', e instanceof Error ? e.message : undefined);
    }
  };

  const onDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await whatsappService.deleteAccount(deleteTarget.id);
      toastSuccess('Account deleted', `"${deleteTarget.name}" was removed.`);
      setDeleteTarget(null);
      accounts.reload();
    } catch (e) {
      toastError('Failed to delete account', e instanceof Error ? e.message : undefined);
    } finally {
      setDeleting(false);
    }
  };

  const onSubmit = async () => {
    const name = formName.trim();

    const err: Record<string, string> = {};
    if (!name) err.name = 'Account name is required.';
    else if (name.length > 80) err.name = 'Account name must be 80 characters or fewer.';
    const dupe = (accounts.data ?? []).some((a) => a.id !== editingId && a.name.toLowerCase() === name.toLowerCase());
    if (dupe) err.name = 'An account with this name already exists.';
    if (Object.keys(err).length > 0) {
      setFormErrors(err);
      return;
    }

    setSaving(true);
    try {
      if (!editingId) {
        await whatsappService.createAccount({ name });
        toastSuccess('Account added', `"${name}" was added. You can connect it now.`);
      } else {
        await whatsappService.updateAccount(editingId, { name });
        toastSuccess('Account updated', `"${name}" was updated.`);
      }
      setFormOpen(false);
      accounts.reload();
    } catch (e) {
      toastError('Failed to save account', e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  if (accounts.error) {
    return <ErrorState message="We couldn't load your WhatsApp accounts." onRetry={accounts.reload} />;
  }

  return (
    <div>
      <PageHeader
        title="WhatsApp Accounts"
        subtitle="Manage the sending numbers connected to your workspace"
        crumbs={[{ label: 'WhatsApp Accounts' }]}
        actions={
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add Account
          </Button>
        }
      />

      {accounts.loading ? (
        <AccountCardSkeleton count={3} />
      ) : (accounts.data ?? []).length === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon={MessageSquare}
            title="No WhatsApp accounts yet"
            description="Add a WhatsApp account and link it by scanning a QR code."
            actionLabel="Add Account"
            onAction={openAdd}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(accounts.data ?? []).map((a) => {
            const isDefault = a.is_default;
            const isConnected = a.status === 'connected';
            const isConnecting = a.status === 'connecting';
            const canConnect = a.status === 'disconnected' || a.status === 'logged_out';
            return (
              <Card key={a.id} className="flex flex-col" bodyClassName="flex flex-1 flex-col">
                <div className="flex items-start gap-3">
                  <div className={cnAvatar(isConnected)}>
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-surface-900 dark:text-surface-100">{a.name}</p>
                      {isDefault && (
                        <Badge status="connected" className="shrink-0">
                          <Star className="h-3 w-3" /> Default
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-surface-400">{a.phone ?? 'Not connected yet'}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge status={a.status} dot>{STATUS_LABEL[a.status]}</Badge>
                    <Dropdown
                      align="right"
                      width="w-48"
                      trigger={
                        <span className="inline-flex rounded-lg p-1.5 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-800">
                          <MoreHorizontal className="h-4 w-4" />
                        </span>
                      }
                      items={[
                        { key: 'view', label: 'View details', icon: <Pencil className="h-4 w-4" />, onClick: () => setDetailTarget(a) },
                        { key: 'edit', label: 'Edit account', icon: <Pencil className="h-4 w-4" />, onClick: () => openEdit(a) },
                        ...(isDefault ? [] : [{ key: 'default', label: 'Set default', icon: <Star className="h-4 w-4" />, onClick: () => setDefault(a) }]),
                        ...(isConnected ? [{ key: 'logout', label: 'Log out', danger: true, icon: <LogOut className="h-4 w-4" />, onClick: () => setLogoutTarget(a) }] : []),
                        { key: 'divider', label: '', divider: true },
                        { key: 'delete', label: 'Delete account', danger: true, icon: <Trash2 className="h-4 w-4" />, onClick: () => setDeleteTarget(a) },
                      ]}
                    />
                  </div>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-surface-400">Last connected</dt>
                    <dd className="font-semibold text-surface-800 dark:text-surface-100">
                      {a.last_connected_at ? formatDateTime(a.last_connected_at) : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-surface-400">Last disconnected</dt>
                    <dd className="font-semibold text-surface-800 dark:text-surface-100">
                      {a.last_disconnected_at ? formatDateTime(a.last_disconnected_at) : '—'}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-surface-100 pt-4 dark:border-surface-800">
                  {canConnect && (
                    <Button variant="primary" size="sm" onClick={() => handleConnect(a)} loading={busyId === a.id}>
                      <QrCode className="h-3.5 w-3.5" /> Connect
                    </Button>
                  )}
                  {isConnecting && (
                    <Button variant="outline" size="sm" onClick={() => handleDisconnect(a)} loading={busyId === a.id}>
                      <Loader2 className="h-3.5 w-3.5" /> Waiting for scan…
                    </Button>
                  )}
                  {isConnected && (
                    <>
                      <Button variant="secondary" size="sm" onClick={() => handleDisconnect(a)} loading={busyId === a.id}>
                        <Unplug className="h-3.5 w-3.5" /> Disconnect
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setLogoutTarget(a)} loading={busyId === a.id}>
                        <LogOut className="h-3.5 w-3.5" /> Log out
                      </Button>
                    </>
                  )}
                  {!canConnect && !isConnected && (
                    <Button variant="secondary" size="sm" disabled>
                      <Plug className="h-3.5 w-3.5" /> {isConnecting ? 'Connecting' : 'Disconnected'}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId ? 'Edit WhatsApp Account' : 'Add WhatsApp Account'}
        description={editingId ? 'Update the name of this account.' : 'Add a WhatsApp account, then link it by scanning a QR code.'}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button form="account-form" type="submit" loading={saving}>
              Save Account
            </Button>
          </>
        }
      >
        <form id="account-form" onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4" noValidate>
          <Input
            label="Account Name"
            name="name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            error={formErrors.name}
            placeholder="e.g. Marketing 01"
            autoFocus
          />
          <p className="text-xs text-surface-500 dark:text-surface-400">
            After creating the account, use <b>Connect</b> on the card to link your WhatsApp number by scanning its QR code.
          </p>
        </form>
      </Modal>

      <Modal
        open={qrOpen}
        onClose={() => cancelQr()}
        title="Link WhatsApp account"
        description={qrTarget ? `Scan with "${qrTarget.name}"'s WhatsApp to connect.` : undefined}
        size="md"
        busy
        footer={
          <>
            <Button variant="outline" onClick={() => cancelQr()}>Close</Button>
          </>
        }
      >
        <div className="flex flex-col items-center justify-center gap-4 py-2">
          {qrPayload?.image ? (
            <img
              src={qrPayload.image}
              alt="WhatsApp QR code"
              className="mx-auto h-64 w-64 rounded-xl bg-white p-2 shadow-card"
            />
          ) : (
            <div className="flex h-64 w-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-surface-300 text-surface-400 dark:border-surface-700">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm">Waiting for QR code…</p>
            </div>
          )}
          {qrPayload?.qr && !qrPayload.image && (
            <code className="w-full break-all rounded-lg bg-surface-50 px-3 py-2 text-xs text-surface-500 dark:bg-surface-800/60">
              {qrPayload.qr}
            </code>
          )}
          <ol className="w-full max-w-sm list-decimal space-y-1 text-left text-sm text-surface-600 dark:text-surface-300">
            <li>Open WhatsApp on your phone.</li>
            <li>Go to <b>Settings → Linked devices</b>.</li>
            <li>Tap <b>Link a device</b> and scan this code.</li>
          </ol>
        </div>
      </Modal>

      <Modal open={!!detailTarget} onClose={() => setDetailTarget(null)} title="Account details" description={detailTarget?.name} size="md">
        {detailTarget && (
          <div className="rounded-xl bg-surface-50 px-4 py-2 dark:bg-surface-800/40">
            <dl className="divide-y divide-surface-100 dark:divide-surface-800">
              <DetailRow label="Account Name">{detailTarget.name}</DetailRow>
              <DetailRow label="WhatsApp Number">{detailTarget.phone ?? 'Not connected'}</DetailRow>
              <DetailRow label="Status">
                <Badge status={detailTarget.status} dot>{STATUS_LABEL[detailTarget.status]}</Badge>
              </DetailRow>
              <DetailRow label="Default">{detailTarget.is_default ? 'Yes' : 'No'}</DetailRow>
              <DetailRow label="Last Connected">{detailTarget.last_connected_at ? formatDateTime(detailTarget.last_connected_at) : '—'}</DetailRow>
              <DetailRow label="Last Disconnected">{detailTarget.last_disconnected_at ? formatDateTime(detailTarget.last_disconnected_at) : '—'}</DetailRow>
              <DetailRow label="Created">{detailTarget.created_at ? formatDateTime(detailTarget.created_at) : '—'}</DetailRow>
              <DetailRow label="Updated">{detailTarget.updated_at ? formatDateTime(detailTarget.updated_at) : '—'}</DetailRow>
            </dl>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={onDelete}
        title="Delete WhatsApp Account?"
        message={<>Are you sure you want to delete <b>{deleteTarget?.name}</b>? Its connection (if any) will be terminated and its session removed. This action cannot be undone.</>}
        confirmLabel="Delete Account"
        loading={deleting}
        loadingLabel="Deleting..."
      />

      <ConfirmDialog
        open={!!logoutTarget}
        onClose={() => setLogoutTarget(null)}
        onConfirm={handleLogout}
        title="Log out WhatsApp account?"
        message={<>"<b>{logoutTarget?.name}</b>" will be logged out of WhatsApp and its saved session removed. You'll need to scan a QR code again to reconnect.</>}
        confirmLabel="Log out"
        loading={loggingOut}
        loadingLabel="Logging out..."
      />
    </div>
  );
}

function cnAvatar(connected: boolean): string {
  return connected
    ? 'flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    : 'flex h-11 w-11 items-center justify-center rounded-xl bg-whatsapp-500/10 text-whatsapp-600 dark:text-whatsapp-400';
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-surface-400">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-right text-sm text-surface-800 dark:text-surface-100">{children}</dd>
    </div>
  );
}

function AccountCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-surface-200 bg-white shadow-card dark:border-surface-800 dark:bg-surface-900">
          <div className="p-5 flex flex-1 flex-col">
            <div className="flex items-start gap-3">
              <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
              <div className="min-w-0 flex-1">
                <Skeleton className="mb-1.5 h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full shrink-0" />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <Skeleton className="mb-1 h-3 w-14" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div>
                <Skeleton className="mb-1 h-3 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 border-t border-surface-100 pt-4 dark:border-surface-800">
              <Skeleton className="h-8 w-28 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}