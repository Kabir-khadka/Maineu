"use client";
import { useState, useEffect } from "react";
import KitchenContent from "@/components/KitchenManagement/KitchenContent";
import KitchenSidebar from "@/components/KitchenManagement/KitchenSidebar";
import KitchenLayout from "@/components/Layout/KitchenLayout";
import HistoryContent from "@/components/KitchenManagement/HistoryContent";

export default function KitchenPage() {
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(4);
    const [totalOrders, setTotalOrders] = useState(0);
    //New state for managing active view
    const [activeView, setActiveView] = useState('Orders');

    // Calculate the total number of pages based on the total orders and page size
    const pageCount = Math.ceil(totalOrders / pageSize);

    const getPageSize = () => {
        if (typeof window !== 'undefined') {
            const width = window.innerWidth;
            if (width <= 768) return 2;
            if (width <= 1024) return 3;
            return 4;
        }
        return 4;
    };

    useEffect(() => {
        const handleResize = () => {
            const newPageSize = getPageSize();
            setPageSize(newPageSize);
            const newPageCount = Math.ceil(totalOrders / newPageSize);
            if (page >= newPageCount && newPageCount > 0) {
                setPage(newPageCount - 1);
            }
        };

        setPageSize(getPageSize());

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [totalOrders, page]);

    const goToPreviousPage = () => {
        setPage(prevPage => Math.max(0, prevPage - 1));
    };

    return (
        <KitchenLayout
            sidebar={
                <KitchenSidebar
                    page={page}
                    pageCount={pageCount}
                    setPage={setPage}
                    goToPreviousPage={goToPreviousPage}
                />
            }
            activeView={activeView}
            setActiveView={setActiveView}
        >
            {activeView === 'Orders' ? (
            <KitchenContent
                page={page}
                pageSize={pageSize}
                setPage={setPage}
                pageCount={pageCount}
                setTotalOrders={setTotalOrders}
            />
            ) : (
                <HistoryContent
                    page={page}
                    pageSize={pageSize}
                    setPage={setPage}
                    pageCount={pageCount}
                    setTotalOrders={setTotalOrders}
                />
            )}
        </KitchenLayout>
    );
}