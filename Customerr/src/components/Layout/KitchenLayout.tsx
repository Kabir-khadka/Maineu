"use client";
import React, { Children, useState } from "react";
import {HiMenu} from "react-icons/hi";

//Defining the props expected by our layout component
interface KicthenLayoutProps {
    sidebar: React.ReactNode;
    children: React.ReactNode;
}

export default function KitchenLayout ({ sidebar, children }: KicthenLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    return (
        <div className="flex h-screen overflow-hidden">

            {/*Main Content*/}
            <main className="flex-1 bg-[#29282B] text-white">
            <div className="h-full p-8">
                {children}
            </div>
        </main>
        
           
            {/*Mobile Menu Button*/}
            <button
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden fixed top-4 right-4 z-50 p-2 rounded-md text-white"
            >
                <HiMenu size={24}/>
            </button>
            {/*Sidebar*/}
            <div className={`bg-[#65666B] shadow-lg text-white
            fixed top-0 right-0 h-full z-40 transform transition-transform duration-300
            w-40 sm:w-[24rem]
            ${isSidebarOpen ? "translate-x-0" : "translate-x-full"}

            md:relative md:translate-x-0 md:w-[32rem] lg:w-[35rem]
            `}
            >

                {/*Close Button for Mobile*/}
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