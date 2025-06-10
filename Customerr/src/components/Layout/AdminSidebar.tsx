'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navLinks = [
    { href: '/Overview', label: 'Overview' },
    { href: '/menu-management', label: 'Menu Manager'},
    { href: '/category-management', label: 'Category Manager' },
    { href: '/adminsideorders', label: 'Orders' },
    { href: '/table-management', label: 'Table Manager' },
    { href: '/logout', label: 'Logout' },

];

export default function AdminSidebar() {
    const pathname = usePathname();

    return (
        <aside className="flex flex-col h-full p-6 bg-gray-900 text-white w-60">
            <h2 className="text-2xl font-bold mb-8 select-none">🍽️ Admin</h2>
            <nav className="flex flex-col space-y-2">
                {navLinks.map(({ href, label }) => {
                    const isActive = pathname === href;

                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`block rounded-md px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors ${
                                isActive ? 'bg-gray-700 text-white' : ''
                            }`}
                        >
                            {label}
                        </Link>
                    )
                })}
            </nav>
        </aside>
    )
}