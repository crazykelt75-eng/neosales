import { AdminDashboard } from '@/components/admin/AdminDashboard';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Seller Operations Portal | NeoSales',
  description: 'Manage Botswana retail orders, FNB Pay2Cell and Orange Money verification, stock levels, and automated WhatsApp buyer notifications for NeoSales.',
};

export default function AdminPage() {
  return <AdminDashboard />;
}
