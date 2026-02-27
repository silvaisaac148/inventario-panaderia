/**
 * Recetas — CRUD con ingredientes y costo automático.
 */

import { useState, useEffect } from 'react';
import { recetasAPI, ingredientesAPI, productosAPI } from '../services/api';
import { MdAdd, MdDelete, MdClose, MdCalculate, MdRemoveCircle } from 'react-icons/md';

export default function Recetas() {
    const [recetas, setRecetas] = useState([]);
    const [ingredientes, setIngredientes] = useState([]);
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);
    const [costoModal, setCostoModal] = useState(null);
    const [msg, setMsg] = useState(null);
    const [form, setForm] = useState({ nombre: '', producto_id: '', rendimiento: 1, notas: '', detalles: [] });

    const cargar = async () => {
        setLoading(true);
        try {
            const [r, i, p] = await Promise.all([recetasAPI.listar(), ingredientesAPI.listar(), productosAPI.listar()]);
            setRecetas(r.data);
            setIngredientes(i.data);
            setProductos(p.data);
        } catch { setMsg({ tipo: 'danger', texto: 'Error al cargar datos' }); }
        setLoading(false);
    };

    useEffect(() => { cargar(); }, []);

    const resetForm = () => { setForm({ nombre: '', producto_id: '', rendimiento: 1, notas: '', detalles: [] }); setModal(null); };

    const addDetalle = () => {
        setForm({ ...form, detalles: [...form.detalles, { ingrediente_id: '', cantidad: 0, unidad: 'g' }] });
    };

    const removeDetalle = (idx) => {
        setForm({ ...form, detalles: form.detalles.filter((_, i) => i !== idx) });
    };

    const updateDetalle = (idx, field, value) => {
        const detalles = [...form.detalles];
        detalles[idx] = { ...detalles[idx], [field]: value };
        setForm({ ...form, detalles });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.detalles.length === 0) { setMsg({ tipo: 'warning', texto: 'Agrega al menos un ingrediente' }); return; }
        try {
            const data = {
                ...form,
                rendimiento: parseInt(form.rendimiento),
                detalles: form.detalles.map(d => ({ ...d, cantidad: parseFloat(d.cantidad) })),
            };
            await recetasAPI.crear(data);
            setMsg({ tipo: 'success', texto: 'Receta creada' });
            resetForm(); cargar();
        } catch (err) {
            setMsg({ tipo: 'danger', texto: err.response?.data?.detail || 'Error al guardar' });
        }
    };

    const verCosto = async (receta) => {
        try {
            const res = await recetasAPI.costo(receta.id);
            setCostoModal(res.data);
        } catch { setMsg({ tipo: 'danger', texto: 'Error al calcular costo' }); }
    };

    const handleEliminar = async (receta) => {
        if (!confirm(`¿Eliminar receta "${receta.nombre}"?`)) return;
        try { await recetasAPI.eliminar(receta.id); setMsg({ tipo: 'success', texto: 'Receta eliminada' }); cargar(); }
        catch { setMsg({ tipo: 'danger', texto: 'Error al eliminar' }); }
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div>
            <div className="page-header">
                <h1>👨‍🍳 Recetas</h1>
                <p>Fórmulas de producción</p>
            </div>

            {msg && (
                <div className={`alert alert-${msg.tipo}`}>{msg.texto}
                    <button onClick={() => setMsg(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
                </div>
            )}

            <div className="toolbar">
                <span style={{ color: 'var(--text-secondary)' }}>{recetas.length} recetas</span>
                <button className="btn btn-primary" onClick={() => { resetForm(); setModal('crear'); }}><MdAdd /> Nueva Receta</button>
            </div>

            <div className="table-container">
                <table>
                    <thead><tr><th>Receta</th><th>Producto</th><th>Rendimiento</th><th>Ingredientes</th><th>Acciones</th></tr></thead>
                    <tbody>
                        {recetas.length === 0 ? (
                            <tr><td colSpan={5} className="empty-state">No hay recetas. ¡Crea la primera!</td></tr>
                        ) : recetas.map((r) => (
                            <tr key={r.id}>
                                <td><strong>{r.nombre}</strong></td>
                                <td>{r.producto_nombre || '—'}</td>
                                <td>{r.rendimiento} und</td>
                                <td>{r.detalles?.length || 0} ingredientes</td>
                                <td>
                                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                                        <button className="btn btn-outline btn-sm" onClick={() => verCosto(r)} title="Calcular costo"><MdCalculate /></button>
                                        <button className="btn btn-danger btn-sm" onClick={() => handleEliminar(r)}><MdDelete /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal Crear */}
            {modal === 'crear' && (
                <div className="modal-overlay" onClick={resetForm}>
                    <div className="modal" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>➕ Nueva Receta</h2>
                            <button className="close-btn" onClick={resetForm}><MdClose /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Nombre de la receta</label>
                                <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required placeholder="Ej: Pan Integral Fibra" />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Producto asociado</label>
                                    <select value={form.producto_id} onChange={(e) => setForm({ ...form, producto_id: e.target.value })} required>
                                        <option value="">Seleccionar...</option>
                                        {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Rendimiento (unidades)</label>
                                    <input type="number" min="1" value={form.rendimiento} onChange={(e) => setForm({ ...form, rendimiento: e.target.value })} required />
                                </div>
                            </div>

                            <h3 className="section-title" style={{ marginTop: '1rem' }}>🥖 Ingredientes de la receta</h3>
                            {form.detalles.map((d, idx) => (
                                <div key={idx} className="form-row" style={{ alignItems: 'end' }}>
                                    <div className="form-group">
                                        <label>Ingrediente</label>
                                        <select value={d.ingrediente_id} onChange={(e) => updateDetalle(idx, 'ingrediente_id', e.target.value)} required>
                                            <option value="">Seleccionar...</option>
                                            {ingredientes.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Cantidad</label>
                                        <input type="number" step="0.01" min="0.01" value={d.cantidad} onChange={(e) => updateDetalle(idx, 'cantidad', e.target.value)} required />
                                    </div>
                                    <div className="form-group">
                                        <label>Unidad</label>
                                        <select value={d.unidad} onChange={(e) => updateDetalle(idx, 'unidad', e.target.value)}>
                                            <option value="g">g</option><option value="kg">kg</option>
                                            <option value="ml">ml</option><option value="lts">lts</option><option value="und">und</option>
                                        </select>
                                    </div>
                                    <button type="button" className="btn btn-danger btn-sm" onClick={() => removeDetalle(idx)} style={{ marginBottom: '1rem' }}>
                                        <MdRemoveCircle />
                                    </button>
                                </div>
                            ))}
                            <button type="button" className="btn btn-outline btn-sm" onClick={addDetalle} style={{ marginBottom: '1rem' }}>
                                <MdAdd /> Agregar ingrediente
                            </button>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-outline" onClick={resetForm}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">Crear Receta</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Costo */}
            {costoModal && (
                <div className="modal-overlay" onClick={() => setCostoModal(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>💰 Costo: {costoModal.receta}</h2>
                            <button className="close-btn" onClick={() => setCostoModal(null)}><MdClose /></button>
                        </div>
                        <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                            <div className="stat-card">
                                <div className="stat-info">
                                    <h3>${costoModal.costo_total?.toFixed(2)}</h3>
                                    <p>Costo Total</p>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-info">
                                    <h3>${costoModal.costo_unitario?.toFixed(2)}</h3>
                                    <p>Costo Unitario ({costoModal.rendimiento} und)</p>
                                </div>
                            </div>
                        </div>
                        <h4 style={{ margin: '1rem 0 0.5rem', fontSize: '0.9rem' }}>Desglose:</h4>
                        <div className="table-container">
                            <table>
                                <thead><tr><th>Ingrediente</th><th>Cantidad</th><th>Costo</th></tr></thead>
                                <tbody>
                                    {costoModal.detalles?.map((d, i) => (
                                        <tr key={i}>
                                            <td>{d.ingrediente}</td>
                                            <td>{d.cantidad} {d.unidad}</td>
                                            <td>${d.costo_total?.toFixed(4)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
