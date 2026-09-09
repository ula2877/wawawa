import { useMemo, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, ArrowLeft, ArrowRight, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { contactService, type ImportSummary } from '@/services/contactService';
import { parseCSV } from '@/utils/csv';
import { toastSuccess, toastError, toastInfo } from '@/store/toastStore';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { cx, formatNumber } from '@/utils/format';

const SYSTEM_FIELDS = [
  { value: 'name', label: 'Name' },
  { value: 'idpel', label: 'IDPEL' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'customerType', label: 'Customer Type' },
  { value: 'tariff', label: 'Tariff' },
  { value: 'power', label: 'Power (VA)' },
  { value: 'region', label: 'Region' },
  { value: 'ulp', label: 'ULP' },
  { value: 'groups', label: 'Groups' },
  { value: 'none', label: 'Ignore' },
];

const SAMPLE_CSV = `IDPEL,Name,Phone,Email,Customer Type,Tariff,Power (VA),Region,ULP,Groups
123456789012,Budi Santoso,6281234567811,budi@gmail.com,Residential,R1,900,Jakarta,Kebayoran,Customers|Jakarta
987654321098,Siti Rahayu,6281234567812,siti@yahoo.com,Business,B2,2200,Jakarta,Kebayoran,VIP|Business
112233445566,Ahmad Fauzi,6281234567813,,Industrial,I2,13000,Surabaya,Manyar,Business`;

const EXPECTED_COLUMNS = [
  'IDPEL',
  'Name',
  'Phone',
  'Email',
  'Customer Type',
  'Tariff',
  'Power (VA)',
  'Region',
  'ULP',
  'Groups',
];

// Maximum accepted upload size (no existing limit was defined -> 10 MB).
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseGroupValue(value: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  value
    .split('|')
    .map((part) => part.trim())
    .filter((part) => part !== '')
    .forEach((part) => {
      const key = part.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(part);
      }
    });
  return out;
}

