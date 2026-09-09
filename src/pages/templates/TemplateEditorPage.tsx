import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Pencil, Trash2, ArrowLeft } from 'lucide-react';
import type { Template } from '@/types';
import { useApi } from '@/hooks/useApi';
import { templateService } from '@/services/templateService';
import { ApiError } from '@/services/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card } from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/States';
import { ConfirmDialog } from '@/components/ui/Modal';
import { WhatsAppPreview } from '@/components/domain/WhatsAppPreview';
import { VariablePicker } from '@/components/domain/VariablePicker';
import { replaceVariables } from '@/utils/template';
import { toastSuccess, toastError } from '@/store/toastStore';

export default function TemplateEditorPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const isEditRoute = location.pathname.includes('/edit') || !!id;
  const templateId = id ? Number(id) : undefined;

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [language, setLanguage] = useState('id');
  const [content, setContent] = useState('');
  const [contentError, setContentError] = useState<string | undefined>();
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const meta = useApi(() => templateService.getMeta(), []);
  const fetchTemplate = useCallback(
    () => (templateId ? templateService.getTemplate(templateId) : Promise.resolve(undefined)),
    [templateId],
  );
  const existing = useApi<Template | undefined>(fetchTemplate, [templateId]);

  const template = existing.data;
  const categories = meta.data?.categories ?? ['Marketing', 'Utility', 'Authentication', 'Transactional', 'Reminder', 'Informational'];
  const languages = meta.data?.languages ?? ['id', 'en'];

  useEffect(() => {
    if (template) {
      setName(template.name);
      setCategory(template.category);
      setLanguage(template.language);
      setContent(template.content);
    } else if (!category && categories.length) {
      setCategory(categories[0]);
    }
  }, [template, categories, category]);

  const insertVariable = (v: string) => {
    const el = contentRef.current;
    if (el) {
      const start = el.selectionStart ?? content.length;
      const end = el.selectionEnd ?? content.length;
      const next = content.slice(0, start) + v + content.slice(end);
      setContent(next);
      setTouched(true);
      const caret = start + v.length;
      requestAnimationFrame(() => {
        if (contentRef.current) {
          contentRef.current.focus();
          contentRef.current.setSelectionRange(caret, caret);
        }
      });
    } else {
      setContent((c) => c + v);
      setTouched(true);
    }
  };

  const nameError = touched && !name.trim() ? 'Name is required.' : undefined;

  const contentLength = useMemo(() => content.length, [content]);
  const MAX_CONTENT_LENGTH = 1024;

  const save = async () => {
    setTouched(true);
    setContentError(undefined);
    if (!name.trim() || !content.trim()) {
      toastError('Missing required fields', 'Name and content are required.');
      return;
    }
    setSaving(true);
    const payload = {
      name: name.trim(),
      category,
      language,
      content: content.trim(),
    };
    try {
      if (template) {
        await templateService.updateTemplate(template.id, payload);
        toastSuccess('Template updated', `"${payload.name}" was saved.`);
      } else {
        await templateService.createTemplate(payload);
        toastSuccess('Template created', `"${payload.name}" was saved.`);
      }
      navigate('/templates');
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) {
        const data = e.data as { errors?: { content?: string[] }; message?: string } | null;
        const first = data?.errors?.content?.[0];
        setContentError(first ?? data?.message ?? 'Invalid template variable.');
      } else {
        toastError('Failed to save template', e instanceof Error ? e.message : undefined);
      }
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!template) return;
    setDeleting(true);
    try {
      await templateService.deleteTemplate(template.id);
      toastSuccess('Template deleted', `"${template.name}" was removed.`);
      navigate('/templates');
    } catch {
      toastError('Failed to delete template');
      setDeleting(false);
    }
  };

  if (existing.loading || meta.loading) return <PageLoader label="Loading template..." />;

  if (isEditRoute && templateId && (existing.error || !template)) {
    return <ErrorState message="We couldn't load this template." onRetry={existing.reload} />;
  }

  return (
    <div>
      <PageHeader
        title={template ? 'Edit Template' : 'Create Template'}
        subtitle={template ? `${template.code} · Updated ${template.updated_at ? new Date(template.updated_at).toLocaleDateString() : ''}` : 'Compose a reusable WhatsApp message template'}
        crumbs={[{ label: 'Templates', to: '/templates' }, { label: template ? template.name : 'New Template' }]}
        actions={
          <Button variant="outline" onClick={() => navigate('/templates')}>
            <ArrowLeft className="h-4 w-4" /> Back to Templates
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Template details" subtitle="Name, category and content">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Name" value={name} onChange={(e) => { setName(e.target.value); setTouched(true); }} placeholder="e.g. Informasi Pemadaman" error={nameError} />
              <Select
                label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={categories.map((c) => ({ value: c, label: c }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                options={languages.map((l) => ({ value: l, label: l === 'id' ? 'Indonesian (id)' : 'English (en)' }))}
              />
            </div>
            <div>
              <Textarea
                ref={contentRef}
                label="Content"
                value={content}
                onChange={(e) => { setContent(e.target.value); setTouched(true); setContentError(undefined); }}
                rows={9}
                placeholder="Type your message. Use {{name}}, {{idpel}}, {{phone}}, {{region}} or {{groups}} to personalize."
                error={contentError}
              />
              <div className="mt-1 flex items-center justify-between">
                <VariablePicker onInsert={insertVariable} />
                <span className={`text-xs ${contentLength > MAX_CONTENT_LENGTH ? 'font-medium text-rose-500' : 'text-surface-400'}`}>
                  {contentLength}/{MAX_CONTENT_LENGTH}
                </span>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card
            title="Live preview"
            subtitle="How this template looks in WhatsApp"
            padded={false}
            bodyClassName="p-5"
          >
            <WhatsAppPreview
              senderName="Marketing 01"
              recipientName="Budi Santoso"
              message={replaceVariables(content)}
              timestamp="10:32"
            />
            {content.trim() && (
              <p className="mt-2 text-xs text-surface-400">
                Displayed with sample values. Placeholders stay visible when no sample exists.
              </p>
            )}
          </Card>

          <Card title="Save" subtitle="Templates are saved and ready to use" bodyClassName="flex flex-wrap items-center gap-2">
            <Button loading={saving} onClick={save}>
              <Pencil className="h-4 w-4" /> {template ? 'Save Changes' : 'Save Template'}
            </Button>
            {template && (
              <Button variant="danger" className="ml-auto" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            )}
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={onDelete}
        loading={deleting}
        title="Delete Template?"
        message={<>Are you sure you want to delete <b>{template?.name}</b>? This cannot be undone.</>}
        confirmLabel="Delete Template"
      />
    </div>
  );
}
