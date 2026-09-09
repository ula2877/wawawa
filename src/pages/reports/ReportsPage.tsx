import { useMemo, useState } from 'react';
import { FileBarChart, Download, FileText } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { campaignService } from '@/services/campaignService';
import { contactService } from '@/services/contactService';
import { whatsappService } from '@/services/whatsappService';
import { formatNumber, formatPercent } from '@/utils/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { toastSuccess, toastError } from '@/store/toastStore';

type ReportType = 'Campaign' | 'Delivery' | 'Contact' | 'Sender';

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: 'Campaign', label: 'Campaign Report' },
  { value: 'Delivery', label: 'Delivery Report' },
  { value: 'Contact', label: 'Contact Report' },
  { value: 'Sender', label: 'Sender Report' },
];

interface ReportRow {
  id: string;
  name: string;
  value1: string;
  value2: string;
  status: string;
  date?: string | null;
  sender?: string | null;
  groupIds?: string[];
}

const SENDER_STATUS_LABEL: Record<string, string> = {
  connected: 'Connected',
  connecting: 'Connecting…',
  disconnected: 'Disconnected',
  logged_out: 'Logged out',
};

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('Campaign');
  const [campaignFilter, setCampaignFilter] = useState('');
  const [senderFilter, setSenderFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [generated, setGenerated] = useState(false);

  const campaigns = useApi(() => campaignService.getCampaigns(), []);
  const senders = useApi(() => whatsappService.getAccounts(), []);
  const groups = useApi(() => contactService.getGroups(), []);
  const contacts = useApi(() => contactService.getContacts(), []);

  const rows = useMemo<ReportRow[]>(() => {
    if (reportType === 'Campaign') {
      return (campaigns.data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        value1: `${formatNumber(c.sent)} / ${formatNumber(c.recipients)}`,
        value2: formatPercent(c.recipients ? (c.delivered / c.recipients) * 100 : 0),
        status: c.status,
        date: c.createdAt,
        sender: c.senderName,
      }));
    }
    if (reportType === 'Delivery') {
      return (campaigns.data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        value1: `${formatNumber(c.delivered)} delivered`,
        value2: `${formatNumber(c.failed)} failed`,
        status: c.status,
        date: c.createdAt,
        sender: c.senderName,
      }));
    }
    if (reportType === 'Contact') {
      return (contacts.data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        value1: c.phone,
        value2: c.status.replace('_', ' '),
        status: c.status,
        date: c.createdAt,
        groupIds: c.groupIds,
      }));
    }
    return (senders.data ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      value1: s.phone ?? 'Not connected',
      value2: SENDER_STATUS_LABEL[s.status],
      status: s.status,
      date: s.created_at,
    }));
  }, [reportType, campaigns.data, contacts.data, senders.data]);

  const filteredRows = useMemo(() => {
    if (!generated) return [];
    let list = rows;

    const dateHit = (d?: string | null) => {
      if (!d) return true;
      const t = new Date(d).getTime();
      const from = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
      const to = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null;
      if (!from && !to) return true;
      if (from != null && t < from) return false;
      if (to != null && t > to) return false;
      return true;
    };

    if (reportType === 'Campaign' || reportType === 'Delivery') {
      if (campaignFilter) list = list.filter((r) => r.id === campaignFilter);
      if (senderFilter) list = list.filter((r) => r.sender === senderFilter);
    }
    if (reportType === 'Sender' && senderFilter) {
      list = list.filter((r) => r.name === senderFilter);
    }
    if (reportType === 'Contact' && groupFilter) {
      list = list.filter((r) => r.groupIds?.includes(groupFilter));
    }

    return list.filter((r) => dateHit(r.date));
  }, [generated, rows, reportType, campaignFilter, senderFilter, groupFilter, fromDate, toDate]);

  const generate = () => {
    setGenerated(true);
    toastSuccess('Report generated', `${reportType} report is ready.`);
  };

  const columns: Column<ReportRow>[] = useMemo(
    () => [
      { key: 'name', header: reportType === 'Campaign' || reportType === 'Delivery' ? 'Campaign' : reportType === 'Contact' ? 'Contact' : 'Sender', sortValue: (r) => r.name, render: (r) => <span className="font-medium text-surface-900 dark:text-surface-100">{r.name}</span> },
      { key: 'value1', header: reportType === 'Contact' || reportType === 'Sender' ? 'Phone' : 'Sent / Recipients', render: (r) => <span className="text-surface-600 dark:text-surface-300">{r.value1}</span> },
      { key: 'value2', header: reportType === 'Contact' || reportType === 'Sender' ? 'Status' : 'Rate', render: (r) => <span className="text-surface-600 dark:text-surface-300">{r.value2}</span> },
      { key: 'status', header: 'Status', render: (r) => <span className="capitalize text-surface-500">{r.status}</span> },
    ],
    [reportType],
  );

  const exportCsv = () => {
    if (!generated) {
      toastError('No report yet', 'Generate a report before exporting.');
      return;
    }
    const header = ['Name', reportType === 'Contact' ? 'Phone' : 'Value 1', 'Value 2', 'Status'];
    const csv = [header, ...filteredRows.map((r) => [r.name, r.value1, r.value2, r.status])]
      .map((row) => row.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType.toLowerCase()}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toastSuccess('Report exported', `${filteredRows.length} rows exported to CSV.`);
  };

  const escapeHtml = (value: unknown): string =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const exportPdf = () => {
    if (!generated) {
      toastError('No report yet', 'Generate a report before exporting.');
      return;
    }

    const cols = columns.filter((c) => typeof c.header === 'string');
    const head = cols.map((c) => `<th>${escapeHtml(c.header)}</th>`).join('');
    const bodyRows = filteredRows
      .map(
        (r) =>
          `<tr>${cols
            .map((c) => `<td>${escapeHtml(r[c.key as keyof ReportRow])}</td>`)
            .join('')}</tr>`,
      )
      .join('');

    const title = `${reportType} Report`;
    const period = `${fromDate ? `From ${fromDate}` : 'All dates'}${toDate ? ` to ${toDate}` : ''}`;

    const win = window.open('', '_blank');
    if (!win) {
      toastError('Popup blocked', 'Allow pop-ups to export the PDF.');
      return;
    }

    win.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; margin: 32px; }
      h1 { font-size: 20px; margin: 0 0 4px; }
      p { color: #6b7280; font-size: 12px; margin: 0 0 24px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th { text-align: left; background: #f3f4f6; }
      th, td { border: 1px solid #e5e7eb; padding: 8px 10px; }
      tbody tr:nth-child(even) { background: #fafafa; }
      @media print { body { margin: 12mm; } }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(period)} · ${filteredRows.length} rows · Generated ${new Date().toLocaleString()}</p>
    <table>
      <thead><tr>${head}</tr></thead>
      <tbody>${bodyRows || '<tr><td colspan="4">No rows</td></tr>'}</tbody>
    </table>
  </body>
</html>`);
    win.document.close();
    win.focus();
    win.print();
    toastSuccess('Report exported', `${filteredRows.length} rows sent to print/PDF.`);
  };

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Generate and export reports about your messaging activity"
        crumbs={[{ label: 'Reports' }]}
        actions={
          <>
            <Button variant="outline" onClick={exportPdf}>
              <FileText className="h-4 w-4" /> Export PDF
            </Button>
            <Button variant="outline" onClick={exportCsv}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button onClick={generate}>
              <FileBarChart className="h-4 w-4" /> Generate
            </Button>
          </>
        }
      />

      <Card title="Report filters" subtitle="Choose what data to include">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            label="Report type"
            value={reportType}
            onChange={(e) => { setReportType(e.target.value as ReportType); setGenerated(false); }}
            options={REPORT_TYPES.map((r) => ({ value: r.value, label: r.label }))}
          />
          <Select
            label="Campaign"
            value={campaignFilter}
            onChange={(e) => setCampaignFilter(e.target.value)}
            options={[{ value: '', label: 'All Campaigns' }, ...(campaigns.data ?? []).map((c) => ({ value: c.id, label: c.name }))]}
          />
          <Select
            label="Sender"
            value={senderFilter}
            onChange={(e) => setSenderFilter(e.target.value)}
            options={[{ value: '', label: 'All Senders' }, ...(senders.data ?? []).map((s) => ({ value: s.name, label: s.name }))]}
          />
          <Select
            label="Group"
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            options={[{ value: '', label: 'All Groups' }, ...(groups.data ?? []).map((g) => ({ value: g.id, label: g.name }))]}
          />
          <Input label="From" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <Input label="To" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
      </Card>

      <div className="mt-6">
        {generated ? (
          <Card title={`${reportType} Report`} subtitle={`${filteredRows.length} rows · ${fromDate ? `From ${fromDate}` : 'All dates'}${toDate ? ` to ${toDate}` : ''}`}>
            <DataTable columns={columns} data={filteredRows} rowKey={(r) => r.id} showPagination />
          </Card>
        ) : (
          <Card padded={false}>
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-100 text-surface-400 dark:bg-surface-800 dark:text-surface-500">
                <FileBarChart className="h-7 w-7" />
              </div>
              <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100">No report generated yet</h3>
              <p className="mt-1.5 max-w-sm text-sm text-surface-500 dark:text-surface-400">
                Choose your filters and click "Generate" to build a {reportType.toLowerCase()} report.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