export default function ContactImportPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState<ImportSummary | null>(null);
  const [search, setSearch] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onFile = (fileInput: File | null) => {
    if (!fileInput) return;

    // Validate the file type.
    const isCsv = /\.csv$/i.test(fileInput.name) || fileInput.type === 'text/csv';
    if (!isCsv) {
      toastError('Invalid file', 'Please select a CSV file.');
      return;
    }

    // Validate the file size (only one file at a time is always the single dropped/selected item).
    if (fileInput.size > MAX_FILE_SIZE) {
      toastError('File too large', `The file exceeds the ${formatNumber(MAX_FILE_SIZE / (1024 * 1024))} MB limit.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      try {
        const parsed = parseCSV(text);
        if (parsed.headers.length === 0) {
          toastError('Empty file', 'The CSV file does not contain any rows.');
          return;
        }
        setFileName(fileInput.name);
        setFile(fileInput);
        setHeaders(parsed.headers);
        setRows(parsed.rows);
        const auto: Record<string, string> = {};
        [...['name', 'idpel', 'phone', 'email', 'customertype', 'tariff', 'power', 'region', 'ulp', 'groups']].forEach((f) => {
          const found = parsed.headers.find((h) => h.toLowerCase().replace(/[^a-z]/g, '') === f.toLowerCase().replace(/[^a-z]/g, ''));
          if (found) auto[found] = f;
        });
        setMapping(auto);
        setStep(1);
        toastInfo('File loaded', `${formatNumber(parsed.rows.length)} rows found.`);
      } catch {
        toastError('Invalid CSV', 'Could not parse the file.');
      }
    };
    reader.readAsText(fileInput);
  };

  const handleFile = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    // Only accept a single CSV file.
    if (files.length > 1) {
      toastError('Multiple files', 'Please upload only one CSV file.');
      return;
    }
    onFile(files[0]);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFile(e.dataTransfer.files);
  };

  const validation = useMemo(() => {
    let valid = 0, invalid = 0, duplicate = 0;
    const seen = new Set<string>();
    const phoneIdx = headers.findIndex((h) => mapping[h] === 'phone');
    const nameIdx = headers.findIndex((h) => mapping[h] === 'name');
    rows.forEach((row) => {
      const phone = phoneIdx >= 0 ? (row[phoneIdx] ?? '') : '';
      const name = nameIdx >= 0 ? (row[nameIdx] ?? '') : '';
      const norm = phone.replace(/\D/g, '');
      if (!name.trim() || !phone.trim() || (phone.length > 0 && !/\d{7,}/.test(norm))) invalid++;
      else if (seen.has(norm)) duplicate++;
      else { seen.add(norm); valid++; }
    });
    return { valid, invalid, duplicate };
  }, [headers, mapping, rows]);

  const previewData = useMemo(() => {
    const q = search.trim().toLowerCase();
    const phoneIdx = headers.findIndex((h) => mapping[h] === 'phone');
    const nameIdx = headers.findIndex((h) => mapping[h] === 'name');
    const emailIdx = headers.findIndex((h) => mapping[h] === 'email');
    const idpelIdx = headers.findIndex((h) => mapping[h] === 'idpel');
    const customerTypeIdx = headers.findIndex((h) => mapping[h] === 'customerType');
    const groupsIdx = headers.findIndex((h) => mapping[h] === 'groups');
    return rows.map((row, i) => {
      const name = nameIdx >= 0 ? (row[nameIdx] ?? '') : `Row ${i + 2}`;
      const phone = phoneIdx >= 0 ? (row[phoneIdx] ?? '') : '';
      const norm = phone.replace(/\D/g, '');
      const valid = name.trim() && phone.trim() && /\d{7,}/.test(norm);
      const groups = groupsIdx >= 0 ? parseGroupValue(row[groupsIdx] ?? '') : [];
      return {
        id: `r-${i}`,
        row: i + 2,
        name,
        phone,
        email: emailIdx >= 0 ? (row[emailIdx] ?? '') : '',
        idpel: idpelIdx >= 0 ? (row[idpelIdx] ?? '') : '',
        customerType: customerTypeIdx >= 0 ? (row[customerTypeIdx] ?? '') : '',
        groups,
        status: valid ? 'valid' : 'invalid',
      };
    }).filter((r) => !q || r.name.toLowerCase().includes(q) || r.phone.includes(q) || r.idpel.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
  }, [headers, mapping, rows, search]);

  const previewCols: Column<(typeof previewData)[number]>[] = [
    { key: 'row', header: '#', render: (r) => <span className="text-xs text-surface-400">{r.row}</span> },
    { key: 'name', header: 'Name', render: (r) => <span className="font-medium text-surface-800 dark:text-surface-100">{r.name}</span> },
    { key: 'idpel', header: 'IDPEL', render: (r) => <span className="font-mono text-xs text-surface-500">{r.idpel || <span className="text-surface-300">-</span>}</span> },
    { key: 'phone', header: 'Phone', render: (r) => r.phone },
    { key: 'email', header: 'Email', render: (r) => r.email || <span className="text-surface-300">-</span> },
    { key: 'customerType', header: 'Type', render: (r) => r.customerType || <span className="text-surface-300">-</span> },
    { key: 'groups', header: 'Groups', render: (r) => r.groups.length ? (
      <span className="flex flex-wrap gap-1">
        {r.groups.map((g) => <Badge key={g} className="text-[10px]">{g}</Badge>)}
      </span>
    ) : <span className="text-surface-300">-</span> },
    { key: 'status', header: 'Status', render: (r) => <Badge status={r.status === 'valid' ? 'Active' : 'Error'}>{r.status}</Badge> },
  ];

  const doImport = async () => {
    if (!file) {
      toastError('No file', 'Please re-upload the CSV file.');
      return;
    }
    if (importing) return;
    setImporting(true);
    try {
      const result = await contactService.importCsv(file, mapping);
      setDone(result);
      setStep(3);
      toastSuccess('Import complete', `${result.created} contacts created, ${result.skipped} skipped, ${result.failed} failed.`);
    } catch (e) {
      toastError('Import failed', e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setImporting(false);
    }
  };

  const loadSample = () => {
    const parsed = parseCSV(SAMPLE_CSV);
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
    const sampleFile = new File([blob], 'sample-pln-contacts.csv', { type: 'text/csv' });
    setFileName('sample-pln-contacts.csv');
    setFile(sampleFile);
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    const auto: Record<string, string> = {};
    parsed.headers.forEach((h) => {
      const key = h.toLowerCase().replace(/[^a-z]/g, '');
      const map: Record<string, string> = {
        idpel: 'idpel', name: 'name', phone: 'phone', email: 'email', customertype: 'customerType',
        tariff: 'tariff', power: 'power', region: 'region', ulp: 'ulp', groups: 'groups',
        tags: 'none', customerstatus: 'none',
      };
      auto[h] = map[key] ?? 'none';
    });
    setMapping(auto);
    setStep(1);
    toastInfo('Sample loaded', '3 sample PLN customers loaded.');
  };

  const downloadTemplate = () => {
    const csv = [EXPECTED_COLUMNS.join(','), SAMPLE_CSV.split('\n').slice(1).join('\n')].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pln-contacts-template.csv';
    a.click();
    URL.revokeObjectURL(url);
    toastSuccess('Template downloaded', 'Open it in a spreadsheet to fill in your PLN customer data.');
  };

  return (
    <div>
      <PageHeader
        title="Import Contacts"
        subtitle="Import PLN customer contacts from a CSV file"
        crumbs={[{ label: 'Contacts', to: '/contacts' }, { label: 'Import' }]}
        actions={<Button variant="outline" onClick={() => navigate('/contacts')}><ArrowLeft className="h-4 w-4" /> Back to Contacts</Button>}
      />

      <div className="mb-6 flex items-center gap-2">
        {['Upload CSV', 'Map Columns', 'Preview', 'Import'].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <span className={cx('flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors', i < step ? 'bg-whatsapp-500 text-white' : i === step ? 'bg-surface-900 text-white dark:bg-whatsapp-500' : 'bg-surface-100 text-surface-400 dark:bg-surface-800')}>{i < step ? '✓' : i + 1}</span>
            <span className={cx('hidden text-sm font-medium sm:inline', i === step ? 'text-surface-900 dark:text-surface-100' : 'text-surface-400')}>{label}</span>
            {i < 3 && <span className="hidden h-px w-6 bg-surface-200 sm:block dark:bg-surface-700" />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cx(
              'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-colors',
              isDragging
                ? 'border-whatsapp-400 bg-whatsapp-500/5 text-whatsapp-600 dark:bg-whatsapp-500/10 dark:text-whatsapp-400'
                : 'border-surface-300 bg-white hover:border-whatsapp-400 dark:border-surface-700 dark:bg-surface-900',
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                handleFile(e.target.files);
                e.target.value = '';
              }}
            />
            <Upload className="mb-4 h-10 w-10 text-surface-300" />
            <p className="text-base font-semibold text-surface-700 dark:text-surface-200">Drag & drop your PLN customer CSV file</p>
            <p className="mt-1 text-sm text-surface-400">or <span className="font-medium text-whatsapp-600 dark:text-whatsapp-400">browse files</span></p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 text-center">
            <button onClick={loadSample} className="text-sm font-medium text-whatsapp-600 hover:underline dark:text-whatsapp-400">Load sample data instead</button>
            <span className="text-surface-300">·</span>
            <button onClick={downloadTemplate} className="text-sm font-medium text-surface-600 hover:underline dark:text-surface-300">Download CSV Template</button>
          </div>
          <div className="mx-auto max-w-2xl rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 text-xs text-surface-500 dark:border-surface-800 dark:bg-surface-800/60 dark:text-surface-400">
            Expected columns: IDPEL, Name, Phone, Email, Customer Type, Tariff, Power (VA), Region, ULP, Groups
            <span className="mt-1 block">Phone must be entered as digits (e.g. 628123456789) and is always treated as text.</span>
            <span className="mt-1 block">Groups column: separate group names with a pipe (|) (e.g. Customers|Jakarta|Residential).</span>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-50 px-4 py-3 dark:bg-surface-800/60">
            <div className="flex min-w-0 items-center gap-3">
              <span className="truncate text-sm font-medium text-surface-700 dark:text-surface-200">{fileName}</span>
              <span className="text-xs text-surface-400">{file ? formatFileSize(file.size) : ''}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => { setFile(null); setRows([]); setHeaders([]); setMapping({}); setStep(0); }}
                className="text-sm font-medium text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
              >
                Change file
              </button>
              <span className="text-sm text-surface-500">{formatNumber(rows.length)} rows · {headers.length} columns</span>
            </div>
          </div>
          <div className="space-y-2.5">
            <p className="text-sm font-medium text-surface-700 dark:text-surface-200">Map each CSV column to a PLN customer field:</p>
            {headers.map((h) => (
              <div key={h} className="flex flex-wrap items-center gap-4 rounded-xl border border-surface-200 px-4 py-3 dark:border-surface-800">
                <span className="min-w-24 text-sm font-medium text-surface-800 dark:text-surface-100">{h}</span>
                <ArrowRight className="h-4 w-4 text-surface-300" />
                <Select
                  value={mapping[h] ?? 'none'}
                  onChange={(e) => setMapping((m) => ({ ...m, [h]: e.target.value }))}
                  options={SYSTEM_FIELDS}
                  className="w-44"
                />
                <span className="text-xs text-surface-400">Example: {rows[0]?.[headers.indexOf(h)] ?? '-'}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(0)}><ArrowLeft className="h-4 w-4" /> Back</Button>
            <Button onClick={() => setStep(2)}>Preview <ArrowRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 rounded-xl bg-surface-50 px-4 py-3 dark:bg-surface-800/60">
            <Badge status="Active">{validation.valid} valid</Badge>
            <Badge status="Error">{validation.invalid} invalid</Badge>
            <Badge>{validation.duplicate} duplicate</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search preview..." className="w-full sm:max-w-xs" />
          </div>
          <DataTable columns={previewCols} data={previewData} rowKey={(r) => r.id} pageSize={10} />
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4" /> Back</Button>
            <Button onClick={doImport} loading={importing}>{importing ? 'Importing...' : 'Upload & Import CSV'}</Button>
          </div>
        </div>
      )}

      {step === 3 && done && (
        <div className="space-y-4">
          <div className="flex flex-col items-center rounded-2xl border border-surface-200 bg-white p-8 text-center dark:border-surface-800 dark:bg-surface-900">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h2 className="text-xl font-bold text-surface-900 dark:text-surface-100">Import Complete!</h2>
            <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">{done.message}</p>
            <div className="mt-5 grid w-full max-w-xs grid-cols-3 gap-3">
              <div className="rounded-xl bg-surface-50 p-3 dark:bg-surface-800/60">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatNumber(done.created)}</p>
                <p className="text-xs text-surface-500">Created</p>
              </div>
              <div className="rounded-xl bg-surface-50 p-3 dark:bg-surface-800/60">
                <p className="text-2xl font-bold text-amber-500">{formatNumber(done.skipped)}</p>
                <p className="text-xs text-surface-500">Skipped</p>
              </div>
              <div className="rounded-xl bg-surface-50 p-3 dark:bg-surface-800/60">
                <p className="text-2xl font-bold text-rose-500">{formatNumber(done.failed)}</p>
                <p className="text-xs text-surface-500">Failed</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-surface-400">{formatNumber(done.total_rows)} rows processed</p>
            {typeof done.groups_created === 'number' && done.groups_created > 0 && (
              <p className="mt-1 text-xs text-whatsapp-600 dark:text-whatsapp-400">{formatNumber(done.groups_created)} new group{done.groups_created === 1 ? '' : 's'} created</p>
            )}
            <div className="mt-6 flex gap-3">
              <Button variant="outline" onClick={() => { setDone(null); setStep(0); setFile(null); setRows([]); setHeaders([]); setMapping({}); setSearch(''); }}>Import Another</Button>
              <Button onClick={() => navigate('/contacts')}>Go to Contacts</Button>
            </div>
          </div>

          {(done.duplicates.length > 0 || done.errors.length > 0) && (
            <div className="grid gap-4 md:grid-cols-2">
              {done.errors.length > 0 && (
                <div className="rounded-xl border border-rose-200 bg-white p-4 dark:border-rose-500/30 dark:bg-surface-900">
                  <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-rose-600 dark:text-rose-400">
                    <AlertTriangle className="h-4 w-4" /> Validation errors ({done.errors.length})
                  </p>
                  <ul className="max-h-64 space-y-2 overflow-y-auto">
                    {done.errors.map((err, i) => (
                      <li key={i} className="rounded-lg bg-rose-50 px-3 py-2 text-xs dark:bg-rose-500/10">
                        <span className="font-medium text-surface-700 dark:text-surface-200">Row {err.row}</span>
                        <span className="mx-1.5 text-surface-400">·</span>
                        <span className="font-medium text-rose-600 dark:text-rose-400">{err.field}</span>
                        <div className="text-surface-500 dark:text-surface-400">{err.message}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {done.duplicates.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-white p-4 dark:border-amber-500/30 dark:bg-surface-900">
                  <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
                    <XCircle className="h-4 w-4" /> Duplicates skipped ({done.duplicates.length})
                  </p>
                  <ul className="max-h-64 space-y-2 overflow-y-auto">
                    {done.duplicates.map((d, i) => (
                      <li key={i} className="rounded-lg bg-amber-50 px-3 py-2 text-xs dark:bg-amber-500/10">
                        <span className="font-medium text-surface-700 dark:text-surface-200">Row {d.row}</span>
                        <span className="mx-1.5 text-surface-400">·</span>
                        <span className="font-mono text-surface-500">{d.idpel}</span>
                        <div className="text-surface-500 dark:text-surface-400">{d.reason}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}