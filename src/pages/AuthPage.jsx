import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { toast } from '../components/ui.jsx';
import { FEATURES } from '../../shared/site.js';

export default function AuthPage({ mode }) {
  const { login, register } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next');
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null;
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isLogin = mode === 'login';
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = isLogin ? await login(form.email, form.password) : await register(form);
      toast(isLogin ? `Witaj, ${user.name}!` : 'Konto utworzone. Witamy!');
      nav(safeNext || (user.role === 'admin' ? '/admin' : '/projekty'), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const demo = (email, password) => setForm((f) => ({ ...f, email, password }));
  const q = safeNext ? `?next=${encodeURIComponent(safeNext)}` : '';

  return (
    <div className="page narrow">
      <div className="auth-card">
        <h2>{isLogin ? 'Zaloguj się' : 'Załóż konto'}</h2>
        <p className="muted">
          {!isLogin
            ? 'Konto pozwala zapisywać projekty i wysyłać zapytania do stolarni.'
            : FEATURES.accounts
              ? 'Zapisuj projekty i śledź status zapytań ofertowych.'
              : 'Panel firmy: zapytania z formularza wyceny.'}
        </p>
        <form onSubmit={onSubmit} className="form">
          {!isLogin && (
            <label className="field">
              <span className="field-label">Imię i nazwisko</span>
              <input value={form.name} onChange={set('name')} required autoComplete="name" />
            </label>
          )}
          <label className="field">
            <span className="field-label">E-mail</span>
            <input type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
          </label>
          {!isLogin && (
            <label className="field">
              <span className="field-label">Telefon (opcjonalnie)</span>
              <input value={form.phone} onChange={set('phone')} autoComplete="tel" />
            </label>
          )}
          <label className="field">
            <span className="field-label">Hasło</span>
            <input type="password" value={form.password} onChange={set('password')} required minLength={6} autoComplete={isLogin ? 'current-password' : 'new-password'} />
          </label>
          {error && <div className="form-error">{error}</div>}
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Chwileczkę…' : isLogin ? 'Zaloguj się' : 'Utwórz konto'}
          </button>
        </form>
        {isLogin ? (
          <>
            {FEATURES.accounts && (
              <p className="auth-switch">
                Nie masz konta? <Link to={`/rejestracja${q}`}>Zarejestruj się</Link>
              </p>
            )}
            {/* konta testowe z seeda (server/db.js) – tylko w trybie deweloperskim, nigdy w buildzie produkcyjnym */}
            {import.meta.env.DEV && (
              <div className="demo-logins">
                <span className="muted small">Szybkie logowanie (demo):</span>
                {FEATURES.accounts && (
                  <button className="btn btn-sm" type="button" onClick={() => demo('klient@demo.pl', 'demo123')}>
                    Klient
                  </button>
                )}
                <button className="btn btn-sm" type="button" onClick={() => demo('admin@stolarnia.pl', 'admin123')}>
                  Stolarnia
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="auth-switch">
            Masz już konto? <Link to={`/logowanie${q}`}>Zaloguj się</Link>
          </p>
        )}
      </div>
    </div>
  );
}
