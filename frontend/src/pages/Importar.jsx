/**
 * Importar — Importar ingredientes y recetas desde JSON o Excel.
 */

import { useState, useRef } from 'react';
import { importarAPI } from '../services/api';
import { MdCloudUpload, MdCheckCircle, MdError, MdWarning, MdClose } from 'react-icons/md';

export default function Importar() {
    const [archivo, setArchivo] = useState(null);
    const [preview, setPreview] = useState(null);
    const [resultado, setResultado] = useState(null);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState(null);
    const [drag, setDrag] = useState(false);
    const fileRef = useRef();

    const resetear = () => {
        setArchivo(null);
        setPreview(null);
        setResultado(null);
        setMsg(null);
        if (fileRef.current) fileRef.current.value = '';
    };

    const procesarArchivo = async (file) => {
        if (!file) return;
        const ext = file.name.split('.').pop().toLowerCase();
        if (!['json', 'xlsx'].includes(ext)) {
            setMsg({ tipo: 'danger', texto: 'Solo se aceptan archivos .json o .xlsx' });
            return;
        }
        setArchivo(file);
        setPreview(null);
        setResultado(null);
        setMsg(null);
        setLoading(true);
        try {
            const res = await importarAPI.preview(file);
            setPreview(res.data);
        } catch (err) {
            setMsg({ tipo: 'danger', texto: err.response?.data?.detail || 'Error al leer el archivo' });
            setArchivo(null);
        }
        setLoading(false);
    };

    const handleFile = (e) => procesarArchivo(e.target.files[0]);

    const handleDrop = (e) => {
        e.preventDefault();
        setDrag(false);
        procesarArchivo(e.dataTransfer.files[0]);
    };

    const ejecutar = async () => {
        if (!archivo) return;
        setLoading(true);
        try {
            const res = await importarAPI.ejecutar(archivo);
            setResultado(res.data);
            setPreview(null);
            setMsg({ tipo: 'success', texto: '✅ Importación completada' });
        } catch (err) {
            setMsg({ tipo: 'danger', texto: err.response?.data?.detail || 'Error al importar' });
        }
        setLoading(false);
    };

    const totalImportar = (preview?.total_ingredientes || 0) + (preview?.total_recetas || 0);

    return (
        <div>
            <div className="page-header">
                <h1>📥 Importar Datos</h1>
                <p>Importar ingredientes y recetas desde un archivo JSON o Excel</p>
            </div>

            {msg && (
                <div className={`alert alert-${msg.tipo}`}>{msg.texto}
                    <button onClick={() => setMsg(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
                </div>
            )}

            {/* Zona de carga */}
            {!preview && !resultado && (
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h3 className="section-title"><MdCloudUpload /> Seleccionar Archivo</h3>
                    <div
                        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                        onDragLeave={() => setDrag(false)}
                        onDrop={handleDrop}
                        onClick={() => fileRef.current?.click()}
                        style={{
                            border: `2px dashed ${drag ? 'var(--accent)' : 'var(--border)'}`,
                            borderRadius: '12px',
                            padding: '3rem 2rem',
                            textAlign: 'center',
                            cursor: 'pointer',
                            background: drag ? 'rgba(108,92,231,0.05)' : 'transparent',
                            transition: 'all 0.2s',
                            marginBottom: '1rem',
                        }}
                    >
                        <MdCloudUpload style={{ fontSize: '3rem', color: 'var(--accent)', marginBottom: '0.75rem' }} />
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                            Arrastra aquí tu archivo o haz clic para seleccionar
                        </p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            Formatos soportados: <strong>.json</strong> · <strong>.xlsx</strong>
                        </p>
                    </div>
                    <input ref={fileRef} type="file" accept=".json,.xlsx" onChange={handleFile} style={{ display: 'none' }} />

                    {loading && (
                        <div style={{ textAlign: 'center', padding: '1rem' }}>
                            <div className="spinner" style={{ margin: '0 auto' }}></div>
                            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.85rem' }}>Analizando archivo...</p>
                        </div>
                    )}

                    {/* Formato esperado */}
                    <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <strong style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Formato JSON esperado:</strong>
                        <pre style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', overflowX: 'auto' }}>{`{
  "catalogo_ingredientes": [
    {
      "ingrediente": "Harina Trigo",
      "unidad_medida": "kg",
      "peso": 50,
      "costo": 260
    }
  ],
  "recetas": [
    {
      "nombre": "Pan Integral",
      "resumen": { "unidades_producidas": 50, "precio_venta_pvp": 3.5 },
      "ingredientes": [
        { "nombre": "Harina Trigo", "cantidad": 1.5, "unidad": "kg" }
      ]
    }
  ]
}`}</pre>
                    </div>
                </div>
            )}

            {/* Preview */}
            {preview && !resultado && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 className="section-title" style={{ marginBottom: 0 }}>
                            👁️ Vista previa — <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.9rem' }}>{archivo?.name}</span>
                        </h3>
                        <button className="btn btn-outline btn-sm" onClick={resetear}><MdClose /> Cambiar archivo</button>
                    </div>

                    {/* Resumen */}
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: '1.5rem' }}>
                        <div className="stat-card">
                            <div className="stat-info">
                                <h3>{preview.total_ingredientes || 0}</h3>
                                <p>Ingredientes</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-info">
                                <h3>{preview.total_recetas || 0}</h3>
                                <p>Recetas</p>
                            </div>
                        </div>
                    </div>

                    {/* Tabla ingredientes */}
                    {preview.ingredientes?.length > 0 && (
                        <div className="card" style={{ marginBottom: '1.5rem' }}>
                            <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>📦 Ingredientes a importar</h4>
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Nombre</th>
                                            <th>Unidad</th>
                                            <th>Peso compra</th>
                                            <th>Costo compra</th>
                                            <th>Costo Unit. calculado</th>
                                            <th>Costo/g</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview.ingredientes.map((ing, i) => (
                                            <tr key={i}>
                                                <td><strong>{ing.nombre}</strong></td>
                                                <td>{ing.unidad}</td>
                                                <td>{ing.peso_compra} {ing.unidad}</td>
                                                <td>R${parseFloat(ing.costo_compra || 0).toFixed(2)}</td>
                                                <td>R${parseFloat(ing.costo_unitario_calculado || 0).toFixed(4)}</td>
                                                <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                    R${parseFloat(ing.costo_por_gramo_calculado || 0).toFixed(6)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Tabla recetas */}
                    {preview.recetas?.length > 0 && (
                        <div className="card" style={{ marginBottom: '1.5rem' }}>
                            <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>📋 Recetas a importar</h4>
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Receta</th>
                                            <th>Rendimiento</th>
                                            <th>Ingredientes</th>
                                            <th>Mano de obra</th>
                                            <th>PVP sugerido</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview.recetas.map((rec, i) => (
                                            <tr key={i}>
                                                <td><strong>{rec.nombre}</strong></td>
                                                <td>{rec.rendimiento} und</td>
                                                <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                    {rec.num_ingredientes} ingredientes
                                                </td>
                                                <td>R${parseFloat(rec.mano_de_obra || 0).toFixed(2)}</td>
                                                <td>R${parseFloat(rec.pvp_sugerido || 0).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {totalImportar === 0 && (
                        <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
                            <MdWarning /> No se encontraron datos válidos para importar en este archivo.
                        </div>
                    )}

                    {/* Botones de acción */}
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                        <button className="btn btn-outline" onClick={resetear} disabled={loading}>
                            <MdClose /> Cancelar
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={ejecutar}
                            disabled={loading || totalImportar === 0}
                        >
                            {loading ? (
                                <><div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', display: 'inline-block', marginRight: '0.4rem' }}></div>Importando...</>
                            ) : (
                                <><MdCloudUpload /> Confirmar importación</>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Resultado */}
            {resultado && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 className="section-title" style={{ marginBottom: 0, color: 'var(--success)' }}>
                            <MdCheckCircle /> Importación Completada
                        </h3>
                        <button className="btn btn-outline btn-sm" onClick={resetear}>Nueva importación</button>
                    </div>

                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: '2rem' }}>
                        <div className="stat-card" style={{ borderLeft: '3px solid var(--success)' }}>
                            <div className="stat-info">
                                <h3>{resultado.ingredientes?.creados || 0}</h3>
                                <p>Ingredientes creados</p>
                            </div>
                        </div>
                        <div className="stat-card" style={{ borderLeft: '3px solid var(--warning)' }}>
                            <div className="stat-info">
                                <h3>{resultado.ingredientes?.actualizados || 0}</h3>
                                <p>Ingredientes actualizados</p>
                            </div>
                        </div>
                        <div className="stat-card" style={{ borderLeft: '3px solid var(--success)' }}>
                            <div className="stat-info">
                                <h3>{resultado.recetas?.creadas || 0}</h3>
                                <p>Recetas creadas</p>
                            </div>
                        </div>
                        <div className="stat-card" style={{ borderLeft: '3px solid var(--danger)' }}>
                            <div className="stat-info">
                                <h3>{(resultado.ingredientes?.errores || 0) + (resultado.recetas?.errores || 0)}</h3>
                                <p>Errores</p>
                            </div>
                        </div>
                    </div>

                    {/* Detalle de errores */}
                    {resultado.ingredientes?.detalle?.errores?.length > 0 && (
                        <div className="card" style={{ borderLeft: '3px solid var(--danger)', marginBottom: '1rem' }}>
                            <h4 style={{ color: 'var(--danger)', marginBottom: '0.5rem', fontSize: '0.9rem' }}><MdError /> Errores en ingredientes</h4>
                            {resultado.ingredientes.detalle.errores.map((e, i) => (
                                <p key={i} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.15rem 0' }}>• {e}</p>
                            ))}
                        </div>
                    )}

                    {resultado.recetas?.detalle?.errores?.length > 0 && (
                        <div className="card" style={{ borderLeft: '3px solid var(--danger)', marginBottom: '1rem' }}>
                            <h4 style={{ color: 'var(--danger)', marginBottom: '0.5rem', fontSize: '0.9rem' }}><MdError /> Errores en recetas</h4>
                            {resultado.recetas.detalle.errores.map((e, i) => (
                                <p key={i} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.15rem 0' }}>• {e}</p>
                            ))}
                        </div>
                    )}

                    {resultado.recetas?.detalle?.omitidas?.length > 0 && (
                        <div className="card" style={{ borderLeft: '3px solid var(--warning)', marginBottom: '1rem' }}>
                            <h4 style={{ color: 'var(--warning)', marginBottom: '0.5rem', fontSize: '0.9rem' }}><MdWarning /> Recetas omitidas</h4>
                            {resultado.recetas.detalle.omitidas.map((e, i) => (
                                <p key={i} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.15rem 0' }}>• {e}</p>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
