//src/components/ReusableComponents/BackButton.tsx

'use client'

import React from "react";

//Defining the prop interface for the BackButton component
//Then passing custom behaviour like the onClick handler to the button.
interface BackButtonProps {
    onClick: () => void; //A function that will be called when the button is clicked.
}

export default function BackButton({ onClick }: BackButtonProps) {
    return (
        <button
        className="absolute top-5 left-5
        py-2.5 px-[15px]
        text-sm font-bold text-white
        bg-[#F5B849]
        border-none rounded-[5px]
        cursor-pointer shadow-[0px_2px_4px_rgba(0,0,0,0.2)]
        transition=all duration=200 ease-in-out
        hover:bg-[#e4a73a]
        hover:translate-y-[-1px]
        hover:shadow-[0px_3px_6px_rgba(0,0,0,0.3)]"
        onClick={onClick}
    >
         ← Back
    </button>
    );
}