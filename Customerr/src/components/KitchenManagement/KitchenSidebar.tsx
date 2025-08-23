"use client";
import React from "react";
import KitchenReusableButton from "../ReusableComponents/KitchenReusableButton";
import { MoveLeft, MoveRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface KitchenSidebarProps {
    page: number;
    pageCount: number;
    setPage: React.Dispatch<React.SetStateAction<number>>;
    goToPreviousPage: () => void;
}

export default function KitchenSidebar({ page, pageCount, setPage, goToPreviousPage }: KitchenSidebarProps) {
    return (
        <div className="p-4 h-full flex flex-col">
            {/* The following div now has no mt-auto, moving it to the top */}
            <div className="w-full flex justify-center items-center py-4 bg-transparent" style={{ zIndex: 10 }}>
                {/* The grid remains the same for responsive layout */}
                <div className="grid grid-cols-1 gap-2 xs:grid-cols-2 md:grid-cols-4 sm:gap-4 px-2 sm:px-0">
                    <KitchenReusableButton onClick={() => setPage(0)} disabled={page === 0}>
                        <ChevronsLeft size={32} className="text-white" />
                        <span className="text-xs sm:text-xs">TO FRONT</span>
                    </KitchenReusableButton>
                    <KitchenReusableButton onClick={goToPreviousPage} disabled={page === 0}>
                        <MoveLeft size={32} className="text-white" />
                        <span className="text-xs sm:text-xs">BACK</span>
                    </KitchenReusableButton>
                    <KitchenReusableButton onClick={() => setPage(prevPage => Math.min(pageCount - 1, prevPage + 1))} disabled={page >= pageCount - 1}>
                        <MoveRight size={32} className="text-white" />
                        <span className="text-xs sm:text-xs">FORWARD</span>
                    </KitchenReusableButton>
                    <KitchenReusableButton onClick={() => setPage(pageCount - 1)} disabled={page >= pageCount - 1}>
                        <ChevronsRight size={32} className="text-white" />
                        <span className="text-xs sm:text-xs">TO BACK</span>
                    </KitchenReusableButton>
                </div>
            </div>
        </div>
    );
}