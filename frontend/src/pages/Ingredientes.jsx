/**
 * Ingredientes — CRUD + compras con costo ponderado + historial de movimientos.
 */

import { useState, useEffect } from 'react';
import { ingredientesAPI } from '../services/api';
import { MdAdd, MdEdit, MdDelete, MdShoppingCart, MdClose, MdHistory } from 'react-icons/md';

const TIPO_BADGE = {
    COMPRA: 'badge-success',
    PRODUCCION: 'badge-warning',
    AJUSTE: 'badge-info',
    MERMA: 'badge-danger',
};

export default function Ingredientes() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null); // 'crear' | 'editar' | 'compra' | 'movimientos'
    const [selected, setSelected] = useState(null);
    const [msg, setMsg] = useState(null);
    const [form, setForm] = useState({
        nombre: '', unidad_medida: 'kg', stock_actual: 0, stock_minimo: 0, costo_unitario: 0,
    });
    const [compraForm, setCompraForm] = useState({ cantidad: '', costo_total: '', nota: '' });
    const [movimientos, setMovimientos] = useState([]);
    const [movLoading, setMovLoading] = useState(false);

    const cargar = () => {
        setLoading(true);
        ingredientesAPI.listar()
            .then((r) => setItems(r.data))
            .catch(() => setMsg({ tipo: 'danger', texto: 'Error al cargar ingredientes' }))
            .finally(() => setLoading(false));
    };

    useEffect(() => { cargar(); }, []);

    const resetForm = () => {
        setForm({ nombre: '', unidad_medida: 'kg', stock_actual: 0, stock_minimo: 0, costo_unitario: 0 });
        setCompraForm({ cantidad: '', costo_total: '', nota: '' });
        setMovimientos([]);
        setSelected(null);
        setModal(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (modal === 'editar' && selected) {
                await ingredientesAPI.actualizar(selected.id, form);
                setMsg({ tipo: 'success', texto: 'Ingrediente actualizado' });
            } else {
                await ingredientesAPI.crear(form);
                setMsg({ tipo: 'success', texto: 'Ingrediente creado' });
            }
            resetForm();
            cargar();
        } catch (err) {
            setMsg({ tipo: 'danger', texto: err.response?.data?.detail || 'Error al guardar' });
        }
    };

    const handleCompra = async (e) => {
        e.preventDefault();
        try {
            const res = await ingredientesAPI.compra(selected.id, {
                cantidad: parseFloat(compraForm.cantidad),
                costo_total: parseFloat(compraForm.costo_total),
                nota: compraForm.nota,
            });
            setMsg({
                tipo: 'success',
                texto: `✅ Compra registrada. Costo anterior: $${res.data.costo_anterior} → Nuevo: $${res.data.costo_nuevo}`,
            });
            resetForm();
            cargar();
        } catch (err) {
            setMsg({ tipo: 'danger', texto: err.response?.data?.detail || 'Error en compra' });
        }
    };

    const handleEliminar = async (item) => {
        if (!confirm(`¿Eliminar "${item.nombre}"?`)) return;
        try {
            await ingredientesAPI.eliminar(item.id);
            setMsg({ tipo: 'success', texto: 'Ingrediente eliminado' });
            cargar();
        } catch (err) {
            setMsg({ tipo: 'danger', texto: 'Error al eliminar' });
        }
    };

    const abrirEditar = (item) => {
        setSelected(item);
        setForm({
            nombre: item.nombre,
            unidad_medida: item.unidad_medida,
            stock_actual: item.stock_actual,
            stock_minimo: item.stock_minimo,
            costo_unitario: item.costo_unitario,
        });
        setModal('editar');
    };

    const abrirCompra = (item) => {
        setSelected(item);
        setCompraForm({ cantidad: '', costo_total: '', nota: '' });
        setModal('compra');
    };

    const abrirMovimientos = async (item) => {
        setSelected(item);
        setModal('movimientos');
        setMovLoading(true);
        try {
            const res = await ingredientesAPI.movimientos(item.id);
            setMovimientos(res.data);
        } catch {
            setMsg({ tipo: 'danger', texto: 'Error al cargar movimientos' });
        }
        setMovLoading(false);
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div>
            <div className="page-header">
                <h1>📦 Ingredientes</h1>
                <p>Materias primas e insumos</p>
            </div>

            {msg && (
                <div className={`alert alert-${msg.tipo}`}>
                    {msg.texto}
                    <button onClick={() => setMsg(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
                </div>
            )}

            <div className="toolbar">
                <span style={{ color: 'var(--text-secondary)' }}>{items.length} ingredientes</span>
                <button className="btn btn-primary" onClick={() => { resetForm(); setModal('crear'); }}>
                    <MdAdd /> Nuevo Ingrediente
                </button>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Unidad</th>
                            <th>Stock</th>
                            <th>Mínimo</th>
                            <th>Costo Unit.</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 ? (
                            <tr><td colSpan={7} className="empty-state">No hay ingredientes. ¡Crea el primero!</td></tr>
                        ) : items.map((item) => (
                            <tr key={item.id}>
                                <td><strong>{item.nombre}</strong></td>
                                <td>{item.unidad_medida}</td>
                                <td>{parseFloat(item.stock_actual).toFixed(2)}</td>
                                <td>{parseFloat(item.stock_minimo).toFixed(2)}</td>
                                <td>${parseFloat(item.costo_unitario).toFixed(2)}</td>
                                <td>
                                    {item.alerta_stock
                                        ? <span className="badge badge-danger">⚠️ Bajo</span>
                                        : <span className="badge badge-success">✅ OK</span>
                                    }
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                                        <button className="btn btn-success btn-sm" title="Registrar compra" onClick={() => abrirCompra(item)}>
                                            <MdShoppingCart />
                                        </button>
                                        <button className="btn btn-outline btn-sm" title="Historial" onClick={() => abrirMovimientos(item)}>
                                            <MdHistory />
                                        </button>
                                        <button className="btn btn-outline btn-sm" title="Editar" onClick={() => abrirEditar(item)}>
                                            <MdEdit />
                                        </button>
                                        <button className="btn btn-danger btn-sm" title="Eliminar" onClick={() => handleEliminar(item)}>
                                            <MdDelete />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal Crear/Editar */}
            {(modal === 'crear' || modal === 'editar') && (
                <div className="modal-overlay" onClick={resetForm}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{modal === 'crear' ? '➕ Nuevo Ingrediente' : '✏️ Editar Ingrediente'}</h2>
                            <button className="close-btn" onClick={resetForm}><MdClose /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Nombre</label>
                                <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required placeholder="Ej: Harina de trigo" />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Unidad de medida</label>
                                    <select value={form.unidad_medida} onChange={(e) => setForm({ ...form, unidad_medida: e.target.value })}>
                                        <option value="kg">Kilogramos (kg)</option>
                                        <option value="g">Gramos (g)</option>
                                        <option value="lts">Litros (lts)</option>
                                        <option value="ml">Mililitros (ml)</option>
                                        <option value="und">Unidades (und)</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Costo unitario ($)</label>
                                    <input type="number" step="0.01" min="0" value={form.costo_unitario} onChange={(e) => setForm({ ...form, costo_unitario: parseFloat(e.target.value) || 0 })} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Stock actual</label>
                                    <input type="number" step="0.01" min="0" value={form.stock_actual} onChange={(e) => setForm({ ...form, stock_actual: parseFloat(e.target.value) || 0 })} />
                                </div>
                                <div className="form-group">
                                    <label>Stock mínimo</label>
                                    <input type="number" step="0.01" min="0" value={form.stock_minimo} onChange={(e) => setForm({ ...form, stock_minimo: parseFloat(e.target.value) || 0 })} />
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-outline" onClick={resetForm}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">
                                    {modal === 'crear' ? 'Crear' : 'Guardar cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Compra */}
            {modal === 'compra' && selected && (
                <div className="modal-overlay" onClick={resetForm}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>🛒 Registrar Compra</h2>
                            <button className="close-btn" onClick={resetForm}><MdClose /></button>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                            <strong>{selected.nombre}</strong> — Stock actual: {parseFloat(selected.stock_actual).toFixed(2)} {selected.unidad_medida}
                        </p>
                        <form onSubmit={handleCompra}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Cantidad ({selected.unidad_medida})</label>
                                    <input type="number" step="0.01" min="0.01" value={compraForm.cantidad} onChange={(e) => setCompraForm({ ...compraForm, cantidad: e.target.value })} required placeholder="Ej: 25" />
                                </div>
                                <div className="form-group">
                                    <label>Costo total ($)</label>
                                    <input type="number" step="0.01" min="0.01" value={compraForm.costo_total} onChange={(e) => setCompraForm({ ...compraForm, costo_total: e.target.value })} required placeholder="Ej: 260" />
                                </div>
                            </div>
                            {compraForm.cantidad && compraForm.costo_total && (
                                <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
                                    💡 Costo unitario: ${(parseFloat(compraForm.costo_total) / parseFloat(compraForm.cantidad)).toFixed(4)} / {selected.unidad_medida}
                                </div>
                            )}
                            <div className="form-group">
                                <label>Nota (opcional)</label>
                                <input value={compraForm.nota} onChange={(e) => setCompraForm({ ...compraForm, nota: e.target.value })} placeholder="Ej: Proveedor ABC" />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-outline" onClick={resetForm}>Cancelar</button>
                                <button type="submit" className="btn btn-success">Registrar Compra</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Movimientos */}
            {modal === 'movimientos' && selected && (
                <div className="modal-overlay" onClick={resetForm}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px' }}>
                        <div className="modal-header">
                            <h2>📋 Historial de Movimientos</h2>
                            <button className="close-btn" onClick={resetForm}><MdClose /></button>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                            <strong>{selected.nombre}</strong> — Stock actual: {parseFloat(selected.stock_actual).toFixed(2)} {selected.unidad_medida}
                        </p>
                        {movLoading ? (
                            <div className="loading"><div className="spinner"></div></div>
                        ) : (
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Fecha</th>
                                            <th>Tipo</th>
                                            <th>Cantidad</th>
                                            <th>Costo</th>
                                            <th>Referencia</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {movimientos.length === 0 ? (
                                            <tr><td colSpan={5} className="empty-state">Sin movimientos registrados</td></tr>
                                        ) : movimientos.map((m) => (
                                            <tr key={m.id}>
                                                <td>{new Date(m.fecha).toLocaleDateString()}</td>
                                                <td>
                                                    <span className={`badge ${TIPO_BADGE[m.tipo] || 'badge-info'}`}>
                                                        {m.tipo}
                                                    </span>
                                                </td>
                                                <td style={{ color: m.cantidad >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                                    {m.cantidad >= 0 ? '+' : ''}{parseFloat(m.cantidad).toFixed(4)}
                                                </td>
                                                <td>${parseFloat(m.costo_total).toFixed(2)}</td>
                                                <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{m.referencia}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <div className="modal-actions">
                            <button type="button" className="btn btn-outline" onClick={resetForm}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
