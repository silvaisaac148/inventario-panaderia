/**
 * Recetas — CRUD con ingredientes, mano de obra, ganancia, merma y costo automático.
 */

import { useState, useEffect } from 'react';
import { recetasAPI, ingredientesAPI, productosAPI } from '../services/api';
import { MdAdd, MdDelete, MdClose, MdCalculate, MdRemoveCircle, MdEdit } from 'react-icons/md';

const UNIDADES = ['g', 'kg', 'ml', 'lts', 'und', 'hoj'];

export default function Recetas() {
    const [recetas, setRecetas] = useState([]);
    const [ingredientes, setIngredientes] = useState([]);
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [costoModal, setCostoModal] = useState(null);
    const [msg, setMsg] = useState(null);
    const [form, setForm] = useState({
        nombre: '', producto_id: '', rendimiento: 1, notas: '',
        mano_de_obra: 0, porcentaje_ganancia: 30, porcentaje_merma: 0,
        detalles: [],
    });

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

    const resetForm = () => {
        setForm({ nombre: '', producto_id: '', rendimiento: 1, notas: '', mano_de_obra: 0, porcentaje_ganancia: 30, porcentaje_merma: 0, detalles: [] });
        setModal(null);
        setEditingId(null);
    };

    const handleEditar = (receta) => {
        setForm({
            nombre: receta.nombre,
            producto_id: receta.producto_id,
            rendimiento: receta.rendimiento,
            notas: receta.notas || '',
            mano_de_obra: receta.mano_de_obra ?? 0,
            porcentaje_ganancia: receta.porcentaje_ganancia ?? 30,
            porcentaje_merma: receta.porcentaje_merma ?? 0,
            detalles: receta.detalles.map(d => ({
                ingrediente_id: d.ingrediente_id,
                cantidad: d.cantidad,
                unidad: d.unidad,
            })),
        });
        setEditingId(receta.id);
        setModal('editar');
    };

    const addDetalle = () => setForm({ ...form, detalles: [...form.detalles, { ingrediente_id: '', cantidad: 0, unidad: 'g' }] });
    const removeDetalle = (idx) => setForm({ ...form, detalles: form.detalles.filter((_, i) => i !== idx) });
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
                mano_de_obra: parseFloat(form.mano_de_obra) || 0,
                porcentaje_ganancia: parseFloat(form.porcentaje_ganancia) || 0,
                porcentaje_merma: parseFloat(form.porcentaje_merma) || 0,
                detalles: form.detalles.map(d => ({ ...d, cantidad: parseFloat(d.cantidad) })),
            };
            if (editingId) {
                await recetasAPI.actualizar(editingId, data);
                setMsg({ tipo: 'success', texto: 'Receta actualizada' });
            } else {
                await recetasAPI.crear(data);
                setMsg({ tipo: 'success', texto: 'Receta creada' });
            }
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

    const c = costoModal;
    const diferenciaColor = c?.diferencia_precio >= 0 ? 'var(--success)' : 'var(--danger)';

    return (
        <div>
            <div className="page-header">
                <h1>👨‍🍳 Recetas</h1>
                <p>Fórmulas de producción con costo, mano de obra y margen</p>
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
                    <thead><tr><th>Receta</th><th>Producto</th><th>Rinde</th><th>M.O./und</th><th>Ganancia</th><th>Ingredientes</th><th>Acciones</th></tr></thead>
                    <tbody>
                        {recetas.length === 0 ? (
                            <tr><td colSpan={7} className="empty-state">No hay recetas. ¡Crea la primera!</td></tr>
                        ) : recetas.map((r) => (
                            <tr key={r.id}>
                                <td><strong>{r.nombre}</strong></td>
                                <td>{r.producto_nombre || '—'}</td>
                                <td>{r.rendimiento} und</td>
                                <td>{r.mano_de_obra > 0 ? `R$${parseFloat(r.mano_de_obra).toFixed(2)}` : '—'}</td>
                                <td>{r.porcentaje_ganancia > 0 ? `${r.porcentaje_ganancia}%` : '—'}</td>
                                <td>{r.detalles?.length || 0}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                                        <button className="btn btn-outline btn-sm" onClick={() => verCosto(r)} title="Calcular costo"><MdCalculate /></button>
                                        <button className="btn btn-outline btn-sm" onClick={() => handleEditar(r)} title="Editar receta"><MdEdit /></button>
                                        <button className="btn btn-danger btn-sm" onClick={() => handleEliminar(r)}><MdDelete /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal Crear / Editar */}
            {(modal === 'crear' || modal === 'editar') && (
                <div className="modal-overlay" onClick={resetForm}>
                    <div className="modal" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{modal === 'editar' ? '✏️ Editar Receta' : '➕ Nueva Receta'}</h2>
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
                                    <label>Rendimiento (unidades por lote)</label>
                                    <input type="number" min="1" value={form.rendimiento} onChange={(e) => setForm({ ...form, rendimiento: e.target.value })} required />
                                </div>
                            </div>

                            {/* Costos y margen */}
                            <h3 className="section-title" style={{ marginTop: '1rem' }}>💰 Costo y Precio</h3>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Mano de obra (R$/und producida)</label>
                                    <input type="number" step="0.01" min="0" value={form.mano_de_obra} onChange={(e) => setForm({ ...form, mano_de_obra: e.target.value })} placeholder="Ej: 3.00" />
                                </div>
                                <div className="form-group">
                                    <label>% Ganancia (markup sobre costo)</label>
                                    <input type="number" step="0.1" min="0" value={form.porcentaje_ganancia} onChange={(e) => setForm({ ...form, porcentaje_ganancia: e.target.value })} placeholder="Ej: 30" />
                                </div>
                                <div className="form-group">
                                    <label>% Merma esperada</label>
                                    <input type="number" step="0.1" min="0" max="99" value={form.porcentaje_merma} onChange={(e) => setForm({ ...form, porcentaje_merma: e.target.value })} placeholder="Ej: 5" />
                                </div>
                            </div>

                            <h3 className="section-title" style={{ marginTop: '1rem' }}>🥖 Ingredientes</h3>
                            {form.detalles.map((d, idx) => (
                                <div key={idx} className="form-row" style={{ alignItems: 'end' }}>
                                    <div className="form-group">
                                        <label>Ingrediente</label>
                                        <select value={d.ingrediente_id} onChange={(e) => updateDetalle(idx, 'ingrediente_id', e.target.value)} required>
                                            <option value="">Seleccionar...</option>
                                            {ingredientes.map((i) => <option key={i.id} value={i.id}>{i.nombre} ({i.unidad_medida})</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Cantidad</label>
                                        <input type="number" step="0.001" min="0.001" value={d.cantidad} onChange={(e) => updateDetalle(idx, 'cantidad', e.target.value)} required />
                                    </div>
                                    <div className="form-group">
                                        <label>Unidad</label>
                                        <select value={d.unidad} onChange={(e) => updateDetalle(idx, 'unidad', e.target.value)}>
                                            {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
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

                            <div className="form-group">
                                <label>Notas (opcional)</label>
                                <input value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Instrucciones, observaciones..." />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-outline" onClick={resetForm}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">{modal === 'editar' ? 'Guardar Cambios' : 'Crear Receta'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Costo */}
            {c && (
                <div className="modal-overlay" onClick={() => setCostoModal(null)}>
                    <div className="modal" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>💰 Costo: {c.receta}</h2>
                            <button className="close-btn" onClick={() => setCostoModal(null)}><MdClose /></button>
                        </div>

                        {/* Resumen de costos */}
                        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: '1rem' }}>
                            <div className="stat-card">
                                <div className="stat-info">
                                    <h3>R${c.costo_ingredientes?.toFixed(2)}</h3>
                                    <p>Ingredientes / lote ({c.rendimiento} und)</p>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-info">
                                    <h3>R${c.costo_ingredientes_por_unidad?.toFixed(4)}</h3>
                                    <p>Ingredientes / unidad{c.porcentaje_merma > 0 ? ` (sin merma)` : ''}</p>
                                </div>
                            </div>
                            {c.porcentaje_merma > 0 && (
                                <div className="stat-card">
                                    <div className="stat-info">
                                        <h3>R${c.costo_ingredientes_ajustado_merma?.toFixed(2)}</h3>
                                        <p>Con merma {c.porcentaje_merma}% / lote</p>
                                    </div>
                                </div>
                            )}
                            {c.mano_de_obra_por_unidad > 0 && (
                                <div className="stat-card">
                                    <div className="stat-info">
                                        <h3>R${c.mano_de_obra_por_unidad?.toFixed(4)}</h3>
                                        <p>Mano de obra / unidad</p>
                                    </div>
                                </div>
                            )}
                            <div className="stat-card" style={{ borderLeft: '3px solid var(--warning)' }}>
                                <div className="stat-info">
                                    <h3>R${c.costo_total_por_unidad?.toFixed(4)}</h3>
                                    <p>Costo total / unidad</p>
                                </div>
                            </div>
                            {c.precio_sugerido > 0 && (
                                <div className="stat-card" style={{ borderLeft: '3px solid var(--success)' }}>
                                    <div className="stat-info">
                                        <h3>R${c.precio_sugerido?.toFixed(2)}</h3>
                                        <p>Precio sugerido ({c.porcentaje_ganancia}% markup)</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Comparación precio actual vs sugerido */}
                        {c.precio_venta_actual > 0 && c.precio_sugerido > 0 && (
                            <div className="alert" style={{ backgroundColor: 'rgba(108,92,231,0.1)', border: '1px solid rgba(108,92,231,0.3)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                                Precio actual: <strong>R${c.precio_venta_actual?.toFixed(2)}</strong>
                                &nbsp;|&nbsp; Precio sugerido: <strong>R${c.precio_sugerido?.toFixed(2)}</strong>
                                &nbsp;|&nbsp; Diferencia: <strong style={{ color: diferenciaColor }}>
                                    {c.diferencia_precio >= 0 ? '+' : ''}R${c.diferencia_precio?.toFixed(2)}
                                </strong>
                                {c.diferencia_precio < 0 && <span style={{ color: 'var(--danger)' }}> ⚠️ Precio actual está por debajo del costo</span>}
                            </div>
                        )}

                        {/* Desglose por ingrediente */}
                        <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem' }}>Desglose por ingrediente:</h4>
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Ingrediente</th>
                                        <th>Cantidad</th>
                                        <th>Costo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {c.detalles?.map((d, i) => (
                                        <tr key={i}>
                                            <td>{d.ingrediente}</td>
                                            <td>{d.cantidad} {d.unidad}</td>
                                            <td>R${d.costo_total?.toFixed(4)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="modal-actions" style={{ marginTop: '1rem' }}>
                            <button className="btn btn-outline" onClick={() => setCostoModal(null)}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
