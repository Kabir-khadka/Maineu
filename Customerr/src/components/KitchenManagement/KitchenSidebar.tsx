"use client";
import React from "react";
import KitchenReusableButton from "../ReusableComponents/KitchenReusableButton";
import { MoveLeft, MoveRight, ChevronsLeft, ChevronsRight, Undo, FolderOpen } from "lucide-react";


interface KitchenSidebarProps {
    page: number;
    pageCount: number;
    setPage: React.Dispatch<React.SetStateAction<number>>;
    goToPreviousPage: () => void;
    handleUndo: () => void;
    canUndo: boolean;
    openOrderCount: number;
    doneOrderCount: number;
}

export default function KitchenSidebar({ page, pageCount, setPage, goToPreviousPage, handleUndo, canUndo, openOrderCount, doneOrderCount }: KitchenSidebarProps) {
    return (
    <div className="p-4 h-full flex flex-col">
    <div className="flex justify-center mb-4 gap-2"> {/* Center horizontally with margin bottom */}
        <KitchenReusableButton className="!w-20 !h-20">
            <div className="flex flex-col items-center justify-center gap-2">
                <span className="text-black font-bold text-3xl">{openOrderCount}</span>
                <span className="text-black text-xs sm:text-lg">OPEN</span>
            </div>
        </KitchenReusableButton>
        <KitchenReusableButton className="!w-20 !h-20">
            <div className="flex flex-col items-center justify-center gap-2">
                <span className="text-black font-bold text-3xl">{doneOrderCount}</span>
                <span className="text-black text-xs sm:text-lg">DONE</span>
            </div>
        </KitchenReusableButton>
    </div>
    <div className="w-full flex justify-center items-center py-4 bg-transparent" style={{ zIndex: 10 }}>
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 sm:gap-4 px-2 sm:px-0 gap-2">
            <KitchenReusableButton onClick={() => setPage(0)} disabled={page === 0}>
                <ChevronsLeft size={32} className="text-black" />
                <span className="text-black text-xs sm:text-xs">TO FRONT</span>
            </KitchenReusableButton>
            <KitchenReusableButton onClick={goToPreviousPage} disabled={page === 0}>
                <MoveLeft size={32} className="text-black" />
                <span className="text-black text-xs sm:text-xs">BACK</span>
            </KitchenReusableButton>
            <KitchenReusableButton onClick={() => setPage(prevPage => Math.min(pageCount - 1, prevPage + 1))} disabled={page >= pageCount - 1}>
                <MoveRight size={32} className="text-black" />
                <span className="text-black text-xs sm:text-xs">FORWARD</span>
            </KitchenReusableButton>
            <KitchenReusableButton onClick={() => setPage(pageCount - 1)} disabled={page >= pageCount - 1}>
                <ChevronsRight size={32} className="text-black" />
                <span className="text-black text-xs sm:text-xs">TO BACK</span>
            </KitchenReusableButton>
            <KitchenReusableButton onClick={handleUndo} disabled={!canUndo}>
                <MoveRight size={32} className="text-black" />
                <span className="text-black text-xs sm:text-xs">UNDO</span>
            </KitchenReusableButton>
        </div>
    </div>
</div>
    );
}