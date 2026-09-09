import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-100 text-surface-400 dark:bg-surface-800">
        <Compass className="h-7 w-7" />
      </div>
      <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">404 — Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-surface-500 dark:text-surface-400">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/dashboard">
        <Button className="mt-6">Back to Dashboard</Button>
      </Link>
    </div>
  );
}