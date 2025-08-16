import React from "react";

export default function KitchenContent() {
    return (
        <div className="flex flex-col h-full">
            {/*A container for top right elements*/}
            <div className="p-2 sm:p-6 md:p-8 flex justify-start ml-[-20] mt-[-25]">
                {/*Kicthen staff profile section*/}
                <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4">
                    {/*Text section for the chefs name and role*/}
                    <div className="text-left">
                        <p className="text-xs sm:text-sm font-medium text-gray-50">Chef Name</p>
                        <p className="text-[10px] sm:text-xs text-gray-50">Kicthen Staff</p>
                    </div>

                    {/*Profile picture*/}
                    <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-orange-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        CN
                </div>
            </div>          
        </div>

        {/*Main content area*/}
        <div className="flex-1">

        </div>
    </div>
    );
}