export const VARIABLES: { label: string; tag: string }[] = [
  { label: 'Name', tag: '{{name}}' },
  { label: 'IDPEL', tag: '{{idpel}}' },
  { label: 'Phone', tag: '{{phone}}' },
  { label: 'Email', tag: '{{email}}' },
  { label: 'Customer Type', tag: '{{customer_type}}' },
  { label: 'Tariff', tag: '{{tariff}}' },
  { label: 'Power', tag: '{{power}}' },
  { label: 'Region', tag: '{{region}}' },
  { label: 'ULP', tag: '{{ulp}}' },
  { label: 'Groups', tag: '{{groups}}' },
];

export function VariablePicker({ onInsert, disabled }: { onInsert: (variable: string) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-medium text-surface-400">Variables:</span>
      {VARIABLES.map((v) => (
        <button
          key={v.tag}
          type="button"
          disabled={disabled}
          onClick={() => onInsert(v.tag)}
          className="rounded-md border border-whatsapp-200 bg-whatsapp-500/5 px-2 py-0.5 text-xs text-whatsapp-700 transition-colors hover:bg-whatsapp-500/15 disabled:opacity-50 dark:border-whatsapp-500/30 dark:text-whatsapp-400"
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}
