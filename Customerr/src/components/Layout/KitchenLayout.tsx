"use client";
import React, { useState } from "react";
import { HiMenu } from "react-icons/hi";

interface KitchenLayoutProps {
    sidebar: React.ReactNode;
    children: React.ReactNode;
    // Adding new props for the view state
    activeView: string;
    setActiveView: React.Dispatch<React.SetStateAction<string>>;
}

export default function KitchenLayout({ sidebar, children, activeView, setActiveView }: KitchenLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    return (
        <div className="flex h-screen overflow-hidden">
            {/* Main Content Area*/}
            <div className="flex flex-col flex-1 bg-[#29282B] text-white">
                
                    {/* Header section with Buttons and staff info */}
                    <header className="p-5 pb-0 z-10 flex justify-between items-center">
                        <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4">
                            <div className="text-left">
                                <p className="text-xs sm:text-sm font-medium text-gray-50">Chef Name</p>
                                <p className="text-[10px] sm:text-xs text-gray-50">Kitchen Staff</p>
                            </div>
                            <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-orange-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                CN
                            </div>
                        </div>
                        {/* 2. Orders and History buttons */}
                        <div className="flex px-10 space-x-2">
                            <button
                                onClick={() => setActiveView('Orders')}
                                className={`text-white font-bold py-2 px-4 rounded transition-colors
                                    ${activeView === 'Orders' ? 'bg-orange-500' : 'bg-transparent border border-white'}
                                `}
                            >
                                Orders
                            </button>
                            <button
                                onClick={() => setActiveView('History')}
                                className={`text-white font-bold py-2 px-4 rounded transition-colors
                                    ${activeView === 'History' ? 'bg-orange-500' : 'bg-transparent border border-white'}
                                `}
                            >
                                History
                            </button>
                        </div>
                    </header>

                    {/*Main content with padding and overflow handling*/}
                    <main className="flex-1 overflow-y-auto">
                        <div className="p-8 pt-0 h-full">
                            {children}
                        </div>
                    </main>
            </div>

            {/* Mobile Menu Button */}
            <button
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden fixed top-4 right-4 z-50 p-2 rounded-md text-white"
            >
                <HiMenu size={24} />
            </button>
            {/* Sidebar */}
            <div className={`bg-[#65666B] shadow-lg text-white fixed top-0 right-0 h-full z-40 transform transition-transform duration-300 w-40 sm:w-[24rem] ${isSidebarOpen ? "translate-x-0" : "translate-x-full"} md:relative md:translate-x-0 md:w-[32rem] lg:w-[35rem]`}>
                {/* Close Button for Mobile */}
                <div className="md:hidden p-4 flex justify-start">
                    <button onClick={() => setIsSidebarOpen(false)} className="text-white text-2xl">
                        &times;
                    </button>
                </div>
                {sidebar}
            </div>
        </div>
    );
}