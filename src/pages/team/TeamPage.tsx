import { useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UsersRound, Plus, Pencil, Trash2, MoreHorizontal, Ban, CheckCircle2 } from 'lucide-react';
import type { TeamMember, Role } from '@/types';
import { useApi } from '@/hooks/useApi';
import { useAuthStore } from '@/store/authStore';
import { teamService } from '@/services/teamService';
import { formatDateTime } from '@/utils/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { SearchInput } from '@/components/ui/SearchInput';
import { Dropdown } from '@/components/ui/Dropdown';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { ErrorState } from '@/components/ui/States';
import { toastSuccess, toastError } from '@/store/toastStore';

const ROLES: { value: Role; label: string }[] = [
  { value: 'Admin', label: 'Admin' },
  { value: 'Operator', label: 'Operator' },
];

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Email is invalid'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['Admin', 'Operator']),
});

type CreateFormValues = z.infer<typeof createSchema>;

export default function TeamPage() {
  const user = useAuthStore((s) => s.user);
  const canManage = user?.role === 'Admin' || user?.role === 'Owner';

  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editRole, setEditRole] = useState<TeamMember | null>(null);
  const [newRole, setNewRole] = useState<Role>('Operator');
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);
  const [removing, setRemoving] = useState(false);

  const fetchMembers = useCallback(() => teamService.getMembers(), []);
  const members = useApi<TeamMember[]>(fetchMembers, []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', email: '', password: '', role: 'Operator' },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (members.data ?? []).filter(
      (m) => !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.role.toLowerCase().includes(q),
    );
  }, [members.data, search]);

  const openCreate = () => {
    reset({ name: '', email: '', password: '', role: 'Operator' });
    setCreateOpen(true);
  };

  const onCreate = async (values: CreateFormValues) => {
    try {
      await teamService.createMember(values);
      toastSuccess('Member created', `${values.name} can now sign in with the provided password.`);
      setCreateOpen(false);
      members.reload();
    } catch {
      toastError('Failed to create member');
    }
  };

  const saveRole = async () => {
    if (!editRole) return;
    try {
      await teamService.updateMember(editRole.id, { role: newRole });
      toastSuccess('Role updated', `${editRole.name} is now ${newRole}.`);
      setEditRole(null);
      members.reload();
    } catch {
      toastError('Failed to update role');
    }
  };

  const toggleStatus = async (m: TeamMember) => {
    const target = m.status === 'Disabled' ? 'Active' : 'Disabled';
    try {
      await teamService.updateMember(m.id, { status: target });
      toastSuccess(target === 'Active' ? 'Member enabled' : 'Member disabled', `${m.name} is now ${target.toLowerCase()}.`);
      members.reload();
    } catch {
      toastError('Failed to update member status');
    }
  };

  const remove = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await teamService.removeMember(removeTarget.id);
      toastSuccess('Member removed', `${removeTarget.name} was removed from the team.`);
      setRemoveTarget(null);
      members.reload();
    } catch {
      toastError('Failed to remove member');
    } finally {
      setRemoving(false);
    }
  };

  const columns: Column<TeamMember>[] = useMemo(() => {
    const actions = (m: TeamMember) => (
      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
        <Dropdown
          align="right"
          width="w-48"
          trigger={
            <span className="inline-flex rounded-lg p-1.5 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-800">
              <MoreHorizontal className="h-4 w-4" />
            </span>
          }
          items={[
            { key: 'role', label: 'Edit role', icon: <Pencil className="h-4 w-4" />, onClick: () => { setEditRole(m); setNewRole(m.role); } },
            { key: 'toggle', label: m.status === 'Disabled' ? 'Enable' : 'Disable', icon: m.status === 'Disabled' ? <CheckCircle2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />, onClick: () => toggleStatus(m), disabled: m.role === 'Owner' },
            {
              key: 'remove',
              label: 'Remove',
              danger: true,
              icon: <Trash2 className="h-4 w-4" />,
              onClick: () => setRemoveTarget(m),
              disabled: m.role === 'Owner',
            },
          ]}
        />
      </div>
    );

    return [
      {
        key: 'name',
        header: 'User',
        sortValue: (m) => m.name,
        render: (m) => (
          <div className="flex items-center gap-3">
            <Avatar name={m.name} color={m.avatarColor} size="sm" />
            <div>
              <p className="font-medium text-surface-900 dark:text-surface-100">{m.name}</p>
              <p className="text-xs text-surface-400">{m.id}</p>
            </div>
          </div>
        ),
      },
      { key: 'email', header: 'Email', sortValue: (m) => m.email, render: (m) => <span className="text-sm text-surface-600 dark:text-surface-300">{m.email}</span> },
      { key: 'role', header: 'Role', sortValue: (m) => m.role, render: (m) => <Badge status="blue">{m.role}</Badge> },
      { key: 'status', header: 'Status', sortValue: (m) => m.status, render: (m) => <Badge status={m.status} dot>{m.status}</Badge> },
      { key: 'lastLogin', header: 'Last Login', sortValue: (m) => m.lastLogin ?? '', render: (m) => <span className="text-xs text-surface-500">{m.lastLogin ? formatDateTime(m.lastLogin) : '—'}</span> },
      ...(canManage
        ? [{ key: 'actions', header: '', align: 'right' as const, render: actions }]
        : []),
    ];
  }, [canManage]);

  if (members.error) {
    return <ErrorState message="We couldn't load your team." onRetry={members.reload} />;
  }

  return (
    <div>
      <PageHeader
        title="Team"
        subtitle={`${members.data?.length ?? 0} members in your workspace`}
        crumbs={[{ label: 'Team' }]}
        actions={
          canManage ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Create Member
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, email or role..." className="w-full sm:max-w-xs" />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(m) => m.id}
        loading={members.loading}
        mobileCard={{
          title: (m) => columns.find((col) => col.key === 'name')!.render!(m),
          actions: canManage ? (m) => columns.find((col) => col.key === 'actions')!.render!(m) : undefined,
          fields: [
            { label: 'Email', render: (m) => m.email },
            { label: 'Role', render: (m) => <Badge status="blue">{m.role}</Badge> },
            { label: 'Status', render: (m) => <Badge status={m.status} dot>{m.status}</Badge> },
            { label: 'Last Login', render: (m) => (m.lastLogin ? formatDateTime(m.lastLogin) : '—') },
          ],
        }}
        empty={{
          icon: UsersRound,
          title: 'No team members',
          description: 'Create your first teammate to collaborate.',
          actionLabel: canManage ? 'Create Member' : undefined,
          onAction: canManage ? openCreate : undefined,
        }}
      />

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Member"
        description="Create a member account for your workspace"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button form="create-member-form" type="submit" loading={isSubmitting}>Create Member</Button>
          </>
        }
      >
        <form id="create-member-form" onSubmit={handleSubmit(onCreate)} className="grid gap-4" noValidate>
          <Input label="Name" placeholder="e.g. Budi Santoso" error={errors.name?.message} {...register('name')} />
          <Input label="Email" type="email" placeholder="budi@email.com" error={errors.email?.message} {...register('email')} />
          <Input label="Password" type="password" placeholder="Min. 8 characters" error={errors.password?.message} {...register('password')} />
          <Select label="Role" options={ROLES.map((r) => ({ value: r.value, label: r.label }))} {...register('role')} />
          <p className="text-xs text-surface-400">The member can sign in immediately using this password.</p>
        </form>
      </Modal>

      <Modal
        open={!!editRole}
        onClose={() => setEditRole(null)}
        title="Edit Role"
        description={editRole ? `Update the role for ${editRole.name}` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditRole(null)}>Cancel</Button>
            <Button onClick={saveRole}>Save</Button>
          </>
        }
      >
        <Select
          label="Role"
          value={newRole}
          onChange={(e) => setNewRole(e.target.value as Role)}
          options={ROLES.map((r) => ({ value: r.value, label: r.label }))}
        />
      </Modal>

      <ConfirmDialog
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={remove}
        loading={removing}
        title="Remove Member?"
        message={<>Remove <b>{removeTarget?.name}</b> from your team? They will lose access immediately.</>}
        confirmLabel="Remove Member"
      />
    </div>
  );
}
