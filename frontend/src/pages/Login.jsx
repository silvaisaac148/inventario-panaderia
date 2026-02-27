/**
 * Login — Autenticación de usuario.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.detail || 'Error al iniciar sesión');
        }
        setLoading(false);
    };

    return (
        <div className="login-page">
            <div className="login-card card">
                <div className="login-header">
                    <div className="login-logo">🏭</div>
                    <h1>Inventario Panadería</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Inicia sesión para continuar</p>
                </div>

                {error && <div className="alert alert-danger">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@panaderia.com" autoComplete="email" />
                    </div>
                    <div className="form-group">
                        <label>Contraseña</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••" autoComplete="current-password" />
                    </div>
                    <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ marginTop: '0.5rem' }}>
                        {loading ? 'Entrando...' : 'Iniciar Sesión'}
                    </button>
                </form>
            </div>
        </div>
    );
}
