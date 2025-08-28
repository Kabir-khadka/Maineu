Maineu: A Comprehensive Restaurant Management System
Maineu is a full-stack restaurant management system designed to streamline operations for restaurants of all sizes. It provides a seamless experience for customers to place orders and powerful tools for administrators and kitchen staff to manage the entire workflow, from order placement to delivery and payment.

✨ Features
Maineu is divided into three interconnected panels, each tailored to specific user needs:

📱 Customer Panel
1.Online Ordering: Customers can browse the menu, add items to their cart, and place orders directly from their mobile devices.

2.Real-time Updates: Track order status (e.g., In Progress, Delivered) in real time.

3.Order Management: Customers can edit, update, or cancel their orders before they are fulfilled.

4.Table QR Codes: Easily access the digital menu by scanning a QR code on the table.

💻 Admin Panel
1.Centralized Control: A comprehensive dashboard to manage all restaurant operations.

2.Order Fulfillment: View and manage all incoming orders, update their status, and ensure timely delivery.

3.Menu Management: Add, edit, and delete food items, manage categories, and update prices.

4.Table Management: Create and manage tables, generate unique QR codes for each, and track table occupancy.

5.Analytics: Access daily sales reports and other key business metrics.

👨‍🍳 Kitchen Panel
1.Real-time Order Feed: Automatically fetches and displays new order entries as they are placed.

2.Streamlined Workflow: A clean, focused interface for kitchen staff to view and manage orders efficiently.

3.Status Updates: Mark orders as "Done" with a single click, notifying other panels that the order is complete.

4.Order Details: View detailed information for each order, including items, quantities, and special notes.

📸 Demo
To truly see how Maineu works, check out these screenshots from the application's user interfaces.

Customer Panel
Kitchen Panel
Admin Panel


🚀 Technologies
Maineu is built using a modern and scalable tech stack:

1.Frontend: React.js with Next.js for a high-performance, server-rendered application.

2.Styling: Tailwind CSS for rapid and responsive UI development.

3.Backend: Node.js and Express.js for a robust and scalable server.

4.Database: MongoDB for flexible data storage.

5.Real-time Communication: Socket.io for instant updates between the customer, kitchen, and admin panels.

📦 Getting Started
Prerequisites
1.Node.js (v18 or higher)

2.MongoDB Atlas account

3.npm

Installation
Clone the repository:
git clone https://github.com/Kabir-khadka/maineu.git
cd maineu

Install dependencies for the backend:
cd backend
npm install

Install dependencies for the frontend:
cd ../frontend
npm install

Configuration
Create a .env file in the backend directory with your MongoDB connection string and other secrets:

MONGO_URI=your_mongodb_connection_string
PORT=5000

Running the Application
Start the backend server:

cd backend
npm start

Start the frontend development server:

cd ../frontend
npm run dev

The application should now be running on http://localhost:3000.

🤝 Contributing
We welcome contributions! If you have suggestions for improvements, please feel free to open an issue or create a pull request.
