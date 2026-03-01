/**
 * Dashboard — Métricas principales, ganancias del mes, tendencias y actividad reciente.
 */

import { useState, useEffect } from 'react';
import { reportesAPI, ingredientesAPI } from '../services/api';
import {
    MdInventory, MdShoppingCart, MdFactory, MdPointOfSale,
    MdWarning, MdAttachMoney, MdTrendingUp, MdTrendingDown, MdDeleteForever
} from 'react-icons/md';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart,
} from 'recharts';

const COLORS = ['#6c5ce7', '#00cec9', '#fdcb6e', '#ff6b6b', '#74b9ff', '#a29bfe'];

const TIPO_BADGE = {
    COMPRA: 'badge-success',
    PRODUCCION: 'badge-warning',
    AJUSTE: 'badge-info',
    MERMA: 'badge-danger',
};

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [alertas, setAlertas] = useState([]);
    const [ganancias, setGanancias] = useState(null);
    const [tendencias, setTendencias] = useState(null);
    const [actividad, setActividad] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Cargar ganancias del mes actual
        const ahora = new Date();
        const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        const paramsGanancias = {
            fecha_desde: inicioMes.toISOString(),
            fecha_hasta: ahora.toISOString(),
        };

        Promise.all([
            reportesAPI.dashboard(),
            ingredientesAPI.alertas(),
            reportesAPI.ganancias(paramsGanancias),
            reportesAPI.tendencias({ dias: 30 }),
            reportesAPI.actividadReciente({ limit: 8 }),
        ])
            .then(([statsRes, alertasRes, gananciasRes, tendenciasRes, actividadRes]) => {
                setStats(statsRes.data);
                setAlertas(alertasRes.data);
                setGanancias(gananciasRes.data);
                setTendencias(tendenciasRes.data);
                setActividad(actividadRes.data);
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

    // Formatear datos de tendencias para el gráfico
    const ventasDiarias = (tendencias?.ventas_por_dia || []).map((d) => ({
        dia: new Date(d.dia).toLocaleDateString('es', { day: '2-digit', month: 'short' }),
        total: d.total,
        ventas: d.num_ventas,
    }));

    const gananciaTotal = ganancias?.ganancia_total || 0;
    const margen = ganancias?.margen_promedio || 0;

    const handleResetDB = async () => {
        if (!window.confirm("⚠️ PELIGRO: Esto borrará TODO el historial de ventas, producción, recetas, productos e ingredientes para empezar desde cero. ¿Estás absolutamente seguro?")) return;

        setLoading(true);
        try {
            await reportesAPI.resetDB();
            window.location.reload(); // Recargar para limpiar todo el estado
        } catch (err) {
            alert("Error al restablecer la base de datos.");
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>📊 Dashboard</h1>
                    <p>Resumen general del sistema</p>
                </div>
                <button
                    onClick={handleResetDB}
                    className="btn btn-danger"
                    title="Restaurar base de datos a 0"
                >
                    <MdDeleteForever /> Vaciar Sistema
                </button>
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

            {/* Ganancias del Mes */}
            {ganancias && (
                <div style={{ marginBottom: '2rem' }}>
                    <h3 className="section-title">💰 Ganancias del Mes</h3>
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                        <div className="stat-card" style={{ borderLeft: '3px solid var(--success)' }}>
                            <div className="stat-info">
                                <h3>${(ganancias.total_ingresos || 0).toLocaleString()}</h3>
                                <p>Ingresos</p>
                            </div>
                        </div>
                        <div className="stat-card" style={{ borderLeft: '3px solid var(--danger)' }}>
                            <div className="stat-info">
                                <h3>${(ganancias.total_costos || 0).toLocaleString()}</h3>
                                <p>Costos</p>
                            </div>
                        </div>
                        <div className="stat-card" style={{ borderLeft: `3px solid ${gananciaTotal >= 0 ? 'var(--success)' : 'var(--danger)'}` }}>
                            <div className="stat-info" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div>
                                    <h3 style={{ color: gananciaTotal >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                        ${gananciaTotal.toLocaleString()}
                                    </h3>
                                    <p>Ganancia</p>
                                </div>
                                {gananciaTotal >= 0 ? <MdTrendingUp style={{ fontSize: '1.5rem', color: 'var(--success)' }} /> : <MdTrendingDown style={{ fontSize: '1.5rem', color: 'var(--danger)' }} />}
                            </div>
                        </div>
                        <div className="stat-card" style={{ borderLeft: `3px solid ${margen > 30 ? 'var(--success)' : margen > 0 ? 'var(--warning)' : 'var(--danger)'}` }}>
                            <div className="stat-info">
                                <h3>{margen}%</h3>
                                <p>Margen Promedio</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Charts Row 1 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {/* Tendencia de Ventas */}
                <div className="card">
                    <h3 className="section-title">📈 Tendencia de Ventas (30 días)</h3>
                    {ventasDiarias.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={ventasDiarias}>
                                <defs>
                                    <linearGradient id="colorVenta" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6c5ce7" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6c5ce7" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2d3250" />
                                <XAxis dataKey="dia" stroke="#8b90a0" fontSize={11} />
                                <YAxis stroke="#8b90a0" fontSize={12} />
                                <Tooltip
                                    contentStyle={{ background: '#1e2235', border: '1px solid #2d3250', borderRadius: '8px' }}
                                    labelStyle={{ color: '#e8eaf0' }}
                                    formatter={(value) => [`$${value.toLocaleString()}`, 'Total']}
                                />
                                <Area type="monotone" dataKey="total" stroke="#6c5ce7" fillOpacity={1} fill="url(#colorVenta)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="empty-state">Sin datos de ventas para este período</div>
                    )}
                </div>

                {/* Valor del Inventario */}
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

            {/* Charts Row 2 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {/* Top Productos */}
                {tendencias?.top_productos?.length > 0 && (
                    <div className="card">
                        <h3 className="section-title">🏆 Top Productos (30 días)</h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={tendencias.top_productos} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#2d3250" />
                                <XAxis type="number" stroke="#8b90a0" fontSize={12} />
                                <YAxis dataKey="producto" type="category" stroke="#8b90a0" fontSize={11} width={100} />
                                <Tooltip
                                    contentStyle={{ background: '#1e2235', border: '1px solid #2d3250', borderRadius: '8px' }}
                                    labelStyle={{ color: '#e8eaf0' }}
                                    formatter={(value) => [`$${value.toLocaleString()}`, 'Ingresos']}
                                />
                                <Bar dataKey="ingresos" fill="#00cec9" radius={[0, 6, 6, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Resumen General */}
                <div className="card">
                    <h3 className="section-title">📊 Resumen General</h3>
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
            </div>

            {/* Actividad Reciente */}
            {actividad.length > 0 && (
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h3 className="section-title">🕐 Actividad Reciente</h3>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Tipo</th>
                                    <th>Ingrediente</th>
                                    <th>Cantidad</th>
                                    <th>Referencia</th>
                                </tr>
                            </thead>
                            <tbody>
                                {actividad.map((a) => (
                                    <tr key={a.id}>
                                        <td>{new Date(a.fecha).toLocaleDateString()}</td>
                                        <td>
                                            <span className={`badge ${TIPO_BADGE[a.tipo] || 'badge-info'}`}>
                                                {a.tipo}
                                            </span>
                                        </td>
                                        <td><strong>{a.ingrediente}</strong></td>
                                        <td style={{ color: a.cantidad >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                            {a.cantidad >= 0 ? '+' : ''}{parseFloat(a.cantidad).toFixed(2)}
                                        </td>
                                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{a.referencia}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

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
