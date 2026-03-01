/**
 * Layout — Sidebar + Main content with responsive hamburger menu.
 */

import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificacionesAPI } from '../services/api';
import {
    MdDashboard, MdInventory, MdShoppingCart, MdFactory,
    MdReceipt, MdUploadFile, MdMenu, MdClose, MdLogout,
    MdMenuBook, MdPointOfSale, MdNotifications, MdNotificationsNone
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
    const [notifOpen, setNotifOpen] = useState(false);
    const [notificaciones, setNotificaciones] = useState([]);
    const [conteoNotif, setConteoNotif] = useState(0);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const cargarNotificaciones = () => {
        if (!user) return;
        notificacionesAPI.conteo().then(r => setConteoNotif(r.data.count));
        notificacionesAPI.listar().then(r => setNotificaciones(r.data));
    };

    useEffect(() => {
        cargarNotificaciones();
        const interval = setInterval(cargarNotificaciones, 60000); // Polling cada minuto
        return () => clearInterval(interval);
    }, [user]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const marcarLeida = async (id) => {
        await notificacionesAPI.leer([id]);
        cargarNotificaciones();
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
                <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span className="logo">🏭</span>
                        <h2>Inventario</h2>
                    </div>
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
                            <div className="notification-bell-container" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                                <button className="notification-bell" onClick={() => setNotifOpen(!notifOpen)}>
                                    {conteoNotif > 0 ? <MdNotifications className="text-danger" /> : <MdNotificationsNone />}
                                    {conteoNotif > 0 && <span className="notification-badge">{conteoNotif}</span>}
                                </button>
                                {notifOpen && (
                                    <div className="notification-panel" style={{ bottom: '100%', top: 'auto', left: '0', marginBottom: '0.5rem', width: '250px' }}>
                                        <div className="notification-title">Notificaciones</div>
                                        <div className="notification-list">
                                            {notificaciones.length === 0 ? (
                                                <div className="notification-empty">No tienes notificaciones pendientes.</div>
                                            ) : (
                                                notificaciones.map(n => (
                                                    <div key={n.id} className="notification-item" onClick={() => marcarLeida(n.id)}>
                                                        <strong style={{ display: 'block', fontSize: '0.85rem' }}>{n.titulo}</strong>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{n.mensaje}</span>
                                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                                            {new Date(n.fecha).toLocaleDateString()} {new Date(n.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
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
