import type { Metadata } from 'next';
import { AdminAuthGate } from '@/components/admin/AdminAuthGate';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

export const metadata: Metadata = {
  title: 'Seller operations hub',
  description: 'Private order verification and inventory workspace for NeoSales Botswana.',
  robots: { index: false, follow: false, nocache: true },
};

/** PIN-gated seller workspace. Excluded from robots.txt and marked noindex. */
export default function AdminPage() {
  return (
    <AdminAuthGate>
      <AdminDashboard />
    </AdminAuthGate>
  );
}
