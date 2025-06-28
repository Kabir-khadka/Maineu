// src/components/Layout/BottomSheetLayout.tsx
'use client';

import React, { useEffect, useRef, useState} from "react";

interface BottomSheetLayoutProps {
    children: React.ReactNode; //The content that stays in the background (AddEditContent)
    bottomSheetContent: React.ReactNode; // The content for the bottom sheet(FoodMenu)
    isOpen: boolean; // Controls whether the bottom sheet is open
    onClose: () => void; // Callback when the bottom sheet should close
}

export default function BottomSheetLayout({ children, bottomSheetContent, isOpen, onClose }: BottomSheetLayoutProps) {
    const sheetRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startY, setStartY] = useState(0);
    const [currentY, setCurrentY] = useState(0);
    const [sheetHeight, setSheetHeight] = useState('75%'); // Initial heiight, can be dynamic

    useEffect(() => {
        //Set initial height when opening
        if(isOpen) {
            setSheetHeight('75%');
        }
    }, [isOpen]);

    const handleTouchStart = (e: React.TouchEvent) => {
        if (sheetRef.current && e.target === sheetRef.current.querySelector('.bottom-sheet-handle')) {
            setIsDragging(true);
            setStartY(e.touches[0].clientY);
            setCurrentY(sheetRef.current.getBoundingClientRect().top);
            sheetRef.current.style.transition = 'none'; // Disable transition during drag
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;

        const deltaY = e.touches[0].clientY - startY;
        const newTop = currentY + deltaY;

        // Prevent dragging upwards beyond the top of the screen
        const maxTop = window.innerHeight * 0.25; // 25% from top as the max open height
        const clampedTop = Math.max(maxTop, newTop);

        //Calculate new height based on clampedTop
        const newHeight = window.innerHeight - clampedTop;
        setSheetHeight(`${(newHeight / window.innerHeight) * 100}%`);
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        if (sheetRef.current) {
            sheetRef.current.style.transition = 'transition 0.3s ease-out'; //Re-enable transition

            const currentHeight = sheetRef.current.clientHeight;
            const screenHeight = window.innerHeight;

            //If dragged down significantly, close the sheet
            //Threshold can be adjusted according to the need
            if (currentHeight < screenHeight * 0.5) {// If less than 50% of screen height
            onClose();    
            } else {
                //Snap back to initial height if not closed
                setSheetHeight('75%');
            }
        }
    };

    //Prevent scrolling background when bottom sheet is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    return (
        <div className="relative w-full min-h-screen overflow-hidden">
            {/* Background Content (AddEditContent) */}
            <div className="absolute inset-0 z-0">
                {children}
            </div>

            {/* Overlay */}
            {isOpen && (
                <div 
                className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 ease-in-out"
                onClick={onClose}> 
                </div>
            )}

            {/* Bottom Sheet Panel */}
            <div 
                ref={sheetRef}
                className={`
                    fixed bottom-0 left-0 right-0 bg-[#fdd7a2] rounded-t-2xl shadow-xl z-50
                    transition-transform duration-300 ease-out
                    flex flex-col
                    ${isOpen ? 'translate-y-0' : 'transition-y-full'}
                    `}
                    style={{ height: isOpen ? sheetHeight : '0' }}// Control height dynamically or hide
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    {/* Handle for dragging/closing */}
                    <div 
                        className="bottom-sheet-handle w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-2 mb-4 cursor-grab active:cursor-grabbing"
                        onMouseDown={(e) => {
                            //Prevent default to avoid text selection etc.
                            e.preventDefault();
                            if (sheetRef.current) {
                                setIsDragging(true);
                                setStartY(e.clientY);
                                setCurrentY(sheetRef.current.getBoundingClientRect().top);
                                sheetRef.current.style.transition = 'none';
                            }
                        }}
                        onMouseMove={(e) => {
                            if (!isDragging) return;
                            const deltaY = e.clientY - startY;
                            const newTop = currentY + deltaY;
                            const maxTop = window.innerHeight * 0.25; // 25% from top
                            const clampedTop = Math.max(maxTop, newTop);

                            const newHeight = window.innerHeight - clampedTop;
                            setSheetHeight(`${(newHeight / window.innerHeight) * 100}%`);
                        }}
                        onMouseUp={() => {
                            setIsDragging(false);
                            if (sheetRef.current) {
                                sheetRef.current.style.transition = 'transform 0.3s ease-out';
                                const currentHeight = sheetRef.current.clientHeight;
                                const screenHeight = window.innerHeight;
                                if (currentHeight < screenHeight * 0.5) {
                                    onClose();
                                } else {
                                    setSheetHeight('75%');
                                }
                            }
                        }}
                        onMouseLeave={() => { //Stop drag if mouse leaves element
                            if (isDragging) {
                                setIsDragging(false);
                                if (sheetRef.current) {
                                    sheetRef.current.style.transition = 'transform 0.3s ease-out';
                                    setSheetHeight('75%'); //Snap back if dragging stops unexpectedly
                                }
                            }
                        }}
                    ></div>

                    {/* Close Button (X icon) */}
                    <button
                        onClick={onClose}
                        className="absolute top-2 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold"
                        aria-label="Close"
                    >
                        &times;
                    </button>

                    {/* Content for the Bottom Sheet (FoodMenu) */}
                    <div className="flex-1 overflow-y-auto px-4 pb-4">
                        {bottomSheetContent}
                    </div>
                </div>
        </div>
    )


}