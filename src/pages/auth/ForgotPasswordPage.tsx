import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { authService } from '@/services/authService';
import { toastSuccess } from '@/store/toastStore';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    await authService.requestPasswordReset(values.email);
    setSentTo(values.email);
    toastSuccess('Reset link sent', `We emailed a reset link to ${values.email}`);
  };

  if (sentTo) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-surface-900 dark:text-surface-100">Check your inbox</h1>
        <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">
          We sent a password reset link to <span className="font-medium text-surface-700 dark:text-surface-200">{sentTo}</span>.
          Follow the link to reset your password.
        </p>
        <Link
          to="/reset-password"
          className="mt-5 inline-block text-sm font-medium text-whatsapp-600 hover:underline dark:text-whatsapp-400"
        >
          Continue to Reset Password
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/login" className="mb-4 inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-700 dark:hover:text-surface-300">
        <ArrowLeft className="h-4 w-4" /> Back to Sign In
      </Link>
      <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Forgot your password?</h1>
      <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
        Enter your email and we'll send you instructions to reset your password.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-[38px] z-10 h-4 w-4 text-surface-400" />
          <div className="[&_input]:pl-9">
            <Input label="Email" type="email" placeholder="you@company.com" error={errors.email?.message} {...register('email')} />
          </div>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Send Reset Link
        </Button>
      </form>
    </div>
  );
}