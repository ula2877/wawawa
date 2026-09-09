import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { authService } from '@/services/authService';
import { toastSuccess } from '@/store/toastStore';

const schema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    await authService.resetPassword('demo-token', values.password);
    setDone(true);
    toastSuccess('Password updated', 'Your password has been changed successfully.');
    setTimeout(() => navigate('/login', { replace: true }), 1400);
  };

  if (done) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-surface-900 dark:text-surface-100">Password reset successfully</h1>
        <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">Redirecting you to sign in...</p>
      </div>
    );
  }

  return (
    <div>
      <Link to="/login" className="mb-4 inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-700 dark:hover:text-surface-300">
        <ArrowLeft className="h-4 w-4" /> Back to Sign In
      </Link>
      <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Set a new password</h1>
      <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">Choose a strong password to secure your account.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-[38px] z-10 h-4 w-4 text-surface-400" />
          <div className="[&_input]:pl-9 [&_input]:pr-10">
            <Input
              label="New Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />
          </div>
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-3 top-[34px] z-10 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300"
            aria-label="Toggle password visibility"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-[38px] z-10 h-4 w-4 text-surface-400" />
          <div className="[&_input]:pl-9 [&_input]:pr-10">
            <Input
              label="Confirm Password"
              type={showConfirm ? 'text' : 'password'}
              placeholder="••••••••"
              error={errors.confirm?.message}
              {...register('confirm')}
            />
          </div>
          <button
            type="button"
            onClick={() => setShowConfirm((s) => !s)}
            className="absolute right-3 top-[34px] z-10 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300"
            aria-label="Toggle password visibility"
          >
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Reset Password
        </Button>
      </form>
    </div>
  );
}