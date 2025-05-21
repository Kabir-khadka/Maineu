'use client';

import SplitLayout from '@/components/Layout/SplitLayout';
import AdminSidebar from '@/components/Layout/AdminSidebar';

export default function AdminPage() {
  return (
    <SplitLayout sidebar={<AdminSidebar />}>
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-lg mb-4">Welcome to the admin dashboard!</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {/* Dashboard cards/widgets can go here */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <h3 className="font-medium text-lg text-blue-800">Recent Orders</h3>
            <p className="text-gray-600">Manage your latest customer orders</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg border border-green-100">
            <h3 className="font-medium text-lg text-green-800">Menu Items</h3>
            <p className="text-gray-600">You have 24 active menu items</p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
            <h3 className="font-medium text-lg text-purple-800">Categories</h3>
            <p className="text-gray-600">Manage your 8 product categories</p>
          </div>
        </div>
      </div>
    </SplitLayout>
  );
}