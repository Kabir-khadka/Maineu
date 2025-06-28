//src/components/AddEditContent/AddEditPage.tsx
'use client'; //Necessary for client-side functionality
import React, { useEffect, useState } from 'react';
import BackButton from '../ReusableComponents/BackButton';
import { useRouter } from 'next/navigation'; // Importing useRouter for navigation
import { useOrder } from '@/app/context/OrderContext'; // Make sure this path is correct
import FoodMenu from '../foodmenu'; // This path might need correction later
import BottomSheetLayout from '../Layout/BottomSheetLayout'; // This path might need correction later
import { Order } from '@/types/order';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

//Component function for AddEdit Feature
export default function AddEditContent () {
    const router = useRouter(); //Initiliaze the route
    const { orderItems, increaseItemQuantity, decreaseItemQuantity, setInitialActiveOrders, resetOrder } = useOrder(); // <--- IMPORT THESE FUNCTIONS
    //State to control whether the bottom sheet (FoodMenu) is open
    const [isFoodMenuOpen, setIsFoodMenuOpen] = useState(false);
    //State to tore the table number for display, fetched from localStorage
    const [tableNumberDisplay, setTableNumberDisplay] = useState<string | null>(null);

    //useEffect hook to fetch initial order data from backend based on localStorage tableNumber
    //Core logic for Backend Database Persisitence
    useEffect(() => {
        const storedTableNumber = localStorage.getItem('tableNumber');
        setTableNumberDisplay(storedTableNumber);

        if (!storedTableNumber) {
            alert("Table number not found in local storage. PLease select a table first.");
            router.push('/');
            return;
        }
        
        const fetchOrderData = async () => {
            try {
                console.log(`AddEditContent: Fetching active orders for table: ${storedTableNumber}`);
                const response = await fetch(`${BACKEND_URL}/api/orders/table/${storedTableNumber}/active`);

                if(response.ok) {
                    const fetchedOrders:Order[] = await response.json();
                    console.log("AddEditContent: Fetched active orders:", fetchedOrders);
                    //This populates activeOrders AND intelligently merges into orderItems
                    setInitialActiveOrders(fetchedOrders);
                } else {
                    if (response.status === 404) {
                        console.log(`AddEditContent: No active orders found for table ${storedTableNumber}. Initializing context as empty.`);
                        setInitialActiveOrders([]);
                    } else {
                        console.log('AddEditContent: Failed to fetch active orders:', response.status, response.statusText);
                        alert('AddEditContent: Error loading existing orders for your table.');
                        resetOrder();
                    }
                }
            } catch (error) {
                console.error('AddEditContent: Network error fetching active orders:', error);
                alert('AddEditContent: Could not connect to server to load orders.');
                resetOrder(); //Clear context on network error
            }
        };
        fetchOrderData();
    }, [router, setInitialActiveOrders, resetOrder]);


    //Calculating total bills based on orderItems from context
    const totalBill = orderItems.reduce(
        (total, item) => total + item.quantity * item.price,
        0
    );

    //Function to handle the back button click
    const handleBackClick = () => {
        router.back(); //Navigates to the previous page in the browser history
    };

    //Function for Add/Edit button click
    const handleAddEditClick = () => {
        setIsFoodMenuOpen(true); //OPneing the bottom sheet
    };

    const handleCloseFoodMenu = () => {
        setIsFoodMenuOpen(false); //Close the bottom sheet
    };

    // Creating the entire main JSX component into a separate variable
    // and then passing it as the children prop to the BottomSheetLayout component.
    const backgroundContent = (
        <div className = "w-full min-h-screen flex flex-col items-center bg-[#fdd7a2] p-4">
            {/* Render the BackButton component */}
            <BackButton onClick={handleBackClick}/>
            <h1 className="text-gray-800 text-xl md:text-2xl font-bold rounded-lg p-3 pt-16 text-center">
                Add/Edit your Items.
            </h1>

            {/* Order Summary Ssection */}
            <div className="bg-white rounded-lg p-5 w-[90%] max-w-[500px] shadow-md border border-gray-200 h-[465px] flex flex-col justify-between">
                <div className="border-b-2 border-dashed border-gray-300 pb-2.5 mb-1">
                    <h2 className='text-xl text-gray-800 m-0 text-center'>Order Summary</h2>
                    <div className='text-sm text-gray-600 text-center'>{new Date().toLocaleDateString()}</div>
                </div>
            {/* Scrollable Area */}
                <div className="order-items-scrollable flex flex-col gap-2.5 overflow-y-scroll pr-2">
                    {/* These are order items */}
                    {orderItems.length > 0 ? (
                        orderItems.map((item, index) => (
                            <div key={index} 
                                className="flex flex-col items-center bg-white rounded-lg p-4 shadow-md w-full"
                            > 
                                {/* Item details line: Name - Quantity: X - Price: $Y */}
                                <span className="text-gray-800 text-base font-medium text-center">
                                    {item.name} - Qty: {item.quantity} - Price: ${item.price * item.quantity}
                                </span>
                                {/* Quanitiy Controls */}
                                <div className="flex items-center gap-2.5 mt-2.5"> {/* <--- QUANTITY CONTROLS */}
                                    <button
                                        onClick={() => decreaseItemQuantity(item.name)}
                                        className="bg-red-400 text-white px-2.5 py-1.5 rounded-md text-base font-bold shadow-sm hover:bg-[#E5A738] transition-colors"
                                    >
                                        -
                                    </button>
                                    <span className="text-gray-800 text-base font-bold">{item.quantity}</span> {/* Display quantity again if desired, or remove if "Qty" column is sufficient */}
                                    <button
                                        onClick={() => increaseItemQuantity(item.name)}
                                        className="bg-green-500 text-white px-2.5 py-1.5 rounded-md text-base font-bold shadow-sm hover:bg-[#E5A738] transition-colors"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-5 text-gray-700 text-base">No items in your current order.</div>
                    )}

                    </div>

                    <div className="flex justify-between py-4 mt-2.5 border-t-2 border-dashed border-gray-300 font-bold">
                        <span className='text-lg text-gray-800'>Total Amount</span>
                        <span className='text-lg text-[#F5BB49]'>${totalBill.toFixed(2)}</span>
                    </div>      
            </div>
            {/* End of Order Summary Section */}

            {/*Add/Edit Button Section */}
            <div className="flex justify-center mt-5 w-full">
                <button
                onClick={handleAddEditClick}
                className="py-3 px-8 bg-[#2ecc71] text-white font-bold rounded-lg shadow-md
                transition-all duration-200 ease-in-out
                hover:bg-[#2ecc71] hover:-translate-y-0.5 hover:shadow-lg
                active:bg-[#2ecc71] active:translate-y-0 active:shadow-md"
                >
                    Add/Edit
                </button>
            </div>
        </div>

    );

    return (
        <BottomSheetLayout
            isOpen = {isFoodMenuOpen}
            onClose={handleCloseFoodMenu}
            bottomSheetContent={<FoodMenu />}
        >
            {backgroundContent}
        </BottomSheetLayout>
    )
}