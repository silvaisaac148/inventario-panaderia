/**
 * Ventas — registrar, editar y anular ventas de productos.
 */

import { useState, useEffect } from 'react';
import { ventasAPI, productosAPI } from '../services/api';
import { MdPointOfSale, MdFilterList, MdEdit, MdCancel } from 'react-icons/md';

export default function Ventas() {
    const [productos, setProductos] = useState([]);
    const [historial, setHistorial] = useState([]);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState(null);
    const [form, setForm] = useState({ producto_id: '', cantidad: 1, precio_unitario: '', nota: '' });

    // Filtros de fecha
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');

    // Modal de edición
    const [editModal, setEditModal] = useState(null);
    const [editForm, setEditForm] = useState({ cantidad: 1, precio_unitario: '', nota: '' });

    // Modal de confirmación de anulación
    const [anularModal, setAnularModal] = useState(null);

    const cargar = async (desde, hasta) => {
        setLoading(true);
        try {
            const params = {};
            if (desde) params.fecha_desde = new Date(desde + 'T00:00:00').toISOString();
            if (hasta) params.fecha_hasta = new Date(hasta + 'T23:59:59').toISOString();
            const [p, h] = await Promise.all([productosAPI.listar(), ventasAPI.historial(params)]);
            setProductos(p.data);
            setHistorial(h.data);
        } catch { setMsg({ tipo: 'danger', texto: 'Error al cargar datos' }); }
        setLoading(false);
    };

    useEffect(() => { cargar(fechaDesde, fechaHasta); }, []);

    const aplicarFiltro = () => cargar(fechaDesde, fechaHasta);
    const limpiarFiltro = () => { setFechaDesde(''); setFechaHasta(''); cargar('', ''); };

    const setPreset = (dias) => {
        const hasta = new Date();
        const desde = new Date();
        desde.setDate(desde.getDate() - dias);
        const d = desde.toISOString().split('T')[0];
        const h = hasta.toISOString().split('T')[0];
        setFechaDesde(d);
        setFechaHasta(h);
        cargar(d, h);
    };

    const productoSelec = productos.find(p => p.id === form.producto_id);
    const precioFinal = form.precio_unitario ? parseFloat(form.precio_unitario) : (productoSelec?.precio_venta || 0);
    const total = precioFinal * (parseInt(form.cantidad) || 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = {
                producto_id: form.producto_id,
                cantidad: parseInt(form.cantidad),
                precio_unitario: form.precio_unitario ? parseFloat(form.precio_unitario) : null,
                nota: form.nota || null,
            };
            const res = await ventasAPI.registrar(data);
            setMsg({ tipo: 'success', texto: `✅ Venta: ${res.data.cantidad}x ${res.data.producto} = $${res.data.total.toFixed(2)}` });
            setForm({ producto_id: '', cantidad: 1, precio_unitario: '', nota: '' });
            cargar(fechaDesde, fechaHasta);
        } catch (err) {
            setMsg({ tipo: 'danger', texto: err.response?.data?.detail || 'Error al registrar venta' });
        }
    };

    // Abrir modal de edición
    const abrirEditar = (venta) => {
        setEditForm({
            cantidad: venta.cantidad,
            precio_unitario: venta.precio_unitario,
            nota: venta.nota || '',
        });
        setEditModal(venta);
    };

    // Guardar edición
    const guardarEdicion = async () => {
        try {
            const data = {
                cantidad: parseInt(editForm.cantidad),
                precio_unitario: editForm.precio_unitario ? parseFloat(editForm.precio_unitario) : null,
                nota: editForm.nota || null,
            };
            const res = await ventasAPI.editar(editModal.id, data);
            setMsg({ tipo: 'success', texto: `✅ Venta editada: ${res.data.cantidad}x ${res.data.producto} = $${res.data.total.toFixed(2)}` });
            setEditModal(null);
            cargar(fechaDesde, fechaHasta);
        } catch (err) {
            setMsg({ tipo: 'danger', texto: err.response?.data?.detail || 'Error al editar venta' });
        }
    };

    // Anular venta
    const confirmarAnular = async () => {
        try {
            const res = await ventasAPI.anular(anularModal.id);
            setMsg({ tipo: 'success', texto: `✅ Venta anulada. Se devolvieron ${res.data.cantidad_devuelta} unidades de ${res.data.producto} al stock.` });
            setAnularModal(null);
            cargar(fechaDesde, fechaHasta);
        } catch (err) {
            setMsg({ tipo: 'danger', texto: err.response?.data?.detail || 'Error al anular venta' });
        }
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div>
            <div className="page-header">
                <h1>🛒 Ventas</h1>
                <p>Registrar ventas de productos terminados</p>
            </div>

            {msg && (
                <div className={`alert alert-${msg.tipo}`}>{msg.texto}
                    <button onClick={() => setMsg(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
                </div>
            )}

            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 className="section-title"><MdPointOfSale /> Nueva Venta</h3>
                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Producto</label>
                            <select value={form.producto_id} onChange={(e) => setForm({ ...form, producto_id: e.target.value })} required>
                                <option value="">Seleccionar...</option>
                                {productos.map((p) => (
                                    <option key={p.id} value={p.id}>{p.nombre} (stock: {parseFloat(p.stock_actual).toFixed(0)}) — ${parseFloat(p.precio_venta).toFixed(2)}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Cantidad</label>
                            <input type="number" min="1" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label>Precio unit. (opcional)</label>
                            <input type="number" step="0.01" min="0" value={form.precio_unitario} onChange={(e) => setForm({ ...form, precio_unitario: e.target.value })} placeholder={productoSelec ? `Default: $${parseFloat(productoSelec.precio_venta).toFixed(2)}` : ''} />
                        </div>
                    </div>
                    {total > 0 && (
                        <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
                            💰 Total: <strong>${total.toFixed(2)}</strong> ({form.cantidad} × ${precioFinal.toFixed(2)})
                        </div>
                    )}
                    <div className="form-group">
                        <label>Nota (opcional)</label>
                        <input value={form.nota} onChange={(e) => setForm({ ...form, nota: e.target.value })} placeholder="Ej: Venta mostrador" />
                    </div>
                    <button type="submit" className="btn btn-success" disabled={!form.producto_id}>
                        <MdPointOfSale /> Registrar Venta
                    </button>
                </form>
            </div>

            <div className="section">
                <h3 className="section-title">📋 Historial de Ventas</h3>

                {/* Filtros de fecha */}
                <div className="card" style={{ marginBottom: '1rem', padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                        <MdFilterList style={{ color: 'var(--accent-secondary)' }} />
                        <strong style={{ fontSize: '0.85rem' }}>Filtrar por fecha</strong>
                        <div style={{ display: 'flex', gap: '0.35rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
                            <button className="btn btn-outline btn-sm" onClick={() => setPreset(0)}>Hoy</button>
                            <button className="btn btn-outline btn-sm" onClick={() => setPreset(7)}>7 días</button>
                            <button className="btn btn-outline btn-sm" onClick={() => setPreset(30)}>30 días</button>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div className="form-group" style={{ marginBottom: 0, flex: '1 1 150px' }}>
                            <label>Desde</label>
                            <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0, flex: '1 1 150px' }}>
                            <label>Hasta</label>
                            <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={aplicarFiltro}>Filtrar</button>
                        {(fechaDesde || fechaHasta) && (
                            <button className="btn btn-outline btn-sm" onClick={limpiarFiltro}>Limpiar</button>
                        )}
                    </div>
                </div>

                <div className="table-container">
                    <table>
                        <thead><tr><th>Fecha</th><th>Producto</th><th>Cantidad</th><th>Precio Unit.</th><th>Total</th><th>Estado</th><th>Acciones</th></tr></thead>
                        <tbody>
                            {historial.length === 0 ? (
                                <tr><td colSpan={7} className="empty-state">Sin ventas en este período</td></tr>
                            ) : historial.map((v) => {
                                const anulada = v.estado === 'ANULADA';
                                return (
                                    <tr key={v.id} style={anulada ? { opacity: 0.5, textDecoration: 'line-through' } : {}}>
                                        <td>{new Date(v.fecha).toLocaleDateString()}</td>
                                        <td><strong>{v.producto_nombre}</strong></td>
                                        <td>{v.cantidad}</td>
                                        <td>${parseFloat(v.precio_unitario).toFixed(2)}</td>
                                        <td><strong>${parseFloat(v.total).toFixed(2)}</strong></td>
                                        <td>
                                            <span className={`badge ${anulada ? 'badge-danger' : 'badge-success'}`}>
                                                {v.estado || 'ACTIVA'}
                                            </span>
                                        </td>
                                        <td>
                                            {!anulada && (
                                                <div style={{ display: 'flex', gap: '0.35rem' }}>
                                                    <button className="btn btn-outline btn-sm" onClick={() => abrirEditar(v)} title="Editar">
                                                        <MdEdit />
                                                    </button>
                                                    <button className="btn btn-danger btn-sm" onClick={() => setAnularModal(v)} title="Anular">
                                                        <MdCancel />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de edición */}
            {editModal && (
                <div className="modal-overlay" onClick={() => setEditModal(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>✏️ Editar Venta</h2>
                            <button className="close-btn" onClick={() => setEditModal(null)}>✕</button>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                            Producto: <strong>{editModal.producto_nombre}</strong>
                        </p>
                        <div className="form-group">
                            <label>Cantidad</label>
                            <input type="number" min="1" value={editForm.cantidad} onChange={(e) => setEditForm({ ...editForm, cantidad: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Precio Unitario</label>
                            <input type="number" step="0.01" min="0" value={editForm.precio_unitario} onChange={(e) => setEditForm({ ...editForm, precio_unitario: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Nota</label>
                            <input value={editForm.nota} onChange={(e) => setEditForm({ ...editForm, nota: e.target.value })} />
                        </div>
                        {editForm.cantidad && editForm.precio_unitario && (
                            <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
                                💰 Nuevo total: <strong>${(parseFloat(editForm.cantidad) * parseFloat(editForm.precio_unitario)).toFixed(2)}</strong>
                            </div>
                        )}
                        <div className="modal-actions">
                            <button className="btn btn-outline" onClick={() => setEditModal(null)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={guardarEdicion}>Guardar Cambios</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de confirmación de anulación */}
            {anularModal && (
                <div className="modal-overlay" onClick={() => setAnularModal(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>⚠️ Anular Venta</h2>
                            <button className="close-btn" onClick={() => setAnularModal(null)}>✕</button>
                        </div>
                        <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
                            ¿Estás seguro de anular esta venta?
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                            <strong>{anularModal.producto_nombre}</strong> — {anularModal.cantidad} unidades × ${parseFloat(anularModal.precio_unitario).toFixed(2)} = <strong>${parseFloat(anularModal.total).toFixed(2)}</strong>
                        </p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>
                            Se devolverán <strong>{anularModal.cantidad} unidades</strong> al stock del producto.
                        </p>
                        <div className="modal-actions">
                            <button className="btn btn-outline" onClick={() => setAnularModal(null)}>Cancelar</button>
                            <button className="btn btn-danger" onClick={confirmarAnular}>Anular Venta</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
