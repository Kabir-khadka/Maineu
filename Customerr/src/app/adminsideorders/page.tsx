import SplitLayout  from "@/components/Layout/SplitLayout";
import AdminSidebar from "@/components/Layout/AdminSidebar";
import AdminOrdersContent from "@/components/AdminOrdersManagement/AdminOrdersContent";

export default function OrdersPage() {
    return (
        <SplitLayout sidebar={<AdminSidebar />}>
            <AdminOrdersContent />
        </SplitLayout>
    )
}