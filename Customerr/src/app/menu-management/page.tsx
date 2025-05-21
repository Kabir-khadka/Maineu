'use client'

import SplitLayout from '@/components/Layout/SplitLayout';
import AdminSidebar from '@/components/Layout/AdminSidebar';
import AdminMenuContent from '@/components/MenuManagement/AdminMenuContext';

export default function MenuManagementPage() {
  return (
    <SplitLayout sidebar={<AdminSidebar />}>
      <AdminMenuContent />
    </SplitLayout>
  );
}