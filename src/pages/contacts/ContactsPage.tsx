import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, Users, Pencil, Trash2, Upload, Download, Tag, MoreHorizontal,
} from 'lucide-react';
import type { Contact, ContactGroup } from '@/types';
import { useApi } from '@/hooks/useApi';
import { useDebounce } from '@/hooks/useDebounce';
import { contactService, type ContactQuery } from '@/services/contactService';
import { formatDate, formatDateTime, formatNumber, formatPhone } from '@/utils/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { SearchInput } from '@/components/ui/SearchInput';
import { Dropdown } from '@/components/ui/Dropdown';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { ErrorState } from '@/components/ui/States';
import { Avatar } from '@/components/ui/Avatar';
import { toastSuccess, toastError } from '@/store/toastStore';

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  idpel: z.string().optional(),
  phone: z.string().min(7, 'Phone number is invalid').regex(/^\+?\d[\d\s-]*$/, 'Phone number is invalid'),
  email: z.union([z.literal(''), z.string().email('Email must be valid')]).optional(),
  customerType: z.string().optional(),
  tariff: z.string().optional(),
  power: z.string().optional(),
  region: z.string().optional(),
  ulp: z.string().optional(),
  tags: z.array(z.string()),
});

type ContactFormValues = z.infer<typeof contactSchema>;

const CUSTOMER_TYPE_OPTIONS = ['Residential', 'Business', 'Industrial', 'Government', 'Social'];

const SORT_FIELDS: Record<string, string> = {
  name: 'name',
  idpel: 'idpel',
  phone: 'phone',
  region: 'region',
  lastContact: 'last_contact_at',
};

function customerSecondary(c: Contact): string {
  return [c.customerType, c.tariff, c.power].filter(Boolean).join(' · ') || '';
}

function GroupChips({ groupIds, names, max = 3 }: { groupIds: string[]; names: Record<string, string>; max?: number }) {
  if (groupIds.length === 0) return <span className="text-xs text-surface-400">No groups</span>;
  return (
    <div className="flex max-w-56 flex-wrap gap-1">
      {groupIds.slice(0, max).map((gid) => (
        <Badge key={gid} className="text-[10px]">{names[gid] ?? gid}</Badge>
      ))}
      {groupIds.length > max && <Badge className="text-[10px]">+{groupIds.length - max}</Badge>}
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-surface-400">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-right text-sm text-surface-800 dark:text-surface-100">{children}</dd>
    </div>
  );
}

function uniqueValues(list: Contact[], key: (c: Contact) => string | null | undefined): string[] {
  const set = new Set<string>();
  list.forEach((c) => {
    const v = key(c);
    if (v) set.add(v);
  });
  return [...set].sort();
}

