import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Clock, Globe2,
} from 'lucide-react';
import type { Campaign, Contact, ContactGroup, WhatsAppAccount } from '@/types';
import { useApi } from '@/hooks/useApi';
import { contactService } from '@/services/contactService';
import { whatsappService } from '@/services/whatsappService';
import { campaignService, type CampaignInput } from '@/services/campaignService';
import { templateService } from '@/services/templateService';
import { formatNumber, cx } from '@/utils/format';
import { toastSuccess, toastError, toastInfo } from '@/store/toastStore';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StepIndicator, WizardFooter, StepError } from '@/components/domain/Wizard';
import { WhatsAppPreview } from '@/components/domain/WhatsAppPreview';
import { FileUploadDropzone } from '@/components/domain/FileUploadDropzone';
import { VariablePicker } from '@/components/domain/VariablePicker';

const STEPS = [
  { key: 'info', label: 'Campaign' },
  { key: 'recipients', label: 'Recipients' },
  { key: 'message', label: 'Message' },
  { key: 'media', label: 'Media' },
  { key: 'preview', label: 'Preview' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'review', label: 'Review' },
];

const TIMEZONES = ['Asia/Jakarta (WIB)', 'Asia/Makassar (WITA)', 'Asia/Jayapura (WIT)', 'Asia/Singapore', 'UTC'];

interface RecipientMode {
  kind: 'groups' | 'select' | 'import';
  groupIds: string[];
  contactIds: string[];
  importCount: number;
}

export interface CampaignWizardProps {
  initial?: Campaign;
}

