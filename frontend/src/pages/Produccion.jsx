/**
 * Producción — seleccionar receta, verificar stock, producir.
 */

import { useState, useEffect } from 'react';
import { produccionAPI, recetasAPI } from '../services/api';
import { MdFactory, MdCheckCircle } from 'react-icons/md';

export default function Produccion() {
    const [recetas, setRecetas] = useState([]);
    const [historial, setHistorial] = useState([]);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState(null);
    const [form, setForm] = useState({ receta_id: '', cantidad_producida: 1 });
    const [verificacion, setVerificacion] = useState(null);
    const [resultado, setResultado] = useState(null);

    useEffect(() => {
        Promise.all([recetasAPI.listar(), produccionAPI.historial()])
            .then(([r, h]) => { setRecetas(r.data); setHistorial(h.data); })
            .catch(() => setMsg({ tipo: 'danger', texto: 'Error al cargar datos' }))
            .finally(() => setLoading(false));
    }, []);

    const verificar = async () => {
        if (!form.receta_id) return;
        try {
            const res = await produccionAPI.verificar(form);
            setVerificacion(res.data);
            setResultado(null);
        } catch (err) { setMsg({ tipo: 'danger', texto: err.response?.data?.detail || 'Error' }); }
    };

    const producir = async () => {
        try {
            const res = await produccionAPI.producir(form);
            setResultado(res.data);
            setVerificacion(null);
            setMsg({ tipo: 'success', texto: `✅ Producción completada: ${res.data.cantidad_producida} unidades` });
            // Recargar historial
            const h = await produccionAPI.historial();
            setHistorial(h.data);
        } catch (err) {
            setMsg({ tipo: 'danger', texto: err.response?.data?.detail || 'Error en producción' });
        }
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div>
            <div className="page-header">
                <h1>🏭 Producción</h1>
                <p>Producir productos y descontar ingredientes automáticamente</p>
            </div>

            {msg && (
                <div className={`alert alert-${msg.tipo}`}>{msg.texto}
                    <button onClick={() => setMsg(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
                </div>
            )}

            {/* Formulario de producción */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 className="section-title"><MdFactory /> Nueva Producción</h3>
                <div className="form-row">
                    <div className="form-group">
                        <label>Receta</label>
                        <select value={form.receta_id} onChange={(e) => { setForm({ ...form, receta_id: e.target.value }); setVerificacion(null); setResultado(null); }}>
                            <option value="">Seleccionar receta...</option>
                            {recetas.map((r) => (
                                <option key={r.id} value={r.id}>{r.nombre} ({r.producto_nombre}) — rinde {r.rendimiento}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Cantidad a producir</label>
                        <input type="number" min="1" value={form.cantidad_producida} onChange={(e) => setForm({ ...form, cantidad_producida: parseInt(e.target.value) || 1 })} />
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button className="btn btn-outline" onClick={verificar} disabled={!form.receta_id}>
                        🔍 Verificar Stock
                    </button>
                    <button className="btn btn-primary" onClick={producir} disabled={!form.receta_id || (verificacion && !verificacion.puede_producir)}>
                        <MdFactory /> Producir
                    </button>
                </div>
            </div>

            {/* Verificación de stock */}
            {verificacion && (
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h3 className="section-title">
                        {verificacion.puede_producir ? '✅ Stock Suficiente' : '❌ Stock Insuficiente'}
                    </h3>
                    <div className="table-container">
                        <table>
                            <thead><tr><th>Ingrediente</th><th>Necesario</th><th>Disponible</th><th>Estado</th></tr></thead>
                            <tbody>
                                {verificacion.ingredientes_ok?.map((i, idx) => (
                                    <tr key={idx}>
                                        <td>{i.ingrediente}</td>
                                        <td>{i.necesario} {i.unidad}</td>
                                        <td>{i.disponible} {i.unidad}</td>
                                        <td><span className="badge badge-success">✅ OK</span></td>
                                    </tr>
                                ))}
                                {verificacion.ingredientes_faltantes?.map((i, idx) => (
                                    <tr key={`f-${idx}`}>
                                        <td>{i.ingrediente}</td>
                                        <td>{i.necesario} {i.unidad}</td>
                                        <td>{i.disponible} {i.unidad}</td>
                                        <td><span className="badge badge-danger">⚠️ Falta {i.faltante} {i.unidad}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Resultado de producción */}
            {resultado && (
                <div className="card" style={{ marginBottom: '2rem', border: '1px solid rgba(0, 206, 201, 0.3)' }}>
                    <h3 className="section-title"><MdCheckCircle style={{ color: 'var(--success)' }} /> Producción Completada</h3>
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                        <div className="stat-card">
                            <div className="stat-info"><h3>{resultado.cantidad_producida}</h3><p>Unidades</p></div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-info"><h3>${resultado.costo_total?.toFixed(2)}</h3><p>Costo Total</p></div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-info"><h3>${resultado.costo_unitario?.toFixed(2)}</h3><p>Costo Unitario</p></div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-info"><h3>{resultado.stock_producto}</h3><p>Stock Producto</p></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Historial */}
            <div className="section">
                <h3 className="section-title">📋 Historial de Producciones</h3>
                <div className="table-container">
                    <table>
                        <thead><tr><th>Fecha</th><th>Receta</th><th>Producto</th><th>Cantidad</th><th>Costo</th></tr></thead>
                        <tbody>
                            {historial.length === 0 ? (
                                <tr><td colSpan={5} className="empty-state">Sin producciones aún</td></tr>
                            ) : historial.map((p) => (
                                <tr key={p.id}>
                                    <td>{new Date(p.fecha).toLocaleDateString()}</td>
                                    <td>{p.receta_nombre}</td>
                                    <td>{p.producto_nombre}</td>
                                    <td>{p.cantidad_producida} und</td>
                                    <td>${parseFloat(p.costo_total).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