export default function ContactsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [customerTypeFilter, setCustomerTypeFilter] = useState('');
  const [tariffFilter, setTariffFilter] = useState('');
  const [powerFilter, setPowerFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [ulpFilter, setUlpFilter] = useState('');
  const [tagFilter, setTagFilter] = useState(searchParams.get('group') ?? '');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignAdd, setAssignAdd] = useState(true);
  const [assignGroup, setAssignGroup] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [bulkDelete, setBulkDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [detailTarget, setDetailTarget] = useState<Contact | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const query = useMemo<ContactQuery>(() => {
    const q: ContactQuery = {
      page,
      per_page: pageSize,
      sort_by: SORT_FIELDS[sortBy] ?? 'name',
      sort_direction: sortDir,
    };
    if (debouncedSearch) q.search = debouncedSearch;
    if (customerTypeFilter) q.customer_type = customerTypeFilter;
    if (tariffFilter) q.tariff = tariffFilter;
    if (powerFilter) q.power = powerFilter;
    if (regionFilter) q.region = regionFilter;
    if (ulpFilter) q.ulp = ulpFilter;
    if (tagFilter) q.group_id = tagFilter;
    return q;
  }, [page, pageSize, sortBy, sortDir, debouncedSearch, customerTypeFilter, tariffFilter, powerFilter, regionFilter, ulpFilter, tagFilter]);

  const queryKey = JSON.stringify(query);

  const fetchContacts = useCallback(() => contactService.getContactsPage(query), [queryKey]);
  const contacts = useApi<{ data: Contact[]; meta: { current_page: number; last_page: number; per_page: number; total: number; from: number | null; to: number | null } }>(fetchContacts, [queryKey]);

  const fetchAllContacts = useCallback(() => contactService.getContacts(), []);
  const allContacts = useApi<Contact[]>(fetchAllContacts, []);
  const fetchGroups = useCallback(() => contactService.getGroups(), []);
  const groups = useApi<ContactGroup[]>(fetchGroups, []);

  // Reset to the first page whenever search or a filter changes.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, customerTypeFilter, tariffFilter, powerFilter, regionFilter, ulpFilter, tagFilter]);

  // If a delete left the current page empty and we're beyond the last page, step back.
  useEffect(() => {
    const meta = contacts.data?.meta;
    if (meta && (contacts.data?.data?.length ?? 0) === 0 && meta.current_page > 1 && meta.total > 0 && !contacts.loading) {
      setPage(meta.current_page - 1);
    }
  }, [contacts.data, contacts.loading]);

  const groupNames = useMemo(() => {
    const map: Record<string, string> = {};
    (groups.data ?? []).forEach((g) => {
      map[g.id] = g.name;
    });
    return map;
  }, [groups.data]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', idpel: '', phone: '', email: '', customerType: '', tariff: '', power: '', region: '', ulp: '', tags: [] },
  });

  const tagsWatch = watch('tags');

  const rows = contacts.data?.data ?? [];
  const meta = contacts.data?.meta;

  const regions = useMemo(() => uniqueValues(allContacts.data ?? [], (c) => c.region), [allContacts.data]);
  const ulps = useMemo(() => uniqueValues(allContacts.data ?? [], (c) => c.ulp), [allContacts.data]);
  const tariffs = useMemo(() => uniqueValues(allContacts.data ?? [], (c) => c.tariff), [allContacts.data]);
  const powers = useMemo(() => uniqueValues(allContacts.data ?? [], (c) => c.power), [allContacts.data]);

  const openAdd = () => {
    setEditing(null);
    reset({ name: '', idpel: '', phone: '', email: '', customerType: '', tariff: '', power: '', region: '', ulp: '', tags: [] });
    setFormOpen(true);
  };

  const openEdit = (c: Contact) => {
    setEditing(c);
    reset({
      name: c.name,
      idpel: c.idpel ?? '',
      phone: c.phone,
      email: c.email ?? '',
      customerType: c.customerType ?? '',
      tariff: c.tariff ?? '',
      power: c.power ?? '',
      region: c.region ?? '',
      ulp: c.ulp ?? '',
      tags: c.groupIds,
    });
    setFormOpen(true);
  };

  const onSubmit = async (values: ContactFormValues) => {
    try {
      const payload = {
        name: values.name,
        phone: values.phone,
        email: values.email || null,
        idpel: values.idpel || null,
        customerType: values.customerType || null,
        tariff: values.tariff || null,
        power: values.power || null,
        region: values.region || null,
        ulp: values.ulp || null,
        groupIds: values.tags,
      };
      if (editing) {
        await contactService.updateContact(editing.id, payload);
        toastSuccess('Contact updated', `${values.name} was updated.`);
      } else {
        await contactService.createContact(payload);
        toastSuccess('Contact added', `${values.name} was added to your contacts.`);
      }
      setFormOpen(false);
      contacts.reload();
    } catch (e) {
      toastError('Failed to save contact', e instanceof Error ? e.message : undefined);
    }
  };

  const onDeleteSingle = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await contactService.deleteContact(deleteTarget.id);
      toastSuccess('Contact deleted', `${deleteTarget.name} was removed.`);
      setDeleteTarget(null);
      contacts.reload();
    } catch (e) {
      toastError('Failed to delete contact', e instanceof Error ? e.message : undefined);
    } finally {
      setDeleting(false);
    }
  };

  const onDeleteBulk = async () => {
    if (selectedKeys.length === 0 || deleting) return;
    setDeleting(true);
    try {
      await contactService.deleteContacts(selectedKeys);
      toastSuccess('Contacts deleted', `${selectedKeys.length} contacts were removed.`);
      setBulkDelete(false);
      setSelectedKeys([]);
      contacts.reload();
    } catch (e) {
      toastError('Failed to delete contacts', e instanceof Error ? e.message : undefined);
    } finally {
      setDeleting(false);
    }
  };

  const onAssign = async () => {
    if (!assignGroup || selectedKeys.length === 0) return;
    try {
      await contactService.assignGroups(selectedKeys, [assignGroup], assignAdd);
      toastSuccess('Groups updated', `${selectedKeys.length} contacts ${assignAdd ? 'added to' : 'removed from'} ${groupNames[assignGroup] ?? assignGroup}.`);
      setAssignOpen(false);
      setSelectedKeys([]);
      contacts.reload();
    } catch (e) {
      toastError('Failed to assign group', e instanceof Error ? e.message : undefined);
    }
  };

  const onPageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  const onSortChange = (key: string, dir: 'asc' | 'desc') => {
    setSortBy(key);
    setSortDir(dir);
  };

  const exportCsv = () => {
    const header = ['Name', 'IDPEL', 'Phone', 'Email', 'Customer Type', 'Tariff', 'Power (VA)', 'Region', 'ULP', 'Groups', 'Last Contact', 'Created'];
    const rowsCsv = (contacts.data?.data ?? []).map((c) => [
      c.name,
      c.idpel ?? '',
      c.phone,
      c.email ?? '',
      c.customerType ?? '',
      c.tariff ?? '',
      c.power ?? '',
      c.region ?? '',
      c.ulp ?? '',
      c.groupIds.map((g) => groupNames[g] ?? g).join('|'),
      c.lastContact ?? '',
      c.createdAt,
    ]);
    const csv = [header, ...rowsCsv.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pln-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toastSuccess('Contacts exported', `${rowsCsv.length} rows exported to CSV.`);
  };

  const actions = (c: Contact) => (
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
          { key: 'view', label: 'View details', icon: <Users className="h-4 w-4" />, onClick: () => setDetailTarget(c) },
          { key: 'edit', label: 'Edit contact', icon: <Pencil className="h-4 w-4" />, onClick: () => openEdit(c) },
          { key: 'delete', label: 'Delete', danger: true, icon: <Trash2 className="h-4 w-4" />, onClick: () => setDeleteTarget(c) },
        ]}
      />
    </div>
  );

  const columns: Column<Contact>[] = useMemo(() => [
    {
      key: 'name',
      header: 'Name',
      className: 'min-w-[13rem]',
      sortValue: (c) => c.name,
      render: (c) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={c.name} color="bg-whatsapp-500" size="sm" className="shrink-0" />
          <div className="min-w-0">
            <p className="truncate font-medium text-surface-900 dark:text-surface-100">{c.name}</p>
            {customerSecondary(c) && <p className="truncate text-xs text-surface-400">{customerSecondary(c)}</p>}
          </div>
        </div>
      ),
    },
    { key: 'idpel', header: 'IDPEL', className: 'whitespace-nowrap', sortValue: (c) => c.idpel ?? '', render: (c) => <span className="font-mono text-xs text-surface-600 dark:text-surface-300">{c.idpel ?? '—'}</span> },
    { key: 'phone', header: 'Phone', className: 'whitespace-nowrap', sortValue: (c) => c.phone, render: (c) => <span className="whitespace-nowrap text-sm text-surface-600 dark:text-surface-300">{formatPhone(c.phone)}</span> },
    {
      key: 'region',
      header: 'Region / ULP',
      className: 'min-w-[9rem]',
      sortValue: (c) => `${c.region ?? ''} ${c.ulp ?? ''}`,
      render: (c) => (
        <div className="text-sm">
          <span className="text-surface-700 dark:text-surface-200">{c.region ?? '—'}</span>
          {c.ulp && <span className="block text-xs text-surface-400">{c.ulp}</span>}
        </div>
      ),
    },
    { key: 'groups', header: 'Groups', render: (c) => <GroupChips groupIds={c.groupIds} names={groupNames} /> },
    { key: 'lastContact', header: 'Last Contact', className: 'whitespace-nowrap', sortValue: (c) => c.lastContact ?? '', render: (c) => <span className="whitespace-nowrap text-xs text-surface-500">{c.lastContact ? formatDateTime(c.lastContact) : '—'}</span> },
    { key: 'actions', header: '', align: 'right', className: 'w-12', render: actions },
  ], [groupNames]);

  if (contacts.error) return <ErrorState message="We couldn't load your contacts." onRetry={contacts.reload} />;

  const hasFilters = Boolean(search || customerTypeFilter || tariffFilter || powerFilter || regionFilter || ulpFilter || tagFilter);

  const clearFilters = () => {
    setSearch('');
    setCustomerTypeFilter('');
    setTariffFilter('');
    setPowerFilter('');
    setRegionFilter('');
    setUlpFilter('');
    setTagFilter('');
  };

  return (
    <div>
      <PageHeader
        title="Contacts"
        subtitle={`${formatNumber(meta?.total ?? 0)} PLN customers in your database`}
        crumbs={[{ label: 'Contacts' }]}
        actions={
          <>
            <Button variant="outline" onClick={exportCsv}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button variant="outline" onClick={() => navigate('/contacts/import')}>
              <Upload className="h-4 w-4" /> Import CSV
            </Button>
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add Contact
            </Button>
          </>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <div className="min-w-[16rem] flex-1 basis-64 lg:max-w-[22rem]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, IDPEL, phone or email..." />
        </div>
        <div className="w-32 sm:w-36 lg:w-32 shrink-0">
          <Select
            value={customerTypeFilter}
            onChange={(e) => setCustomerTypeFilter(e.target.value)}
            options={[{ value: '', label: 'All Types' }, ...CUSTOMER_TYPE_OPTIONS.map((t) => ({ value: t, label: t }))]}
            aria-label="Filter by customer type"
          />
        </div>
        <div className="w-32 shrink-0">
          <Select
            value={tariffFilter}
            onChange={(e) => setTariffFilter(e.target.value)}
            options={[{ value: '', label: 'All Tariffs' }, ...tariffs.map((t) => ({ value: t, label: t }))]}
            aria-label="Filter by tariff"
          />
        </div>
        <div className="w-32 shrink-0">
          <Select
            value={powerFilter}
            onChange={(e) => setPowerFilter(e.target.value)}
            options={[{ value: '', label: 'All Power' }, ...powers.map((p) => ({ value: p, label: p }))]}
            aria-label="Filter by power"
          />
        </div>
        <div className="w-36 shrink-0">
          <Select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            options={[{ value: '', label: 'All Regions' }, ...regions.map((r) => ({ value: r, label: r }))]}
            aria-label="Filter by region"
          />
        </div>
        <div className="w-36 shrink-0">
          <Select
            value={ulpFilter}
            onChange={(e) => setUlpFilter(e.target.value)}
            options={[{ value: '', label: 'All ULPs' }, ...ulps.map((u) => ({ value: u, label: u }))]}
            aria-label="Filter by ULP"
          />
        </div>
        <div className="w-36 shrink-0">
          <Select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            options={[{ value: '', label: 'All Groups' }, ...(groups.data ?? []).map((g) => ({ value: g.id, label: g.name }))]}
            aria-label="Filter by group"
          />
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear
          </Button>
        )}
      </div>

      {selectedKeys.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-whatsapp-200 bg-whatsapp-500/5 px-4 py-2.5 dark:border-whatsapp-500/30">
          <span className="text-sm font-medium text-surface-700 dark:text-surface-200">
            {selectedKeys.length} selected
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { setAssignAdd(true); setAssignOpen(true); }}>
              <Tag className="h-3.5 w-3.5" /> Assign Group
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setAssignAdd(false); setAssignOpen(true); }}
            >
              Remove Group
            </Button>
            <Button variant="danger" size="sm" onClick={() => setBulkDelete(true)}>
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedKeys([])}>
              Clear
            </Button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(c) => c.id}
        loading={contacts.loading}
        dense
        onRowClick={(c) => setDetailTarget(c)}
        selection={{ selectedKeys, onSelectionChange: setSelectedKeys }}
        sandbox={{
          page,
          setPage,
          pageSize,
          setPageSize: onPageSizeChange,
          total: meta?.total ?? 0,
          externalData: true,
          sort: { key: sortBy, dir: sortDir },
          onSortChange,
        }}
        mobileCard={{
          title: (c) => (
            <div className="flex items-center gap-2.5">
              <Avatar name={c.name} color="bg-whatsapp-500" size="sm" />
              <div className="min-w-0">
                <p className="truncate font-medium text-surface-900 dark:text-surface-100">{c.name}</p>
                {customerSecondary(c) && <p className="truncate text-xs text-surface-400">{customerSecondary(c)}</p>}
              </div>
            </div>
          ),
          actions: (c) => actions(c),
          fields: [
            { label: 'IDPEL', render: (c) => <span className="font-mono text-xs">{c.idpel ?? '—'}</span> },
            { label: 'Phone', render: (c) => formatPhone(c.phone) },
            { label: 'Email', render: (c) => c.email || '—' },
            { label: 'Region / ULP', render: (c) => [c.region, c.ulp].filter(Boolean).join(' / ') || '—' },
            { label: 'Groups', render: (c) => (c.groupIds.length ? <GroupChips groupIds={c.groupIds} names={groupNames} /> : 'No groups') },
            { label: 'Last Contact', render: (c) => (c.lastContact ? formatDateTime(c.lastContact) : '—') },
            { label: 'Created', render: (c) => formatDate(c.createdAt) },
          ],
        }}
        empty={{
          icon: Users,
          title: 'No contacts yet',
          description: 'Add your first PLN customer or import a CSV to get started.',
          actionLabel: 'Add Contact',
          onAction: openAdd,
        }}
      />

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit Contact' : 'Add Contact'}
        description={editing ? `Update details for ${editing.name}` : 'Add a new PLN customer to your database'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button form="contact-form" type="submit" loading={isSubmitting}>
              {editing ? 'Save Changes' : 'Add Contact'}
            </Button>
          </>
        }
      >
        <form id="contact-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-surface-400">Customer Information</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Name" placeholder="e.g. Budi Santoso" error={errors.name?.message} {...register('name')} />
              <Input label="IDPEL" placeholder="123456789012" error={errors.idpel?.message} {...register('idpel')} />
              <Input label="Phone" placeholder="628123456789" error={errors.phone?.message} {...register('phone')} />
              <Input label="Email (optional)" type="email" placeholder="budi@email.com" error={errors.email?.message} {...register('email')} />
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-surface-400">PLN Information</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Select label="Customer Type" placeholder="Select type..." options={CUSTOMER_TYPE_OPTIONS.map((t) => ({ value: t, label: t }))} {...register('customerType')} />
              <Input label="Tariff" placeholder="e.g. R1" error={errors.tariff?.message} {...register('tariff')} />
              <Input label="Power (VA)" placeholder="e.g. 900" error={errors.power?.message} {...register('power')} />
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-surface-400">Location</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Region" placeholder="e.g. Jakarta" {...register('region')} />
              <Input label="ULP" placeholder="e.g. Kebayoran" {...register('ulp')} />
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-surface-400">Segmentation</p>
            <label className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">Groups</label>
            <div className="flex flex-wrap gap-2">
              {(groups.data ?? []).map((g) => {
                const checked = tagsWatch.includes(g.id);
                return (
                  <label key={g.id} className="flex cursor-pointer items-center gap-1.5">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded accent-whatsapp-500"
                      checked={checked}
                      onChange={(e) =>
                        setValue('tags', e.target.checked ? [...tagsWatch, g.id] : tagsWatch.filter((x) => x !== g.id))
                      }
                    />
                    <span className="text-sm text-surface-600 dark:text-surface-300">{g.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title={assignAdd ? 'Assign Group' : 'Remove from Group'}
        description={`Apply to ${selectedKeys.length} selected contact(s)`}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button onClick={onAssign}>{assignAdd ? 'Assign' : 'Remove'}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Select
            value={assignGroup}
            onChange={(e) => setAssignGroup(e.target.value)}
            options={[{ value: '', label: 'Select a group...' }, ...(groups.data ?? []).map((g) => ({ value: g.id, label: g.name }))]}
            placeholder="Select a group"
          />
          <p className="text-xs text-surface-400">
            {assignAdd ? 'Contacts will be added to this group.' : 'Contacts will be removed from this group.'}
          </p>
        </div>
      </Modal>

      <Modal
        open={!!detailTarget}
        onClose={() => setDetailTarget(null)}
        title="Customer Detail"
        description={detailTarget?.name}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setDetailTarget(null)}>Close</Button>
            <Button variant="secondary" onClick={() => { if (detailTarget) openEdit(detailTarget); setDetailTarget(null); }}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          </>
        }
      >
        {detailTarget && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Avatar name={detailTarget.name} color="bg-whatsapp-500" size="lg" />
              <div>
                <p className="text-lg font-semibold text-surface-900 dark:text-surface-100">{detailTarget.name}</p>
                {customerSecondary(detailTarget) && <p className="text-sm text-surface-500">{customerSecondary(detailTarget)}</p>}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-surface-400">Customer Information</p>
              <div className="rounded-xl bg-surface-50 px-4 py-2 dark:bg-surface-800/40">
                <dl className="divide-y divide-surface-100 dark:divide-surface-800">
                  <DetailRow label="Name">{detailTarget.name}</DetailRow>
                  <DetailRow label="IDPEL"><span className="font-mono">{detailTarget.idpel ?? '—'}</span></DetailRow>
                  <DetailRow label="Phone">{formatPhone(detailTarget.phone)}</DetailRow>
                  <DetailRow label="Email">{detailTarget.email ?? '—'}</DetailRow>
                </dl>
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-surface-400">PLN Information</p>
              <div className="rounded-xl bg-surface-50 px-4 py-2 dark:bg-surface-800/40">
                <dl className="divide-y divide-surface-100 dark:divide-surface-800">
                  <DetailRow label="Customer Type">{detailTarget.customerType ?? '—'}</DetailRow>
                  <DetailRow label="Tariff">{detailTarget.tariff ?? '—'}</DetailRow>
                  <DetailRow label="Power">{detailTarget.power ?? '—'}</DetailRow>
                </dl>
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-surface-400">Location</p>
              <div className="rounded-xl bg-surface-50 px-4 py-2 dark:bg-surface-800/40">
                <dl className="divide-y divide-surface-100 dark:divide-surface-800">
                  <DetailRow label="Region">{detailTarget.region ?? '—'}</DetailRow>
                  <DetailRow label="ULP">{detailTarget.ulp ?? '—'}</DetailRow>
                </dl>
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-surface-400">Groups</p>
              <div className="flex flex-wrap gap-1.5">
                {detailTarget.groupIds.length ? detailTarget.groupIds.map((g) => (
                  <Badge key={g} className="text-[10px]">{groupNames[g] ?? g}</Badge>
                )) : <span className="text-sm text-surface-400">No groups</span>}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-surface-400">Activity</p>
              <div className="rounded-xl bg-surface-50 px-4 py-2 dark:bg-surface-800/40">
                <dl className="divide-y divide-surface-100 dark:divide-surface-800">
                  <DetailRow label="Last Contact">{detailTarget.lastContact ? formatDateTime(detailTarget.lastContact) : '—'}</DetailRow>
                  <DetailRow label="Created">{formatDate(detailTarget.createdAt)}</DetailRow>
                </dl>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={onDeleteSingle}
        title="Delete Contact?"
        message={<>Are you sure you want to remove <b>{deleteTarget?.name}</b> from your contacts?</>}
        confirmLabel="Delete Contact"
        loading={deleting}
        loadingLabel="Deleting..."
      />

      <ConfirmDialog
        open={bulkDelete}
        onClose={() => setBulkDelete(false)}
        onConfirm={onDeleteBulk}
        title="Delete Contacts?"
        message={<>Are you sure you want to delete <b>{selectedKeys.length} contacts</b>? This cannot be undone.</>}
        confirmLabel="Delete Contacts"
        loading={deleting}
        loadingLabel="Deleting..."
      />
    </div>
  );
}