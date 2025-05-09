'use client';

import Link from 'next/link';

export default function AdminDashboard() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <ul className="space-y-4">
        <li>
          <Link href="/menu-management" className="text-blue-600 hover:underline text-xl">
            🍽️ Manage Menu Items
          </Link>
        </li>
        <li>
          <Link href="/category-management" className="text-blue-600 hover:underline text-xl">
            📂 Manage Categories
          </Link>
        </li>
      </ul>
    </div>
  );
}
