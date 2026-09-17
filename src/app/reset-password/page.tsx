import type { Metadata } from 'next';
import { PasswordRecovery } from '@/components/admin/PasswordRecovery';

export const metadata: Metadata = {
  title: 'Reset seller password',
  robots: { index: false, follow: false, nocache: true },
};

export default function ResetPasswordPage() {
  return <PasswordRecovery />;
}
