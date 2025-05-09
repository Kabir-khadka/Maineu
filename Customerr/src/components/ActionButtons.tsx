import { transform } from "next/dist/build/swc/generated-native";
import React from "react";


const ActionButtons: React.FC = () => {
    return(
        <div style={Styles.container}>
            <input
            type="text"
            placeholder="Search..."
            style={Styles.searchInput}/>
            {/* Circle image icon */}
            <div style={Styles.circleIconContainer as React.CSSProperties}>
                <img
                  src="/pictures/white.png"//change this to your image path
                  alt="close"
                  style={Styles.circleIcon as React.CSSProperties}/>
            </div>
        </div>
    );
};


const Styles = {
    container: {
        position: 'absolute' as 'absolute', //position at the top
        top: '10px', //adjust spacing from the top of the screen as needed
        left: '50%',
        transform: 'translateX(-50%)', //Center horizontally
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '85%',
        padding: '10px 0px',
        marginLeft: '-10px',
        backgroundColor: '#f7f7f8', // light background color
        zIndex: 1000,//Ensure it stays on top of other elements
},
searchInput: {
    width: '90%', // width for iPhone 12 view
    padding: '12px 16px',
    borderRadius: '25px',
    border: '1px solid #ddd',
    outline: 'none',
    fontSize: '16px',
    backgroundColor: '#ffffff',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)', // subtle shadow for depth
},

circleIconContainer: {
    position: 'absolute', // Position the circle relative to the container
    right: '-29px', // Position it inside the container towards the right
    top: '50%', // Center vertically
    transform: 'translateY(-50%)', // Adjust for exact vertical centering
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    
  },
  circleIcon: {
    width: '40px', // Set the size of the circle
    height: '40px',
    borderRadius: '50%', // Make it a circle
    objectFit: 'cover', // Ensure the image fits the circle perfectly
    cursor: 'pointer', // Add a pointer cursor for interactivity
    
  },
};




export default ActionButtons;