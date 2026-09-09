import { Outlet } from 'react-router-dom';
import { MessageSquare, ShieldCheck } from 'lucide-react';

export function AuthLayout() {
  return (
    <div className="flex min-h-screen bg-surface-50 dark:bg-surface-950">
      {/* Left panel – login form */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-12 sm:px-8 lg:w-[55%] lg:px-12 xl:w-1/2">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-whatsapp-500 shadow-sm shadow-whatsapp-500/25">
            <MessageSquare className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight text-surface-900 dark:text-surface-100">
              WhatsApp Blast
            </p>
            <p className="text-xs text-surface-400">Campaign Management Dashboard</p>
          </div>
        </div>

        <div className="w-full max-w-md">
          <Outlet />
        </div>

        <p className="mt-10 flex items-center gap-1.5 text-xs text-surface-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>
            &copy; 2026 WhatsApp Blast &middot; All rights reserved.
          </span>
        </p>
      </div>

      {/* Right panel – hero */}
      <div className="relative hidden overflow-hidden lg:block lg:w-[45%] xl:w-1/2">
        <img
          src="/hero-login.svg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-950/90 via-surface-950/50 to-surface-950/20" />

        {/* Decorative accent line */}
        <div className="absolute left-0 top-0 h-full w-px bg-gradient-to-b from-whatsapp-500/0 via-whatsapp-500/30 to-whatsapp-500/0" />

        <div className="absolute bottom-12 left-12 right-12">
          <h2 className="max-w-md text-2xl font-bold leading-snug text-white xl:text-3xl">
            Reach thousands of customers with powerful WhatsApp campaigns.
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70">
            Schedule, send and measure every blast&nbsp;&mdash; contacts, templates,
            analytics and more from a single dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
