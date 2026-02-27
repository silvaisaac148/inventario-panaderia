/**
 * Dashboard — Métricas principales del sistema.
 */

import { useState, useEffect } from 'react';
import { reportesAPI, ingredientesAPI } from '../services/api';
import {
    MdInventory, MdShoppingCart, MdFactory, MdPointOfSale,
    MdWarning, MdAttachMoney,
} from 'react-icons/md';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

const COLORS = ['#6c5ce7', '#00cec9', '#fdcb6e', '#ff6b6b', '#74b9ff', '#a29bfe'];

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [alertas, setAlertas] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            reportesAPI.dashboard(),
            ingredientesAPI.alertas(),
        ])
            .then(([statsRes, alertasRes]) => {
                setStats(statsRes.data);
                setAlertas(alertasRes.data);
            })
            .catch(() => {
                setStats({
                    total_ingredientes: 0, total_productos: 0, alertas_stock: 0,
                    total_producciones: 0, total_ventas: 0, valor_ventas: 0,
                    valor_inventario_ingredientes: 0, valor_inventario_productos: 0,
                    valor_inventario_total: 0,
                });
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    const inventarioData = [
        { name: 'Ingredientes', valor: stats?.valor_inventario_ingredientes || 0 },
        { name: 'Productos', valor: stats?.valor_inventario_productos || 0 },
    ];

    const resumenData = [
        { name: 'Ingredientes', cantidad: stats?.total_ingredientes || 0 },
        { name: 'Productos', cantidad: stats?.total_productos || 0 },
        { name: 'Producciones', cantidad: stats?.total_producciones || 0 },
        { name: 'Ventas', cantidad: stats?.total_ventas || 0 },
    ];

    return (
        <div>
            <div className="page-header">
                <h1>📊 Dashboard</h1>
                <p>Resumen general del sistema</p>
            </div>

            {/* Stat Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon purple"><MdInventory /></div>
                    <div className="stat-info">
                        <h3>{stats?.total_ingredientes || 0}</h3>
                        <p>Ingredientes</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green"><MdShoppingCart /></div>
                    <div className="stat-info">
                        <h3>{stats?.total_productos || 0}</h3>
                        <p>Productos</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon blue"><MdFactory /></div>
                    <div className="stat-info">
                        <h3>{stats?.total_producciones || 0}</h3>
                        <p>Producciones</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon yellow"><MdPointOfSale /></div>
                    <div className="stat-info">
                        <h3>{stats?.total_ventas || 0}</h3>
                        <p>Ventas</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon red"><MdWarning /></div>
                    <div className="stat-info">
                        <h3>{stats?.alertas_stock || 0}</h3>
                        <p>Alertas Stock</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green"><MdAttachMoney /></div>
                    <div className="stat-info">
                        <h3>${(stats?.valor_inventario_total || 0).toLocaleString()}</h3>
                        <p>Valor Inventario</p>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="card">
                    <h3 className="section-title">📈 Resumen General</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={resumenData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2d3250" />
                            <XAxis dataKey="name" stroke="#8b90a0" fontSize={12} />
                            <YAxis stroke="#8b90a0" fontSize={12} />
                            <Tooltip
                                contentStyle={{ background: '#1e2235', border: '1px solid #2d3250', borderRadius: '8px' }}
                                labelStyle={{ color: '#e8eaf0' }}
                            />
                            <Bar dataKey="cantidad" fill="#6c5ce7" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="card">
                    <h3 className="section-title">💰 Valor del Inventario</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={inventarioData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={5}
                                dataKey="valor"
                                label={({ name, valor }) => `${name}: $${valor.toLocaleString()}`}
                            >
                                {inventarioData.map((entry, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ background: '#1e2235', border: '1px solid #2d3250', borderRadius: '8px' }}
                                formatter={(value) => `$${value.toLocaleString()}`}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Alertas de Stock */}
            {alertas.length > 0 && (
                <div className="card">
                    <h3 className="section-title">⚠️ Alertas de Stock Bajo</h3>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Ingrediente</th>
                                    <th>Stock Actual</th>
                                    <th>Stock Mínimo</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {alertas.map((a) => (
                                    <tr key={a.id}>
                                        <td><strong>{a.nombre}</strong></td>
                                        <td>{a.stock_actual} {a.unidad_medida}</td>
                                        <td>{a.stock_minimo} {a.unidad_medida}</td>
                                        <td><span className="badge badge-danger">⚠️ BAJO</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
