'use client'

import SplitLayout from '@/components/Layout/SplitLayout';
import AdminSidebar from '@/components/Layout/AdminSidebar';
import CategoryManagementContent from '@/components/CategoryManagement/CategoryManagementContent';


export default function CategoryManagementPage() {
  return (
    <SplitLayout sidebar={<AdminSidebar />}>
      <CategoryManagementContent />
    </SplitLayout>

  )
}