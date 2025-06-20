//src/components/AddEditContent/AddEditPage.tsx
'use client'; //Necessary for client-side functionality
import React from 'react';
import BackButton from '../ReusableComponents/BackButton';
import { useRouter } from 'next/navigation'; // Importing useRouter for navigation

//Component function for AddEdit Feature
export default function AddEditContent () {
    const router = useRouter(); //Initiliaze the router

    //Function to handle the back button click
    const handleBackClick = () => {
        router.back(); //Navigates to the previous page in the browser history
    };

    return (
        <div className = "w-full h-screen flex flex-col items-center bg-[#fdd7a2] rounded-lg p-4">
            {/* Render the BackButton component */}
            <BackButton onClick={handleBackClick}/>
            <h1 className="text-gray-800 text-xl md:text-2xl font-bold rounded-lg p-3 pt-16 text-center">
                Add/Edit your Items.
            </h1>
        </div>
    )
}