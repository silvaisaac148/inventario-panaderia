/**
 * Ventas — registrar ventas y descontar stock de productos.
 */

import { useState, useEffect } from 'react';
import { ventasAPI, productosAPI } from '../services/api';
import { MdPointOfSale } from 'react-icons/md';

export default function Ventas() {
    const [productos, setProductos] = useState([]);
    const [historial, setHistorial] = useState([]);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState(null);
    const [form, setForm] = useState({ producto_id: '', cantidad: 1, precio_unitario: '', nota: '' });

    const cargar = async () => {
        setLoading(true);
        try {
            const [p, h] = await Promise.all([productosAPI.listar(), ventasAPI.historial()]);
            setProductos(p.data);
            setHistorial(h.data);
        } catch { setMsg({ tipo: 'danger', texto: 'Error al cargar datos' }); }
        setLoading(false);
    };

    useEffect(() => { cargar(); }, []);

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
            cargar();
        } catch (err) {
            setMsg({ tipo: 'danger', texto: err.response?.data?.detail || 'Error al registrar venta' });
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
                <div className="table-container">
                    <table>
                        <thead><tr><th>Fecha</th><th>Producto</th><th>Cantidad</th><th>Precio Unit.</th><th>Total</th></tr></thead>
                        <tbody>
                            {historial.length === 0 ? (
                                <tr><td colSpan={5} className="empty-state">Sin ventas aún</td></tr>
                            ) : historial.map((v) => (
                                <tr key={v.id}>
                                    <td>{new Date(v.fecha).toLocaleDateString()}</td>
                                    <td><strong>{v.producto_nombre}</strong></td>
                                    <td>{v.cantidad}</td>
                                    <td>${parseFloat(v.precio_unitario).toFixed(2)}</td>
                                    <td><strong>${parseFloat(v.total).toFixed(2)}</strong></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
