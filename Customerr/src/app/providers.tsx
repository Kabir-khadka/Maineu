'use client';

import React from "react";
import { OrderProvider } from "./context/OrderContext";


export function Providers({ children }: { children: React.ReactNode}) {
    return (
        <OrderProvider>
            {children}
        </OrderProvider>
    );
}