export function CampaignWizard({ initial }: CampaignWizardProps) {
  const navigate = useNavigate();
  const isEdit = !!initial;

  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [senderId, setSenderId] = useState(initial?.senderId ?? '');
  const [recipientMode, setRecipientMode] = useState<RecipientMode>({
    kind: initial ? (initial.groupIds.length ? 'groups' : 'select') : 'groups',
    groupIds: initial?.groupIds ?? [],
    contactIds: initial?.contactIds ?? [],
    importCount: 0,
  });
  const [templateId, setTemplateId] = useState('');
  const [message, setMessage] = useState(initial?.message ?? '');
  const [mediaType, setMediaType] = useState<Campaign['mediaType']>(initial?.mediaType ?? 'none');
  const [mediaName, setMediaName] = useState<string | undefined>(initial?.mediaName);
  const [mediaPath, setMediaPath] = useState<string | undefined>(initial?.mediaPath);
  const [mediaMimetype, setMediaMimetype] = useState<string | undefined>(initial?.mediaMimetype);
  const [mediaSize, setMediaSize] = useState<number | undefined>(initial?.mediaSize);
  const hadInitialMedia = Boolean(initial?.mediaPath && initial.mediaType && initial.mediaType !== 'none');
  const [sendMode, setSendMode] = useState<'now' | 'schedule'>(initial?.scheduledAt ? 'schedule' : 'now');
  const [schedule, setSchedule] = useState({
    date: initial?.scheduledAt ? new Date(initial.scheduledAt).toISOString().slice(0, 10) : '',
    time: initial?.scheduledAt ? new Date(initial.scheduledAt).toISOString().slice(11, 16) : '09:00',
    timezone: 'Asia/Jakarta (WIB)',
    start: '09:00',
    end: '18:00',
  });
  const [submitting, setSubmitting] = useState<'draft' | 'schedule' | 'now' | null>(null);

  const accounts = useApi<WhatsAppAccount[]>(() => whatsappService.getAccounts(), []);
  const groups = useApi<ContactGroup[]>(() => contactService.getGroups(), []);
  const contacts = useApi<Contact[]>(() => contactService.getContacts(), []);
  const templates = useApi(() => templateService.getTemplates(), []);

  useEffect(() => {
    if (!senderId && accounts.data?.length) {
      const def = accounts.data.find((a) => a.is_default) ?? accounts.data[0];
      setSenderId(def.id);
    }
  }, [accounts.data, senderId]);

  useEffect(() => {
    if (!templateId && templates.data?.length && !initial) {
      setTemplateId(String(templates.data[0].id));
    }
  }, [templates.data, templateId, initial]);

  useEffect(() => {
    if (templateId && !isEdit) {
      const t = templates.data?.find((x) => x.id === Number(templateId));
      if (t) setMessage(t.content);
    }
  }, [templateId, templates.data, isEdit]);

  const senderName = useMemo(() => accounts.data?.find((a) => a.id === senderId)?.name ?? '', [accounts.data, senderId]);

  const contactsByGroup = useMemo(() => {
    const map = new Map<string, number>();
    (contacts.data ?? []).forEach((c) => {
      c.groupIds.forEach((gid) => map.set(gid, (map.get(gid) ?? 0) + 1));
    });
    return map;
  }, [contacts.data]);

  const recipientCount = useMemo(() => {
    if (recipientMode.kind === 'groups') {
      return recipientMode.groupIds.reduce((sum, id) => sum + (contactsByGroup.get(id) ?? 0), 0);
    }
    if (recipientMode.kind === 'select') return recipientMode.contactIds.length;
    return recipientMode.importCount;
  }, [recipientMode, contactsByGroup]);

  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (!name.trim()) return 'Campaign name is required.';
      if (!senderId) return 'Please select a WhatsApp sender.';
    }
    if (s === 1 && recipientCount === 0) {
      return 'At least one recipient is required.';
    }
    if (s === 2) {
      if (!message.trim()) return 'Message cannot be empty.';
    }
    if (s === 5 && sendMode === 'schedule' && !schedule.date) {
      return 'Please choose a date for your schedule.';
    }
    if (s === 5 && sendMode === 'schedule' && !schedule.time) {
      return 'Please choose a time for your schedule.';
    }
    if (s === 5 && sendMode === 'schedule' && schedule.date && schedule.time) {
      const chosen = new Date(`${schedule.date}T${schedule.time}`);
      if (Number.isNaN(chosen.getTime())) {
        return 'The scheduled date and time are invalid.';
      }
      if (chosen.getTime() <= Date.now()) {
        return 'The scheduled time must be in the future.';
      }
    }
    return null;
  };

  const goNext = () => {
    setTouched(true);
    const err = validateStep(step);
    if (err) {
      setStepError(err);
      return;
    }
    setStepError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setStepError(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  const messageRef = useRef<HTMLTextAreaElement>(null);

  const insertVariable = (v: string) => {
    const el = messageRef.current;
    if (el) {
      const start = el.selectionStart ?? message.length;
      const end = el.selectionEnd ?? message.length;
      const next = message.slice(0, start) + v + message.slice(end);
      setMessage(next);
      const caret = start + v.length;
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(caret, caret);
      });
    } else {
      setMessage((m) => m + v);
    }
  };

  const submit = async (kind: 'draft' | 'schedule' | 'now') => {
    setSubmitting(kind);

    if (isEdit && initial && initial.status !== 'Draft') {
      toastError(
        'Only draft campaigns can be edited',
        `"${initial.name}" is ${initial.status}. Use the campaign detail page to pause, resume or send it.`,
      );
      setSubmitting(null);
      return;
    }

    if (recipientMode.kind === 'import') {
      toastError('Import mode not available yet', 'Please select contacts or a contact group instead.');
      setSubmitting(null);
      return;
    }

    const scheduledAt =
      kind === 'schedule' || (kind === 'draft' && sendMode === 'schedule')
        ? new Date(`${schedule.date}T${schedule.time}`).toISOString()
        : null;

    const payload: CampaignInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      senderId,
      templateId: templateId ? Number(templateId) : undefined,
      content: message,
      contactIds: recipientMode.kind === 'select' ? recipientMode.contactIds : [],
      groupIds: recipientMode.kind === 'groups' ? recipientMode.groupIds : [],
      scheduledAt,
      ...(mediaType !== 'none' && mediaPath
        ? { mediaPath, mediaType: mediaType as Exclude<Campaign['mediaType'], 'none'>, mediaName, mediaMimetype, mediaSize }
        : mediaType === 'none' && hadInitialMedia
          ? { mediaPath: null }
          : {}),
    };

    try {
      let campaignId = initial?.id;
      if (isEdit && initial) {
        await campaignService.updateCampaign(initial.id, payload);
      } else {
        const created = await campaignService.createCampaign(payload);
        campaignId = String(created.id);
      }

      if (kind === 'now' && campaignId) {
        const canSend = !isEdit || !initial || ['Draft', 'Scheduled', 'Paused'].includes(initial.status);
        if (canSend) {
          await campaignService.sendCampaign(campaignId);
        }
      }

      if (kind === 'schedule' && campaignId && scheduledAt) {
        await campaignService.scheduleCampaign(campaignId, scheduledAt);
      }

      toastSuccess(
        kind === 'now' ? 'Campaign started' : kind === 'schedule' ? 'Campaign scheduled' : 'Draft saved',
        `"${payload.name}" is ready.`,
      );
      navigate('/campaigns');
    } catch (e) {
      toastError('Failed to save campaign', e instanceof Error ? e.message : undefined);
      setSubmitting(null);
    }
  };

  const renderRecipientStep = () => (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {([
          { key: 'groups', label: 'Contact Groups', desc: 'Send to members of selected groups' },
          { key: 'select', label: 'Select Contacts', desc: 'Pick contacts individually' },
          { key: 'import', label: 'Import Contacts', desc: 'Upload a list of phone numbers' },
        ] as const).map((opt) => (
          <button
            type="button"
            key={opt.key}
            onClick={() => setRecipientMode((r) => ({ ...r, kind: opt.key }))}
            className={cx(
              'rounded-xl border-2 p-4 text-left transition-colors',
              recipientMode.kind === opt.key
                ? 'border-whatsapp-500 bg-whatsapp-500/5'
                : 'border-surface-200 hover:border-surface-300 dark:border-surface-800 dark:hover:border-surface-700',
            )}
          >
            <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">{opt.label}</p>
            <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">{opt.desc}</p>
          </button>
        ))}
      </div>

      {recipientMode.kind === 'groups' && (
        <div className="grid gap-2 sm:grid-cols-2">
          {(groups.data ?? []).map((g) => {
            const checked = recipientMode.groupIds.includes(g.id);
            const count = contactsByGroup.get(g.id) ?? 0;
            return (
              <label
                key={g.id}
                className={cx(
                  'flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-colors',
                  checked ? 'border-whatsapp-500 bg-whatsapp-500/5' : 'border-surface-200 hover:border-surface-300 dark:border-surface-800 dark:hover:border-surface-700',
                )}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded accent-whatsapp-500"
                  checked={checked}
                  onChange={(e) =>
                    setRecipientMode((r) => ({
                      ...r,
                      groupIds: e.target.checked ? [...r.groupIds, g.id] : r.groupIds.filter((x) => x !== g.id),
                    }))
                  }
                />
                <span className={cx('h-2.5 w-2.5 rounded-full', g.color)} />
                <span className="flex-1 text-sm font-medium text-surface-800 dark:text-surface-100">{g.name}</span>
                <span className="text-xs text-surface-400">{formatNumber(count)} contacts</span>
              </label>
            );
          })}
        </div>
      )}

      {recipientMode.kind === 'select' && (
        <div className="space-y-2">
          <p className="text-sm text-surface-500">Select individual contacts (up to 100):</p>
          <div className="grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 scrollbar-thin">
            {(contacts.data ?? []).map((c) => {
              const checked = recipientMode.contactIds.includes(c.id);
              return (
                <label
                  key={c.id}
                  className={cx(
                    'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors',
                    checked ? 'border-whatsapp-500 bg-whatsapp-500/5' : 'border-surface-200 hover:border-surface-300 dark:border-surface-800 dark:hover:border-surface-700',
                  )}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded accent-whatsapp-500"
                    checked={checked}
                    onChange={(e) =>
                      setRecipientMode((r) => ({
                        ...r,
                        contactIds: e.target.checked ? [...r.contactIds, c.id] : r.contactIds.filter((x) => x !== c.id),
                      }))
                    }
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block truncate text-sm font-medium text-surface-800 dark:text-surface-100">{c.name}</span>
                    <span className="block text-xs text-surface-400">{c.phone}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {recipientMode.kind === 'import' && (
        <div>
          <p className="mb-2 text-sm text-surface-500">Upload a CSV with phone numbers to add as recipients.</p>
          <FileUploadDropzone
            onUploaded={(uploaded) => {
              setRecipientMode((r) => ({ ...r, importCount: 1250 }));
              toastInfo('File uploaded', `${uploaded.mediaName} contains 1,250 numbers.`);
            }}
          />
          {recipientMode.importCount > 0 && (
            <p className="mt-2 text-sm text-amber-500">
              1,250 numbers staged for this campaign from upload. Import is not connected to the backend yet — use a contact group or select contacts to save this campaign.
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between rounded-xl bg-surface-50 px-4 py-3 dark:bg-surface-800/60">
        <span className="text-sm text-surface-500">Selected recipients</span>
        <Badge status="green">{formatNumber(recipientCount)}</Badge>
      </div>
    </div>
  );

  const renderMessageStep = () => (
    <div className="space-y-4">
      <Select
        label="Message template"
        value={templateId}
        onChange={(e) => setTemplateId(e.target.value)}
        options={(templates.data ?? []).map((t) => ({ value: String(t.id), label: `${t.name} (${t.category})` }))}
        placeholder={isEdit ? 'Use custom message' : 'Select a template...'}
      />
      <Textarea
        ref={messageRef}
        label="Message body"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={9}
        placeholder="Type your message here. Use {{name}}, {{phone}}, {{company}} to personalize."
        error={touched && step === 2 && !message.trim() ? 'Message cannot be empty.' : undefined}
      />
      <VariablePicker onInsert={insertVariable} />
      <p className="text-xs text-surface-400">
        Variables are replaced with the contact's data when messages are sent.
      </p>
    </div>
  );

  const renderScheduleStep = () => (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {([
          { key: 'now', label: 'Send Now', desc: 'Start sending immediately after saving' },
          { key: 'schedule', label: 'Schedule', desc: 'Send at a specific date and time' },
        ] as const).map((opt) => (
          <button
            type="button"
            key={opt.key}
            onClick={() => setSendMode(opt.key)}
            className={cx(
              'rounded-xl border-2 p-4 text-left transition-colors',
              sendMode === opt.key ? 'border-whatsapp-500 bg-whatsapp-500/5' : 'border-surface-200 hover:border-surface-300 dark:border-surface-800 dark:hover:border-surface-700',
            )}
          >
            <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">{opt.label}</p>
            <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">{opt.desc}</p>
          </button>
        ))}
      </div>

      {sendMode === 'schedule' && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Input label="Date" type="date" value={schedule.date} onChange={(e) => setSchedule((s) => ({ ...s, date: e.target.value }))} />
            </div>
            <div>
              <Input label="Time" type="time" value={schedule.time} onChange={(e) => setSchedule((s) => ({ ...s, time: e.target.value }))} />
            </div>
            <div>
              <Select
                label="Timezone"
                value={schedule.timezone}
                onChange={(e) => setSchedule((s) => ({ ...s, timezone: e.target.value }))}
                options={TIMEZONES.map((t) => ({ value: t, label: t }))}
              />
            </div>
          </div>

          <div className="rounded-xl border border-surface-200 p-4 dark:border-surface-800">
            <p className="mb-3 text-sm font-medium text-surface-700 dark:text-surface-200">Send between (optional)</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Input label="Start time" type="time" value={schedule.start} onChange={(e) => setSchedule((s) => ({ ...s, start: e.target.value }))} />
              </div>
              <div>
                <Input label="End time" type="time" value={schedule.end} onChange={(e) => setSchedule((s) => ({ ...s, end: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 rounded-xl bg-surface-50 px-4 py-3 text-sm dark:bg-surface-800/60">
            <span className="flex items-center gap-1.5 text-surface-500"><Calendar className="h-4 w-4" /> {schedule.date || '—'}</span>
            <span className="flex items-center gap-1.5 text-surface-500"><Clock className="h-4 w-4" /> {schedule.time || '—'}</span>
            <span className="flex items-center gap-1.5 text-surface-500"><Globe2 className="h-4 w-4" /> {schedule.timezone}</span>
          </div>
        </div>
      )}
    </div>
  );

  const renderReview = () => (
    <div className="space-y-4">
      <Card title="Review details" padded={false}>
        <dl className="divide-y divide-surface-100 dark:divide-surface-800">
          {[
            ['Campaign', name || '—'],
            ['Sender', senderName || '—'],
            ['Recipients', `${formatNumber(recipientCount)} contacts`],
            ['Schedule', sendMode === 'now' ? 'Immediately' : `${schedule.date} ${schedule.time} (${schedule.timezone})`],
            ['Media', mediaType === 'none' ? 'No media' : `${mediaType} · ${mediaName ?? ''}`],
          ].map(([k, v]) => (
            <div key={k} className="grid grid-cols-3 gap-4 px-5 py-3.5">
              <dt className="text-sm text-surface-500 dark:text-surface-400">{k}</dt>
              <dd className="col-span-2 text-sm font-medium text-surface-800 dark:text-surface-100">{v}</dd>
            </div>
          ))}
          <div className="grid grid-cols-3 gap-4 px-5 py-3.5">
            <dt className="text-sm text-surface-500 dark:text-surface-400">Message</dt>
            <dd className="col-span-2 whitespace-pre-line text-sm text-surface-700 dark:text-surface-300">{message}</dd>
          </div>
        </dl>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" loading={submitting === 'draft'} onClick={() => submit('draft')}>
          Save Draft
        </Button>
        {sendMode === 'schedule' ? (
          <Button variant="secondary" loading={submitting === 'schedule'} onClick={() => submit('schedule')}>
            Schedule Campaign
          </Button>
        ) : (
          <Button variant="secondary" loading={submitting === 'now'} onClick={() => submit('now')}>
            Send Now
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <StepIndicator steps={STEPS} current={step} />
      </div>

      <Card bodyClassName="p-5 sm:p-6">
        <div key={step} className="animate-fade-in">
          {step === 0 && (
            <div className="space-y-4">
              <Input label="Campaign name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Promo December" error={touched && step === 0 && !name.trim() ? 'Campaign name is required.' : undefined} />
              <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What is this campaign about?" />
              <Select
                label="WhatsApp sender"
                value={senderId}
                onChange={(e) => setSenderId(e.target.value)}
                options={(accounts.data ?? []).map((a) => ({ value: a.id, label: `${a.name} (${a.phone})` }))}
                error={touched && step === 0 && !senderId ? 'Please select a sender.' : undefined}
              />
            </div>
          )}
          {step === 1 && renderRecipientStep()}
          {step === 2 && renderMessageStep()}
          {step === 3 && (
            <div className="space-y-4">
              <FileUploadDropzone
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                upload={campaignService.uploadMedia}
                value={mediaType !== 'none' ? { mediaType: mediaType as Exclude<Campaign['mediaType'], 'none'>, mediaName } : null}
                onUploaded={(attached) => {
                  setMediaType(attached.mediaType);
                  setMediaName(attached.mediaName);
                  setMediaPath(attached.mediaPath);
                  setMediaMimetype(attached.mediaMimetype);
                  setMediaSize(attached.mediaSize);
                  toastSuccess('Media attached', `${attached.mediaName} was attached to this campaign.`);
                }}
                onRemove={() => {
                  setMediaType('none');
                  setMediaName(undefined);
                  setMediaPath(undefined);
                  setMediaMimetype(undefined);
                  setMediaSize(undefined);
                }}
                onError={(message) => toastError('Upload failed', message)}
              />
            </div>
          )}
          {step === 4 && (
            <div>
              <WhatsAppPreview
                senderName={senderName || 'Marketing 01'}
                recipientName="Budi"
                message={message}
                mediaType={mediaType}
                mediaName={mediaName}
                timestamp={new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              />
            </div>
          )}
          {step === 5 && renderScheduleStep()}
          {step === 6 && renderReview()}
          <StepError message={stepError ?? undefined} />
        </div>
      </Card>

      {step < 6 && (
        <WizardFooter
          step={step}
          total={STEPS.length}
          onBack={goBack}
          onNext={goNext}
          nextLabel="Next"
          cancelLabel={isEdit ? 'Cancel' : 'Save draft & exit'}
          onCancel={isEdit ? () => navigate('/campaigns') : () => submit('draft')}
        />
      )}
    </div>
  );
}