/**
 * Excel — importar y exportar datos desde/hacia Excel.
 */

import { useState } from 'react';
import { excelAPI, descargarExcel } from '../services/api';
import { MdUploadFile, MdDownload, MdCloudUpload } from 'react-icons/md';

export default function Excel() {
    const [msg, setMsg] = useState(null);
    const [importResult, setImportResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleImport = async (tipo) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx,.xls';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            setLoading(true);
            setImportResult(null);
            try {
                const res = tipo === 'ingredientes'
                    ? await excelAPI.importarIngredientes(file)
                    : await excelAPI.importarRecetas(file);
                setImportResult(res.data);
                setMsg({ tipo: 'success', texto: `✅ Importación completada` });
            } catch (err) {
                setMsg({ tipo: 'danger', texto: err.response?.data?.detail || 'Error al importar' });
            }
            setLoading(false);
        };
        input.click();
    };

    const handleExport = async (tipo) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
            const endpoint = tipo === 'stock' ? 'exportar/stock.xlsx' : 'exportar/movimientos.xlsx';
            const url = `${baseUrl}/excel/${endpoint}?token=${token}`;

            // Delegar la descarga nativa al navegador leyendo el Content-Disposition del Backend
            window.location.assign(url);

            setMsg({ tipo: 'success', texto: `✅ Descargando archivo...` });
        } catch (err) {
            console.error(err);
            setMsg({ tipo: 'danger', texto: 'Error al exportar' });
        }
        setLoading(false);
    };

    return (
        <div>
            <div className="page-header">
                <h1>📥 Importar / Exportar Excel</h1>
                <p>Carga masiva de datos y descarga de reportes</p>
            </div>

            {msg && (
                <div className={`alert alert-${msg.tipo}`}>{msg.texto}
                    <button onClick={() => setMsg(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
                </div>
            )}

            {loading && <div className="loading"><div className="spinner"></div></div>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {/* Importar */}
                <div className="card">
                    <h3 className="section-title"><MdUploadFile /> Importar Datos</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                        Sube archivos Excel (.xlsx) para cargar datos masivamente al sistema.
                    </p>

                    <div className="file-upload" onClick={() => handleImport('ingredientes')} style={{ marginBottom: '1rem' }}>
                        <div className="upload-icon"><MdCloudUpload /></div>
                        <p><strong>Importar Ingredientes</strong></p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            Columnas: nombre | unidad_medida | costo | stock_inicial | stock_minimo
                        </p>
                    </div>

                    <div className="file-upload" onClick={() => handleImport('recetas')}>
                        <div className="upload-icon"><MdCloudUpload /></div>
                        <p><strong>Importar Recetas</strong></p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            Columnas: producto | ingrediente | cantidad | unidad
                        </p>
                    </div>
                </div>

                {/* Exportar */}
                <div className="card">
                    <h3 className="section-title"><MdDownload /> Exportar Reportes</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                        Descarga reportes en formato Excel con datos actualizados.
                    </p>

                    <button className="btn btn-primary btn-block" onClick={() => handleExport('stock')} style={{ marginBottom: '0.75rem' }}>
                        <MdDownload /> Exportar Stock de Ingredientes
                    </button>
                    <button className="btn btn-outline btn-block" onClick={() => handleExport('movimientos')}>
                        <MdDownload /> Exportar Historial de Movimientos
                    </button>
                </div>
            </div>

            {/* Resultado de importación */}
            {importResult && (
                <div className="card" style={{ marginTop: '1.5rem' }}>
                    <h3 className="section-title">📊 Resultado de Importación</h3>
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                        {importResult.importados !== undefined && (
                            <div className="stat-card"><div className="stat-info"><h3>{importResult.importados}</h3><p>Importados</p></div></div>
                        )}
                        {importResult.recetas_creadas !== undefined && (
                            <div className="stat-card"><div className="stat-info"><h3>{importResult.recetas_creadas}</h3><p>Recetas Creadas</p></div></div>
                        )}
                        {importResult.detalles_importados !== undefined && (
                            <div className="stat-card"><div className="stat-info"><h3>{importResult.detalles_importados}</h3><p>Detalles</p></div></div>
                        )}
                        {importResult.errores?.length > 0 && (
                            <div className="stat-card"><div className="stat-info"><h3 style={{ color: 'var(--danger)' }}>{importResult.errores.length}</h3><p>Errores</p></div></div>
                        )}
                    </div>
                    {importResult.errores?.length > 0 && (
                        <div style={{ marginTop: '1rem' }}>
                            <h4 style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>Errores:</h4>
                            {importResult.errores.map((err, i) => (
                                <div key={i} className="alert alert-danger" style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>
                                    Fila {err.fila}: {err.error}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
