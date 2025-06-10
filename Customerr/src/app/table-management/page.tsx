// app/table-management/page.tsx
'use client';

import SplitLayout from "@/components/Layout/SplitLayout";  
import AdminSidebar from "@/components/Layout/AdminSidebar";
import AdminTablesContent from "@/components/AdminTablesManagement/AdminTablesContent";

export default function TablesPage() {
    return (
        <SplitLayout sidebar = {<AdminSidebar />}>
            <AdminTablesContent />
        </SplitLayout>
    )
}