import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { ProtectedRoute, GuestRoute } from '@/routes/Guards';
import { MainLayout } from '@/layouts/MainLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { PageLoader } from '@/components/ui/Spinner';

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'));
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const CampaignsPage = lazy(() => import('@/pages/campaigns/CampaignsPage'));
const CreateCampaignPage = lazy(() => import('@/pages/campaigns/CreateCampaignPage'));
const EditCampaignPage = lazy(() => import('@/pages/campaigns/EditCampaignPage'));
const CampaignDetailPage = lazy(() => import('@/pages/campaigns/CampaignDetailPage'));
const ContactsPage = lazy(() => import('@/pages/contacts/ContactsPage'));
const ContactImportPage = lazy(() => import('@/pages/contacts/ContactImportPage'));
const ContactGroupsPage = lazy(() => import('@/pages/contactGroups/ContactGroupsPage'));
const TemplatesPage = lazy(() => import('@/pages/templates/TemplatesPage'));
const TemplateEditorPage = lazy(() => import('@/pages/templates/TemplateEditorPage'));
const WhatsAppAccountsPage = lazy(() => import('@/pages/whatsapp/WhatsAppAccountsPage'));
const MessageQueuePage = lazy(() => import('@/pages/whatsapp/MessageQueuePage'));
const MessageLogsPage = lazy(() => import('@/pages/whatsapp/MessageLogsPage'));
const AnalyticsPage = lazy(() => import('@/pages/analytics/AnalyticsPage'));
const ReportsPage = lazy(() => import('@/pages/reports/ReportsPage'));
const TeamPage = lazy(() => import('@/pages/team/TeamPage'));
const ActivityLogsPage = lazy(() => import('@/pages/activity/ActivityLogsPage'));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'));
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

function lazyPage(node: React.ReactNode) {
  return <Suspense fallback={<PageLoader />}>{node}</Suspense>;
}

export default function App() {
  useTheme();

  return (
    <BrowserRouter>
      <Routes>
        <Route
          element={
            <GuestRoute>
              <AuthLayout />
            </GuestRoute>
          }
        >
          <Route path="/login" element={lazyPage(<LoginPage />)} />
          <Route path="/forgot-password" element={lazyPage(<ForgotPasswordPage />)} />
          <Route path="/reset-password" element={lazyPage(<ResetPasswordPage />)} />
        </Route>

        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={lazyPage(<DashboardPage />)} />
          <Route path="/campaigns" element={lazyPage(<CampaignsPage />)} />
          <Route path="/campaigns/create" element={lazyPage(<CreateCampaignPage />)} />
          <Route path="/campaigns/:id/edit" element={lazyPage(<EditCampaignPage />)} />
          <Route path="/campaigns/:id" element={lazyPage(<CampaignDetailPage />)} />
          <Route path="/contacts" element={lazyPage(<ContactsPage />)} />
          <Route path="/contacts/import" element={lazyPage(<ContactImportPage />)} />
          <Route path="/contact-groups" element={lazyPage(<ContactGroupsPage />)} />
          <Route path="/templates" element={lazyPage(<TemplatesPage />)} />
          <Route path="/templates/create" element={lazyPage(<TemplateEditorPage />)} />
          <Route path="/templates/:id" element={lazyPage(<TemplateEditorPage />)} />
          <Route path="/templates/:id/edit" element={lazyPage(<TemplateEditorPage />)} />
          <Route path="/whatsapp-accounts" element={lazyPage(<WhatsAppAccountsPage />)} />
          <Route path="/message-queue" element={lazyPage(<MessageQueuePage />)} />
          <Route path="/message-logs" element={lazyPage(<MessageLogsPage />)} />
          <Route path="/analytics" element={lazyPage(<AnalyticsPage />)} />
          <Route path="/reports" element={lazyPage(<ReportsPage />)} />
          <Route path="/team" element={lazyPage(<TeamPage />)} />
          <Route path="/activity-logs" element={lazyPage(<ActivityLogsPage />)} />
          <Route path="/settings" element={lazyPage(<SettingsPage />)} />
          <Route path="/profile" element={lazyPage(<ProfilePage />)} />
          <Route path="*" element={lazyPage(<NotFoundPage />)} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}