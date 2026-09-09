import { useState } from 'react';
import { Save, ShieldCheck, Eye, EyeOff, Lock, KeyRound, CheckCircle2 } from 'lucide-react';
import { useForm, type UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { UserProfile } from '@/types';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { toastSuccess, toastError } from '@/store/toastStore';

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Email is invalid'),
  phone: z.string().min(7, 'Phone number is invalid'),
});

const passwordSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: z.string().min(8, 'Password must be at least 8 characters'),
    new_password_confirmation: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((v) => v.new_password === v.new_password_confirmation, {
    path: ['new_password_confirmation'],
    message: 'Passwords do not match',
  });

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
    },
  });

  const {
    register: registerPw,
    handleSubmit: handleSubmitPw,
    reset: resetPw,
    formState: { errors: pwErrors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      new_password_confirmation: '',
    },
  });

  const onSubmit = async (values: ProfileFormValues) => {
    setSaving(true);
    try {
      const updated = await authService.updateProfile({
        name: values.name,
        email: values.email,
        phone: values.phone,
      } as Partial<UserProfile>);
      setUser(updated);
      toastSuccess('Profile updated', 'Your profile has been saved.');
    } catch {
      toastError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (values: PasswordFormValues) => {
    setChangingPassword(true);
    try {
      await authService.changePassword(values);
      resetPw();
      toastSuccess('Password changed', 'Your password has been updated successfully.');
    } catch (e) {
      toastError('Failed to update password', e instanceof Error ? e.message : undefined);
    } finally {
      setChangingPassword(false);
    }
  };

  const PasswordInput = ({
    field,
    label,
    placeholder,
    show,
    onToggle,
    error,
  }: {
    field: UseFormRegisterReturn;
    label: string;
    placeholder: string;
    show: boolean;
    onToggle: () => void;
    error?: string;
  }) => (
    <div className="relative">
      <Lock className="pointer-events-none absolute left-3 top-[38px] z-10 h-4 w-4 text-surface-400" />
      <div className="[&_input]:pl-9 [&_input]:pr-10">
        <Input
          label={label}
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          error={error}
          {...field}
        />
      </div>
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-[34px] z-10 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Profile"
        subtitle="Manage your personal information"
        crumbs={[{ label: 'Profile' }]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card title="Account" subtitle="Your account summary">
            <div className="flex flex-col items-center gap-4 py-2 text-center">
              <Avatar name={user?.name ?? 'User'} color={user?.avatarColor} size="xl" />
              <div>
                <p className="text-lg font-semibold text-surface-900 dark:text-surface-100">{user?.name}</p>
                <p className="text-sm text-surface-400">{user?.email}</p>
              </div>
              <Badge className="capitalize">
                <ShieldCheck className="h-3.5 w-3.5" /> {user?.role ?? 'Member'}
              </Badge>
            </div>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card title="Personal information" subtitle="Update your display name and contact details">
            <form id="profile-form" onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
              <Input label="Name" placeholder="Your full name" error={errors.name?.message} {...register('name')} />
              <Input label="Email" type="email" placeholder="you@email.com" error={errors.email?.message} {...register('email')} />
              <div className="sm:col-span-2">
                <Input label="Phone" placeholder="+628..." error={errors.phone?.message} {...register('phone')} />
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <Button type="submit" form="profile-form" loading={saving}>
                  <Save className="h-4 w-4" /> Save Profile
                </Button>
              </div>
            </form>
          </Card>

          <Card title="Change password" subtitle="Update your login credentials">
            <form onSubmit={handleSubmitPw(changePassword)} className="grid gap-4" noValidate>
              <PasswordInput
                field={registerPw('current_password')}
                label="Current password"
                placeholder="••••••••"
                show={showCurrent}
                onToggle={() => setShowCurrent((s) => !s)}
                error={pwErrors.current_password?.message}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <PasswordInput
                  field={registerPw('new_password')}
                  label="New password"
                  placeholder="••••••••"
                  show={showNew}
                  onToggle={() => setShowNew((s) => !s)}
                  error={pwErrors.new_password?.message}
                />
                <PasswordInput
                  field={registerPw('new_password_confirmation')}
                  label="Confirm new password"
                  placeholder="••••••••"
                  show={showConfirm}
                  onToggle={() => setShowConfirm((s) => !s)}
                  error={pwErrors.new_password_confirmation?.message}
                />
              </div>
              <p className="flex items-center gap-1.5 text-xs text-surface-500 dark:text-surface-400">
                <KeyRound className="h-3.5 w-3.5" /> Password must be at least 8 characters.
              </p>
              <div className="flex justify-end">
                <Button type="submit" variant="secondary" loading={changingPassword}>
                  <CheckCircle2 className="h-4 w-4" /> Update Password
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
