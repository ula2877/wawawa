import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Pencil, Trash2, Eye, UserPlus, UserMinus } from 'lucide-react';
import type { Contact, ContactGroup } from '@/types';
import { useApi } from '@/hooks/useApi';
import { useDebounce } from '@/hooks/useDebounce';
import { contactService } from '@/services/contactService';
import { formatNumber, formatPhone } from '@/utils/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { toastSuccess, toastError } from '@/store/toastStore';
import { Skeleton } from '@/components/ui/Skeleton';
import { SearchInput } from '@/components/ui/SearchInput';
import { Spinner } from '@/components/ui/Spinner';
import { Avatar } from '@/components/ui/Avatar';
import { cx } from '@/utils/format';

const COLORS = ['bg-emerald-500', 'bg-sky-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-teal-500', 'bg-indigo-500', 'bg-fuchsia-500'];

export default function ContactGroupsPage() {
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ContactGroup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContactGroup | null>(null);
  const [groupForm, setGroupForm] = useState({ name: '', description: '', color: 'bg-emerald-500' });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [memberTarget, setMemberTarget] = useState<ContactGroup | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const debouncedMemberSearch = useDebounce(memberSearch, 350);
  const [addSearch, setAddSearch] = useState('');
  const debouncedAddSearch = useDebounce(addSearch, 350);
  const [memberBusy, setMemberBusy] = useState(false);

  const fetchGroups = useCallback(() => contactService.getGroups({ search: debouncedSearch }), [debouncedSearch]);
  const groups = useApi<ContactGroup[]>(fetchGroups, [debouncedSearch]);
  const hasFilters = Boolean(search);

  const fetchMembers = useCallback(
    () => (memberTarget ? contactService.getContactsPage({ group_id: memberTarget.id, per_page: 100, sort_by: 'name', sort_direction: 'asc' }) : Promise.resolve({ data: [], meta: { current_page: 1, last_page: 1, per_page: 100, total: 0, from: null, to: null } })),
    [memberTarget?.id],
  );
  const members = useApi<{ data: Contact[]; meta: { total: number } }>(fetchMembers, [memberTarget?.id]);

  const fetchAll = useCallback(() => contactService.getContacts(), []);
  const allContacts = useApi<Contact[]>(fetchAll, []);

  const memberIds = useMemo(() => new Set((members.data?.data ?? []).map((c) => c.id)), [members.data]);

  const availableToAdd = useMemo(() => {
    if (debouncedAddSearch) {
      const q = debouncedAddSearch.toLowerCase();
      return (allContacts.data ?? []).filter((c) => !memberIds.has(c.id) && (c.name.toLowerCase().includes(q) || c.phone.includes(q)));
    }
    return (allContacts.data ?? []).filter((c) => !memberIds.has(c.id));
  }, [allContacts.data, memberIds, debouncedAddSearch]);

  const visibleMembers = useMemo(() => {
    if (!debouncedMemberSearch) return members.data?.data ?? [];
    const q = debouncedMemberSearch.toLowerCase();
    return (members.data?.data ?? []).filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [members.data, debouncedMemberSearch]);

  const openMembers = (g: ContactGroup) => {
    setMemberTarget(g);
    setMemberSearch('');
    setAddSearch('');
  };

  const addMember = async (c: Contact) => {
    const target = memberTarget;
    if (!target) return;
    setMemberBusy(true);
    try {
      await contactService.assignGroups([c.id], [target.id], true);
      toastSuccess('Contact added', `${c.name} was added to "${target.name}".`);
      members.reload();
      groups.reload();
    } catch (e) {
      toastError('Failed to add contact', e instanceof Error ? e.message : undefined);
    } finally {
      setMemberBusy(false);
    }
  };

  const removeMember = async (c: Contact) => {
    const target = memberTarget;
    if (!target) return;
    setMemberBusy(true);
    try {
      await contactService.assignGroups([c.id], [target.id], false);
      toastSuccess('Contact removed', `${c.name} was removed from "${target.name}".`);
      members.reload();
      groups.reload();
    } catch (e) {
      toastError('Failed to remove contact', e instanceof Error ? e.message : undefined);
    } finally {
      setMemberBusy(false);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setGroupForm({ name: '', description: '', color: 'bg-emerald-500' });
    setFormOpen(true);
  };

  const openEdit = (g: ContactGroup) => {
    setEditing(g);
    setGroupForm({ name: g.name, description: g.description, color: g.color });
    setFormOpen(true);
  };

  const onSubmit = async () => {
    if (!groupForm.name.trim()) {
      toastError('Name required', 'Please enter a group name.');
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        await contactService.updateGroup(editing.id, { name: groupForm.name.trim(), description: groupForm.description.trim(), color: groupForm.color });
        toastSuccess('Group updated', `"${groupForm.name}" was updated.`);
      } else {
        await contactService.createGroup(groupForm.name.trim(), groupForm.description.trim(), groupForm.color);
        toastSuccess('Group created', `"${groupForm.name}" is ready.`);
      }
      setFormOpen(false);
      groups.reload();
    } catch (e) {
      toastError('Failed', e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await contactService.deleteGroup(deleteTarget.id);
      toastSuccess('Group deleted', `"${deleteTarget.name}" was removed.`);
      setDeleteTarget(null);
      groups.reload();
    } catch (e) {
      toastError('Failed to delete group', e instanceof Error ? e.message : undefined);
    } finally {
      setDeleting(false);
    }
  };

  if (groups.error) return <ErrorState message="Failed to load groups." onRetry={groups.reload} />;

  return (
    <div>
      <PageHeader
        title="Contact Groups"
        subtitle={`${formatNumber(groups.data?.length ?? 0)} groups`}
        crumbs={[{ label: 'Contact Groups' }]}
        actions={<Button onClick={openAdd}><Plus className="h-4 w-4" /> Create Group</Button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="min-w-[16rem] flex-1 basis-64 max-w-md">
          <SearchInput value={search} onChange={setSearch} placeholder="Search groups..." />
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => setSearch('')}>
            Clear
          </Button>
        )}
      </div>

      {groups.loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-surface-200 bg-white p-5 dark:border-surface-800 dark:bg-surface-900">
              <Skeleton className="mb-3 h-5 w-32" />
              <Skeleton className="mb-2 h-3 w-48" />
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
      ) : (groups.data ?? []).length === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon={Users}
            title="No groups yet"
            description="Create your first contact group to organize contacts into segments."
            actionLabel="Create Group"
            onAction={openAdd}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(groups.data ?? []).map((g) => (
            <Card key={g.id} className="relative overflow-hidden">
              <div className={`absolute left-0 top-0 h-full w-1 ${g.color}`} />
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1 pl-3">
                  <h3 className="truncate text-base font-semibold text-surface-900 dark:text-surface-100">{g.name}</h3>
                  <p className="mt-0.5 truncate text-sm text-surface-500 dark:text-surface-400">{g.description || 'No description'}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openMembers(g)} className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-800" aria-label="Manage members"><Users className="h-4 w-4" /></button>
                  <button onClick={() => openEdit(g)} className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-800" aria-label="Edit group"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => setDeleteTarget(g)} className="rounded-lg p-1.5 text-surface-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10" aria-label="Delete group"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between pl-3">
                <Badge className="text-xs">{formatNumber(g.contactsCount ?? 0)} contacts</Badge>
                <button
                  onClick={() => navigate(`/contacts?group=${g.id}`)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-whatsapp-600 hover:underline dark:text-whatsapp-400"
                >
                  <Eye className="h-3.5 w-3.5" /> View Contacts
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit Group' : 'Create Group'}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={onSubmit} loading={submitting}>{editing ? 'Save Changes' : 'Create Group'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Group name" placeholder="e.g. VIP Customers" value={groupForm.name} onChange={(e) => setGroupForm((f) => ({ ...f, name: e.target.value }))} />
          <Textarea label="Description" rows={2} placeholder="What is this group for?" value={groupForm.description} onChange={(e) => setGroupForm((f) => ({ ...f, description: e.target.value }))} />
          <div>
            <label className="mb-2 block text-sm font-medium text-surface-700 dark:text-surface-300">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setGroupForm((f) => ({ ...f, color: c }))}
                  className={cx('h-8 w-8 rounded-full transition-transform', c, groupForm.color === c ? 'ring-2 ring-offset-2 ring-surface-900 dark:ring-white scale-110' : 'hover:scale-105')}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={onDelete}
        title="Delete Group?"
        message={<>Delete <b>"{deleteTarget?.name}"</b>? Contacts in this group will not be deleted.</>}
        confirmLabel="Delete Group"
        loading={deleting}
        loadingLabel="Deleting..."
      />

      <Modal
        open={!!memberTarget}
        onClose={() => setMemberTarget(null)}
        title="Manage Members"
        description={memberTarget ? `${memberTarget.name} — ${formatNumber(members.data?.meta.total ?? 0)} contacts` : undefined}
        size="lg"
        busy={memberBusy}
        footer={
          <>
            <Button variant="outline" onClick={() => setMemberTarget(null)}>Done</Button>
          </>
        }
      >
        <div className="space-y-6">
          <section>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Contacts in group</h3>
            </div>
            <SearchInput value={memberSearch} onChange={setMemberSearch} placeholder="Search members..." className="mb-3" />
            {members.loading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : visibleMembers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-surface-200 py-8 text-center text-sm text-surface-400 dark:border-surface-700">
                {memberSearch ? 'No matching members.' : 'No contacts in this group yet.'}
              </div>
            ) : (
              <ul className="divide-y divide-surface-100 overflow-hidden rounded-xl border border-surface-200 dark:divide-surface-800 dark:border-surface-700">
                {visibleMembers.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={c.name} color={memberTarget?.color} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-surface-900 dark:text-surface-100">{c.name}</p>
                        <p className="truncate text-xs text-surface-500 dark:text-surface-400">{formatPhone(c.phone)}{c.idpel ? ` · IDPEL ${c.idpel}` : ''}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeMember(c)} disabled={memberBusy}>
                      <UserMinus className="h-4 w-4" /> Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-surface-900 dark:text-surface-100">Add contacts</h3>
            <div className="space-y-3">
              <SearchInput value={addSearch} onChange={setAddSearch} placeholder="Search contacts not in this group..." />
              {allContacts.error ? (
                <p className="text-sm text-rose-600">{allContacts.error}</p>
              ) : allContacts.loading ? (
                <div className="flex justify-center py-6"><Spinner /></div>
              ) : availableToAdd.length === 0 ? (
                <div className="rounded-xl border border-dashed border-surface-200 py-6 text-center text-sm text-surface-400 dark:border-surface-700">
                  {addSearch ? 'No matching contacts available.' : 'All contacts are already in this group.'}
                </div>
              ) : (
                <ul className="max-h-56 divide-y divide-surface-100 overflow-y-auto rounded-xl border border-surface-200 scrollbar-thin dark:divide-surface-800 dark:border-surface-700">
                  {availableToAdd.slice(0, 50).map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={c.name} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-surface-900 dark:text-surface-100">{c.name}</p>
                          <p className="truncate text-xs text-surface-500 dark:text-surface-400">{formatPhone(c.phone)}{c.idpel ? ` · IDPEL ${c.idpel}` : ''}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => addMember(c)} disabled={memberBusy}>
                        <UserPlus className="h-4 w-4" /> Add
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </Modal>
    </div>
  );
}