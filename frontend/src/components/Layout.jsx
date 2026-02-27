/**
 * Layout — Sidebar + Main content with responsive hamburger menu.
 */

import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    MdDashboard, MdInventory, MdShoppingCart, MdFactory,
    MdReceipt, MdUploadFile, MdMenu, MdClose, MdLogout,
    MdMenuBook, MdPointOfSale,
} from 'react-icons/md';

const navItems = [
    { to: '/', icon: <MdDashboard />, label: 'Dashboard' },
    { to: '/ingredientes', icon: <MdInventory />, label: 'Ingredientes' },
    { to: '/productos', icon: <MdShoppingCart />, label: 'Productos' },
    { to: '/recetas', icon: <MdMenuBook />, label: 'Recetas' },
    { to: '/produccion', icon: <MdFactory />, label: 'Producción' },
    { to: '/ventas', icon: <MdPointOfSale />, label: 'Ventas' },
    { to: '/excel', icon: <MdUploadFile />, label: 'Excel' },
];

export default function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="app-layout">
            {/* Mobile hamburger */}
            <button
                className="mobile-toggle"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label="Toggle menu"
            >
                {sidebarOpen ? <MdClose /> : <MdMenu />}
            </button>

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <span className="logo">🏭</span>
                    <h2>Inventario</h2>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/'}
                            onClick={() => setSidebarOpen(false)}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    {user && (
                        <>
                            <div style={{ marginBottom: '0.5rem' }}>
                                <strong>{user.nombre}</strong>
                                <br />
                                <span>{user.rol}</span>
                            </div>
                            <button className="btn btn-outline btn-sm btn-block" onClick={handleLogout}>
                                <MdLogout /> Cerrar sesión
                            </button>
                        </>
                    )}
                </div>
            </aside>

            {/* Backdrop for mobile */}
            {sidebarOpen && (
                <div
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.5)', zIndex: 99,
                    }}
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main */}
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}
