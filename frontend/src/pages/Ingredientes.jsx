/**
 * Ingredientes — CRUD + compras (simple y por presentación) + historial.
 */

import { useState, useEffect } from 'react';
import { ingredientesAPI } from '../services/api';
import { MdAdd, MdEdit, MdShoppingCart, MdClose, MdHistory, MdDelete } from 'react-icons/md';

const TIPO_BADGE = {
    COMPRA: 'badge-success',
    PRODUCCION: 'badge-warning',
    AJUSTE: 'badge-info',
    MERMA: 'badge-danger',
};

const UNIDADES = [
    { value: 'kg', label: 'Kilogramos (kg)' },
    { value: 'g', label: 'Gramos (g)' },
    { value: 'lts', label: 'Litros (lts)' },
    { value: 'ml', label: 'Mililitros (ml)' },
    { value: 'und', label: 'Unidades (und)' },
    { value: 'hoj', label: 'Hojas (hoj)' },
];

export default function Ingredientes() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);
    const [selected, setSelected] = useState(null);
    const [msg, setMsg] = useState(null);
    const [form, setForm] = useState({
        nombre: '', unidad_medida: 'kg', stock_actual: 0, stock_minimo: 0, costo_unitario: 0,
    });

    // Compra: modo simple o por presentación
    const [modoCompra, setModoCompra] = useState('simple');
    const [compraSimple, setCompraSimple] = useState({ cantidad: '', costo_total: '', nota: '' });
    const [compraPresentacion, setCompraPresentacion] = useState({
        cantidad_presentacion: '', unidad_presentacion: 'saco',
        peso_por_presentacion: '', costo_por_presentacion: '', nota: '',
    });

    const [movimientos, setMovimientos] = useState([]);
    const [movLoading, setMovLoading] = useState(false);
    const [eliminarModal, setEliminarModal] = useState(null);

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
        setCompraSimple({ cantidad: '', costo_total: '', nota: '' });
        setCompraPresentacion({ cantidad_presentacion: '', unidad_presentacion: 'saco', peso_por_presentacion: '', costo_por_presentacion: '', nota: '' });
        setModoCompra('simple');
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
            resetForm(); cargar();
        } catch (err) {
            setMsg({ tipo: 'danger', texto: err.response?.data?.detail || 'Error al guardar' });
        }
    };

    const handleCompra = async (e) => {
        e.preventDefault();
        try {
            let payload;
            if (modoCompra === 'simple') {
                payload = {
                    cantidad: parseFloat(compraSimple.cantidad),
                    costo_total: parseFloat(compraSimple.costo_total),
                    nota: compraSimple.nota || null,
                };
            } else {
                payload = {
                    cantidad_presentacion: parseFloat(compraPresentacion.cantidad_presentacion),
                    unidad_presentacion: compraPresentacion.unidad_presentacion,
                    peso_por_presentacion: parseFloat(compraPresentacion.peso_por_presentacion),
                    costo_por_presentacion: parseFloat(compraPresentacion.costo_por_presentacion),
                    nota: compraPresentacion.nota || null,
                };
            }
            const res = await ingredientesAPI.compra(selected.id, payload);
            const d = res.data;
            setMsg({
                tipo: 'success',
                texto: `✅ Compra registrada: +${d.cantidad_comprada} ${d.unidad} | R$${d.costo_nuevo}/${d.unidad} | R$${d.costo_por_gramo_nuevo}/g`,
            });
            resetForm(); cargar();
        } catch (err) {
            setMsg({ tipo: 'danger', texto: err.response?.data?.detail || 'Error en compra' });
        }
    };

    const abrirEditar = (item) => {
        setSelected(item);
        setForm({ nombre: item.nombre, unidad_medida: item.unidad_medida, stock_actual: item.stock_actual, stock_minimo: item.stock_minimo, costo_unitario: item.costo_unitario });
        setModal('editar');
    };

    const abrirCompra = (item) => {
        setSelected(item);
        setModoCompra('simple');
        setModal('compra');
    };

    const confirmarEliminar = async () => {
        try {
            await ingredientesAPI.eliminar(eliminarModal.id);
            setMsg({ tipo: 'success', texto: `✅ Ingrediente "${eliminarModal.nombre}" eliminado` });
            setEliminarModal(null);
            cargar();
        } catch (err) {
            const texto = err.response?.data?.detail || 'Error al eliminar';
            setMsg({ tipo: err.response?.status === 409 ? 'warning' : 'danger', texto });
            setEliminarModal(null);
        }
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

    // Preview compra por presentación
    const prev = compraPresentacion;
    const cantTotal = parseFloat(prev.cantidad_presentacion) * parseFloat(prev.peso_por_presentacion) || 0;
    const costoTotal = parseFloat(prev.cantidad_presentacion) * parseFloat(prev.costo_por_presentacion) || 0;
    const costoPorUnidad = cantTotal > 0 ? costoTotal / cantTotal : 0;
    const costoPorGramo = selected ? (
        selected.unidad_medida === 'kg' ? costoPorUnidad / 1000 :
        selected.unidad_medida === 'lts' ? costoPorUnidad / 1000 :
        costoPorUnidad
    ) : 0;

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
                            <th>Costo/g</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 ? (
                            <tr><td colSpan={8} className="empty-state">No hay ingredientes. ¡Crea el primero!</td></tr>
                        ) : items.map((item) => (
                            <tr key={item.id}>
                                <td><strong>{item.nombre}</strong></td>
                                <td>{item.unidad_medida}</td>
                                <td>{parseFloat(item.stock_actual).toFixed(2)}</td>
                                <td>{parseFloat(item.stock_minimo).toFixed(2)}</td>
                                <td>R${parseFloat(item.costo_unitario).toFixed(4)}/{item.unidad_medida}</td>
                                <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>R${parseFloat(item.costo_por_gramo).toFixed(6)}</td>
                                <td>
                                    {item.alerta_stock
                                        ? <span className="badge badge-danger">⚠️ Bajo</span>
                                        : <span className="badge badge-success">✅ OK</span>
                                    }
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                                        <button className="btn btn-success btn-sm" title="Registrar compra" onClick={() => abrirCompra(item)}><MdShoppingCart /></button>
                                        <button className="btn btn-outline btn-sm" title="Historial" onClick={() => abrirMovimientos(item)}><MdHistory /></button>
                                        <button className="btn btn-outline btn-sm" title="Editar" onClick={() => abrirEditar(item)}><MdEdit /></button>
                                        <button className="btn btn-danger btn-sm" title="Eliminar" onClick={() => setEliminarModal(item)}><MdDelete /></button>
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
                                        {UNIDADES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Costo unitario (R$/{form.unidad_medida})</label>
                                    <input type="number" step="0.0001" min="0" value={form.costo_unitario} onChange={(e) => setForm({ ...form, costo_unitario: parseFloat(e.target.value) || 0 })} />
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
                                <button type="submit" className="btn btn-primary">{modal === 'crear' ? 'Crear' : 'Guardar cambios'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Compra */}
            {modal === 'compra' && selected && (
                <div className="modal-overlay" onClick={resetForm}>
                    <div className="modal" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>🛒 Registrar Compra</h2>
                            <button className="close-btn" onClick={resetForm}><MdClose /></button>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                            <strong>{selected.nombre}</strong> — Stock: {parseFloat(selected.stock_actual).toFixed(2)} {selected.unidad_medida}
                            &nbsp;|&nbsp; Costo actual: R${parseFloat(selected.costo_unitario).toFixed(4)}/{selected.unidad_medida}
                        </p>

                        {/* Toggle de modo */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                            <button
                                type="button"
                                className={`btn btn-sm ${modoCompra === 'simple' ? 'btn-primary' : 'btn-outline'}`}
                                onClick={() => setModoCompra('simple')}
                            >
                                📦 Compra simple
                            </button>
                            <button
                                type="button"
                                className={`btn btn-sm ${modoCompra === 'presentacion' ? 'btn-primary' : 'btn-outline'}`}
                                onClick={() => setModoCompra('presentacion')}
                            >
                                🎒 Por presentación (sacos, cajas...)
                            </button>
                        </div>

                        <form onSubmit={handleCompra}>
                            {modoCompra === 'simple' ? (
                                <>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Cantidad ({selected.unidad_medida})</label>
                                            <input type="number" step="0.001" min="0.001" value={compraSimple.cantidad} onChange={(e) => setCompraSimple({ ...compraSimple, cantidad: e.target.value })} required placeholder="Ej: 45" />
                                        </div>
                                        <div className="form-group">
                                            <label>Costo total (R$)</label>
                                            <input type="number" step="0.01" min="0.01" value={compraSimple.costo_total} onChange={(e) => setCompraSimple({ ...compraSimple, costo_total: e.target.value })} required placeholder="Ej: 260" />
                                        </div>
                                    </div>
                                    {compraSimple.cantidad && compraSimple.costo_total && (() => {
                                        const qty = parseFloat(compraSimple.cantidad);
                                        const cost = parseFloat(compraSimple.costo_total);
                                        if (!qty || !cost) return null;
                                        const costoPorUnidad = cost / qty;
                                        const FACTORES = { kg: 1000, g: 1, lts: 1000, ml: 1 };
                                        const factor = FACTORES[selected.unidad_medida] ?? null;
                                        const costoPorGramo = factor ? costoPorUnidad / factor : null;
                                        const stockActual = parseFloat(selected.stock_actual) || 0;
                                        const costoActual = parseFloat(selected.costo_unitario) || 0;
                                        const nuevoPromedio = stockActual > 0
                                            ? (stockActual * costoActual + qty * costoPorUnidad) / (stockActual + qty)
                                            : costoPorUnidad;
                                        return (
                                            <div className="alert alert-info" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
                                                <strong>📊 Esta compra:</strong><br />
                                                R${costoPorUnidad.toFixed(4)}/{selected.unidad_medida}
                                                {costoPorGramo !== null && <> | R${costoPorGramo.toFixed(6)}/g</>}
                                                <br />
                                                <strong>↳ Nuevo promedio ponderado:</strong>{' '}
                                                R${nuevoPromedio.toFixed(4)}/{selected.unidad_medida}
                                                {costoPorGramo !== null && <> | R${(nuevoPromedio / factor).toFixed(6)}/g</>}
                                            </div>
                                        );
                                    })()}
                                    <div className="form-group">
                                        <label>Nota (opcional)</label>
                                        <input value={compraSimple.nota} onChange={(e) => setCompraSimple({ ...compraSimple, nota: e.target.value })} placeholder="Ej: Proveedor ABC" />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Cantidad de presentaciones</label>
                                            <input type="number" step="1" min="1" value={compraPresentacion.cantidad_presentacion} onChange={(e) => setCompraPresentacion({ ...compraPresentacion, cantidad_presentacion: e.target.value })} required placeholder="Ej: 50" />
                                        </div>
                                        <div className="form-group">
                                            <label>Tipo (saco, caja, paquete...)</label>
                                            <input value={compraPresentacion.unidad_presentacion} onChange={(e) => setCompraPresentacion({ ...compraPresentacion, unidad_presentacion: e.target.value })} placeholder="saco" />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>{selected.unidad_medida} por {compraPresentacion.unidad_presentacion || 'unidad'}</label>
                                            <input type="number" step="0.001" min="0.001" value={compraPresentacion.peso_por_presentacion} onChange={(e) => setCompraPresentacion({ ...compraPresentacion, peso_por_presentacion: e.target.value })} required placeholder="Ej: 50" />
                                        </div>
                                        <div className="form-group">
                                            <label>R$ por {compraPresentacion.unidad_presentacion || 'unidad'}</label>
                                            <input type="number" step="0.01" min="0.01" value={compraPresentacion.costo_por_presentacion} onChange={(e) => setCompraPresentacion({ ...compraPresentacion, costo_por_presentacion: e.target.value })} required placeholder="Ej: 260" />
                                        </div>
                                    </div>
                                    {cantTotal > 0 && costoTotal > 0 && (
                                        <div className="alert alert-info" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
                                            <strong>📊 Resumen:</strong><br />
                                            {compraPresentacion.cantidad_presentacion} {compraPresentacion.unidad_presentacion}s × {compraPresentacion.peso_por_presentacion} {selected.unidad_medida} = <strong>{cantTotal.toFixed(2)} {selected.unidad_medida}</strong><br />
                                            R${compraPresentacion.costo_por_presentacion}/{compraPresentacion.unidad_presentacion} × {compraPresentacion.cantidad_presentacion} = <strong>R${costoTotal.toFixed(2)} total</strong><br />
                                            ↳ R${costoPorUnidad.toFixed(4)}/{selected.unidad_medida} | R${costoPorGramo.toFixed(6)}/g
                                        </div>
                                    )}
                                    <div className="form-group">
                                        <label>Nota (opcional)</label>
                                        <input value={compraPresentacion.nota} onChange={(e) => setCompraPresentacion({ ...compraPresentacion, nota: e.target.value })} placeholder="Ej: Proveedor Molino XYZ" />
                                    </div>
                                </>
                            )}
                            <div className="modal-actions">
                                <button type="button" className="btn btn-outline" onClick={resetForm}>Cancelar</button>
                                <button type="submit" className="btn btn-success">Registrar Compra</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Confirmar Eliminación */}
            {eliminarModal && (
                <div className="modal-overlay" onClick={() => setEliminarModal(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>🗑️ Eliminar Ingrediente</h2>
                            <button className="close-btn" onClick={() => setEliminarModal(null)}><MdClose /></button>
                        </div>
                        <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
                            ¿Estás seguro de eliminar <strong>"{eliminarModal.nombre}"</strong>?
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1rem' }}>
                            Solo se puede eliminar si el ingrediente no está vinculado a ninguna receta ni tiene movimientos de stock. Si está en uso, el sistema te avisará.
                        </p>
                        <div className="modal-actions">
                            <button className="btn btn-outline" onClick={() => setEliminarModal(null)}>Cancelar</button>
                            <button className="btn btn-danger" onClick={confirmarEliminar}>Eliminar</button>
                        </div>
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
                            <strong>{selected.nombre}</strong> — Stock: {parseFloat(selected.stock_actual).toFixed(2)} {selected.unidad_medida}
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
                                                <td><span className={`badge ${TIPO_BADGE[m.tipo] || 'badge-info'}`}>{m.tipo}</span></td>
                                                <td style={{ color: m.cantidad >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                                    {m.cantidad >= 0 ? '+' : ''}{parseFloat(m.cantidad).toFixed(4)}
                                                </td>
                                                <td>R${parseFloat(m.costo_total).toFixed(2)}</td>
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
