import { cx } from '@/utils/format';

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative inline-flex h-[22px] w-10 shrink-0 items-center rounded-full transition-colors',
        checked ? 'bg-whatsapp-500' : 'bg-surface-300 dark:bg-surface-700',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      <span
        className={cx(
          'inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-1',
        )}
      />
    </button>
  );
}