import KitchenContent from "@/components/KitchenManagement/KitchenContent";
import KitchenSidebar from "@/components/KitchenManagement/KitchenSidebar";
import KitchenLayout from "@/components/Layout/KitchenLayout";


export default function KitchenPage() {
    return (
        <KitchenLayout sidebar={<KitchenSidebar />}>
                    <KitchenContent />
        </KitchenLayout>

    );
}