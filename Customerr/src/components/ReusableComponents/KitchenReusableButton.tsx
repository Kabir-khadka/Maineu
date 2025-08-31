import React from "react";

interface KitchenReusableButtonProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    disabled?: boolean;
}

export default function KitchenReusableButton({ children, className = '', onClick, disabled = false }: KitchenReusableButtonProps) {
    // Base class for the button's appearence
    //const baseClasses = "relative bg-gray-500 bg-opacity-30 rounded-lg shadow-md p-2 w-[120px] h-[120px] text-white flex flex-col items-center justify-center font-bold text-sm transition-all duration-200 ease-in-out transform hover:scale-105 active:scale-95 border border-gray-400 border-opacity-30 disabled:opacity-30 disabled:cursor-not-allowed";
      const baseClasses = "relative bg-white rounded-lg shadow-md p-2 w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 xl:w-42 xl:h-40 flex flex-col items-center justify-center font-bold transition-all duration-200 ease-in-out transform hover:scale-105 active:scale-95 border border-gray-400 border-opacity-30 disabled:opacity-30 disabled:cursor-not-allowed";

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`${baseClasses} ${className}`}
        >
            {children}
        </button>
    );
}