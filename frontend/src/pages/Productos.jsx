/**
 * Productos — CRUD de productos terminados.
 */

import { useState, useEffect } from 'react';
import { productosAPI } from '../services/api';
import { MdAdd, MdEdit, MdDelete, MdClose } from 'react-icons/md';

export default function Productos() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);
    const [selected, setSelected] = useState(null);
    const [msg, setMsg] = useState(null);
    const [form, setForm] = useState({ nombre: '', precio_venta: 0, stock_minimo: 0 });

    const cargar = () => {
        setLoading(true);
        productosAPI.listar()
            .then((r) => setItems(r.data))
            .catch(() => setMsg({ tipo: 'danger', texto: 'Error al cargar productos' }))
            .finally(() => setLoading(false));
    };

    useEffect(() => { cargar(); }, []);

    const resetForm = () => { setForm({ nombre: '', precio_venta: 0, stock_minimo: 0 }); setSelected(null); setModal(null); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (modal === 'editar' && selected) {
                await productosAPI.actualizar(selected.id, form);
                setMsg({ tipo: 'success', texto: 'Producto actualizado' });
            } else {
                await productosAPI.crear(form);
                setMsg({ tipo: 'success', texto: 'Producto creado' });
            }
            resetForm(); cargar();
        } catch (err) {
            setMsg({ tipo: 'danger', texto: err.response?.data?.detail || 'Error al guardar' });
        }
    };

    const handleEliminar = async (item) => {
        if (!confirm(`¿Eliminar "${item.nombre}"?`)) return;
        try { await productosAPI.eliminar(item.id); setMsg({ tipo: 'success', texto: 'Producto eliminado' }); cargar(); }
        catch { setMsg({ tipo: 'danger', texto: 'Error al eliminar' }); }
    };

    const abrirEditar = (item) => {
        setSelected(item);
        setForm({ nombre: item.nombre, precio_venta: item.precio_venta, stock_minimo: item.stock_minimo });
        setModal('editar');
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div>
            <div className="page-header">
                <h1>🍞 Productos</h1>
                <p>Productos terminados para venta</p>
            </div>

            {msg && (
                <div className={`alert alert-${msg.tipo}`}>
                    {msg.texto}
                    <button onClick={() => setMsg(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
                </div>
            )}

            <div className="toolbar">
                <span style={{ color: 'var(--text-secondary)' }}>{items.length} productos</span>
                <button className="btn btn-primary" onClick={() => { resetForm(); setModal('crear'); }}>
                    <MdAdd /> Nuevo Producto
                </button>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Precio Venta</th>
                            <th>Costo Unit.</th>
                            <th>Margen</th>
                            <th>Stock</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 ? (
                            <tr><td colSpan={7} className="empty-state">No hay productos. ¡Crea el primero!</td></tr>
                        ) : items.map((item) => (
                            <tr key={item.id}>
                                <td><strong>{item.nombre}</strong></td>
                                <td>${parseFloat(item.precio_venta).toFixed(2)}</td>
                                <td>${parseFloat(item.costo_unitario).toFixed(2)}</td>
                                <td>
                                    <span className={`badge ${item.margen > 30 ? 'badge-success' : item.margen > 0 ? 'badge-warning' : 'badge-danger'}`}>
                                        {item.margen}%
                                    </span>
                                </td>
                                <td>{parseFloat(item.stock_actual).toFixed(0)}</td>
                                <td>
                                    {item.alerta_stock
                                        ? <span className="badge badge-danger">⚠️ Bajo</span>
                                        : <span className="badge badge-success">✅ OK</span>
                                    }
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                                        <button className="btn btn-outline btn-sm" onClick={() => abrirEditar(item)}><MdEdit /></button>
                                        <button className="btn btn-danger btn-sm" onClick={() => handleEliminar(item)}><MdDelete /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {modal && (
                <div className="modal-overlay" onClick={resetForm}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{modal === 'crear' ? '➕ Nuevo Producto' : '✏️ Editar Producto'}</h2>
                            <button className="close-btn" onClick={resetForm}><MdClose /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Nombre</label>
                                <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required placeholder="Ej: Pan Integral Fibra" />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Precio de venta ($)</label>
                                    <input type="number" step="0.01" min="0" value={form.precio_venta} onChange={(e) => setForm({ ...form, precio_venta: parseFloat(e.target.value) || 0 })} />
                                </div>
                                <div className="form-group">
                                    <label>Stock mínimo</label>
                                    <input type="number" step="1" min="0" value={form.stock_minimo} onChange={(e) => setForm({ ...form, stock_minimo: parseFloat(e.target.value) || 0 })} />
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-outline" onClick={resetForm}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">{modal === 'crear' ? 'Crear' : 'Guardar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
