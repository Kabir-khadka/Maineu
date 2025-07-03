//src/components/AddEditContent/AddEditPage.tsx
'use client'; //Necessary for client-side functionality
import React, { useCallback, useEffect, useState } from 'react';
import BackButton from '../ReusableComponents/BackButton';
import { useRouter } from 'next/navigation'; // Importing useRouter for navigation
import { useOrder } from '@/app/context/OrderContext'; // Make sure this path is correct
import FoodMenu from '../foodmenu'; // This path might need correction later
import BottomSheetLayout from '../Layout/BottomSheetLayout'; // This path might need correction later
import { Order, OrderItem } from '@/types/order';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

//Component function for AddEdit Feature
export default function AddEditContent () {
    const router = useRouter(); //Initiliaze the route

    const {
        orderItems,
        activeOrders,//Needed to compare against confirmed state from backend
        increaseItemQuantity,
        decreaseItemQuantity,
        getNewlyAddedItems,
        getDecreasedOrRemovedItems,
        setInitialActiveOrders, //Crucial for populating state from backend
        resetOrder // For error handling/clearing state
    } = useOrder();

    //State to control whether the bottom sheet (FoodMenu) is open
    const [isFoodMenuOpen, setIsFoodMenuOpen] = useState(false);
    //State to tore the table number for display, fetched from localStorage
    const [tableNumberDisplay, setTableNumberDisplay] = useState<string | null>(null);
    //State for confirm button loading/disabled
    const [isConfirming, setIsConfirming] = useState(false);
    //State for loading initial data
    const [isLoading, setIsLoading] = useState(true);
    //State for general errors during data fetch
    const [error, setError] = useState<string | null>(null);

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
            setIsLoading(true); //Start loading
            setError(null); //Clear previous errors
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
            }finally {
                setIsLoading(false); //End loading
            }
        };
        fetchOrderData();
    }, [router, setInitialActiveOrders, resetOrder]);

    //Helper to calculate total price for a given set of items
    const calculateTotalPrice = useCallback((items: OrderItem[]): number => {
        return items.reduce((total, item) => total + item.quantity * item.price, 0);
    }, []);

    //handleConfirmOrder function (Adapted from MyOrderPage.tsx)
    const handleConfirmOrder = async () => {
        setIsConfirming(true); //Disable button, show loading
        setError(null); // Clear any previous errors

        //Get the current changes relative to the aggregated confirmed state from 'activeOrders'
        const newlyAddedItems = getNewlyAddedItems(); //Items to be POSTed
        const decreasedOrRemovedItems = getDecreasedOrRemovedItems(); //Items needing PATCH

        console.log("AddEditContent - Newly Added Items for POST:", newlyAddedItems);
        console.log("AddEditContent - Decreased or Removed Items for PATCH:", decreasedOrRemovedItems);

        const storedTableNumber = localStorage.getItem('tableNumber');
        if (!storedTableNumber) {
            setError("Table number not found in local storage!");// Using setError for UI feedback
            setIsConfirming(false);
            return;
        }

        if (newlyAddedItems.length === 0 && decreasedOrRemovedItems.length === 0) {
            console.log("AddEditContent - No changes detected. Navigating to next page.");
            alert("No changes to confirm!"); //Keep alert as in MyOrderPage no-change flow
            setIsConfirming(false); //Reset confirming state
            router.push('');
            return;
        }

        let changeSuccessful = false;
        let finalNavigationPath = '';

        try {
            //PART 1: Handle Additions/Increases (always POST as new order)
            if (newlyAddedItems.length > 0) {
                const newOrderData = {
                    tableNumber: storedTableNumber,
                    orderItems: newlyAddedItems,
                    totalPrice: calculateTotalPrice(newlyAddedItems),
                };

                const response = await fetch(`${BACKEND_URL}/api/orders`, {
                    method: 'POST',
                    headers:{ 'Content-Type': 'application/json' },
                    body: JSON.stringify(newOrderData)
                });

                if (response.ok) {
                    console.log('AddEditContent - New items confirmed successfully (POST).');
                    changeSuccessful = true;
                } else {
                    const errorData = await response.json();
                    console.error('AddEditContent - Failed to confirm new items:', errorData);
                    setError(`Failed to confirm new items : ${errorData.message || 'Unknown error'}.`);
                    setIsConfirming(false);
                    return; //Stop if additions failed
                }
            }

            //PART-2 Handle Decreases/Removals (PATCH existing orders)
            if (decreasedOrRemovedItems.length > 0) {
                if (activeOrders.length === 0) {
                    console.warn("AddEditContent - Decreases detected but no active orders to modify.");
                    setError("Cannot process decreases as no existing orders were found.");// Use setError
                    setIsConfirming(false);
                    return;
                }

                const ordersToPatchMap: { [orderId: string]: Order } = {};

                let mutableActiveOrderState: Order[] = JSON.parse(JSON.stringify(activeOrders));
                //Sorting from NEWEST TO OLDEST for reduction 
                mutableActiveOrderState.sort((a,b) => {
                    const dateA = new Date(a.createdAt);
                    const dateB = new Date(b.createdAt);
                    return dateB.getTime() - dateA.getTime();
                });

                decreasedOrRemovedItems.forEach((change) => {
                    let quantityToProcess = -change.quantityChange; //This is the positive amount to reduce

                    for (let i = 0; i < mutableActiveOrderState.length && quantityToProcess > 0; i++) {
                        const order = mutableActiveOrderState[i];
                        const itemInOrderIndex = order.orderItems.findIndex(oi => oi.name === change.name);

                        if (itemInOrderIndex !== -1) {
                            const itemInOrder = order.orderItems[itemInOrderIndex];

                            const reducibleQuantity = Math.min(itemInOrder.quantity, quantityToProcess);

                            if (reducibleQuantity > 0) {
                                itemInOrder.quantity -= reducibleQuantity;
                                quantityToProcess -= reducibleQuantity;

                                if (itemInOrder.quantity === 0) {
                                    order.orderItems.splice(itemInOrderIndex, 1);
                                }

                                order.totalPrice = calculateTotalPrice(order.orderItems);
                                
                                ordersToPatchMap[order._id] = order;
                            }
                        }

                    }
                });

                let patchPromises: Promise<Response>[] = [];

                for (const orderId in ordersToPatchMap) {
                    const orderToUpdate = ordersToPatchMap[orderId];

                    const updateOrderData: Partial<Order> = {
                        tableNumber: storedTableNumber, //INcluded for backemd validation/context
                        orderItems: orderToUpdate.orderItems,
                        totalPrice: orderToUpdate.totalPrice,
                    };

                    if (orderToUpdate.orderItems.length === 0) {
                        updateOrderData.status = 'Cancelled';
                        updateOrderData.totalPrice = 0;
                        console.log(`AddEditContent - Order ${orderId} is now empty. Setting status to 'Cancelled'.`);
                    }

                    patchPromises.push(
                        fetch(`${BACKEND_URL}/api/orders/${orderId}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json'},
                            body: JSON.stringify(updateOrderData)
                        })
                    );
                }
                const results = await Promise.all(patchPromises);
                const allPatchesSuccessful = results.every(res => res.ok);

                if (allPatchesSuccessful) {
                    console.log('AddEditContent - Decreases/removals confirmed successfully (PATCH).');
                    changeSuccessful = true;
                    //If after all changes, no items are left in the cart (new or old), navigate to home
                    if (orderItems.length === 0 && newlyAddedItems.length === 0) {
                        finalNavigationPath = '/';
                    }
                } else {
                    const failedResults = results.filter(res => !res.ok);
                    console.error('AddEditContent - Failed to confirm some decreases/removals:', failedResults);
                    setError(`Failed to confirm some decreases/removals. PLease check console.`);
                    setIsConfirming(false);
                    return;
                }
            }
        } catch (err: any) { //Catching block for overall errors dusring API calls
            console.error('AddEditContent - Error confirming order changes:', err);
            setError(`Something went wrong while confirming changes: ${err.message || 'Unknown error'}.`);
            setIsConfirming(false);
            return;

        }

        //Final Steps
        if (changeSuccessful) {
            alert('Order changes confirmed successfully!'); //Retaining alert for success as in MyOrderPage
            //Re-fetch active orders to ensure context is fully synchronized with backend
            const response = await fetch(`${BACKEND_URL}/api/orders/table/${storedTableNumber}/active`);
            if (response.ok) {
                const updatedOrders: Order[] = await response.json();
                setInitialActiveOrders(updatedOrders); // Re-sync context with the new backend state
            } else {
                console.error("AddEditContent - Failed to re-fetch active orders after consfirmation.");
                setError("Order confirmed, but failed to re-sync. Please refresh."); //Use setError for this secondary issue

            }
            router.push(finalNavigationPath); 
        } else {
            alert("No changes were successfully confirmed!");
        }
        setIsConfirming(false);
    };


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

    //Function for Payment page
    const handleMoveTowardsPayment = () => {
        router.push('/payment'); // Navigate to the /payment route
    }

    //Derived state to check if there are any pending changes to confirm
    //This will cause the Confirm Order button to appear/disappear
    const hasPendingChanges = getNewlyAddedItems().length > 0 || getDecreasedOrRemovedItems().length > 0;

    if(isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#fdd7a2] p-4">
                <p className="text-xl text-gray-800">Loading order items...</p>
            </div>
        );
    }

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
                <div className="order-items-scrollable flex flex-col gap-2.5 flex-1 overflow-y-scroll pr-2">
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

            {/* Action Buttons Section (flex-col for stacking buttons) */}
            <div className="flex flex-col items-center mt-4 w-full gap-4">
                {/*Display Error Message */}
                {error && (
                    <p className="text-red-500 text-center font-bold mb-2">{error}</p>
                )}

                {/* Confirm Order Button - Conditionally Rendered */}
                {hasPendingChanges && (
                    <button
                        onClick={handleConfirmOrder}
                        disabled={isConfirming} // Disable when confirming
                        className={`py-3 px-8 text-white font-bold rounded-lg shadow-md w-[90%] max-w-[500px]
                            ${isConfirming ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700'}
                            transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-lg
                            active:translate-y-0 active:shadow-md`}
                        >
                            {isConfirming ? 'Confirming Changes...' : 'Confirm Order'}
                        </button>
                )}

            {/*Add/Edit Button Section */}
                <button
                onClick={handleAddEditClick}
                className="py-3 px-8 bg-[#2ecc71] text-white font-bold rounded-lg shadow-md
                transition-all duration-200 ease-in-out
                hover:bg-[#2ecc71] hover:-translate-y-0.5 hover:shadow-lg
                active:bg-[#2ecc71] active:translate-y-0 active:shadow-md"
                >
                    Add/Edit
                </button>

            {/*Movement towards PaymentPage button*/}
                <button
                    onClick={handleMoveTowardsPayment}
                    className="py-3 px-8 bg-[#2ecc71] text-white font-bold rounded-lg shadow-md
                    transition-all duration-200 ease-in-out
                    hover:bg-[#2ecc71] hover:-translate-y-0.5 hover:shadow-lg
                    active:bg-[#2ecc71] active:translate-y-0 active:shadow-md"
                >
                    Move to Payment
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