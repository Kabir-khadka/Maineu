'use client'

import React from 'react';

interface SplitLayoutProps {
    sidebar: React.ReactNode;
    children: React.ReactNode;
}

export default function SplitLayout({ sidebar, children }: SplitLayoutProps) {
    return (
        <div className="flex h-screen overflow-hidden">
            {/* Sidebar */}
            <div className="w-60 bg-gray-900 text-white">
                {sidebar}
            </div>

            {/*Main Content */}
            <main className="flex-1 overflow-auto p-8 bg-gray-50">
                {children}
            </main>
        </div>
    );
};
// Compare this snippet from Customerr/src/app/category-management/page.tsx:
// 'use client';