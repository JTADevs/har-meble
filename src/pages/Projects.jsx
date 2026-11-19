import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { pln } from '../../shared/pricing.js';
import { StatusBadge, toast } from '../components/ui.jsx';

const fmtDate = (iso) => new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });

export default function Projects() {
  const [projects, setProjects] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  useEffect(() => {
    api('/api/projects')
      .then((r) => setProjects(r.projects))
      .catch((e) => {
        toast(e.message, 'bad');
        setProjects([]);
      });
  }, []);

  const remove = async (id) => {
    try {
      await api(`/api/projects/${id}`, { method: 'DELETE' });
      setProjects((ps) => ps.filter((p) => p.id !== id));
      toast('Projekt usunięty.');
    } catch (e) {
      toast(e.message, 'bad');
    }
    setConfirmId(null);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Moje projekty</h2>
          <p className="muted">Zapisane konfiguracje i status Twoich zapytań ofertowych.</p>
        </div>
        <div className="row-gap">
          <Link className="btn" to="/konfigurator/szafa">
            + Nowa szafa
          </Link>
          <Link className="btn btn-primary" to="/konfigurator/kuchnia">
            + Nowa kuchnia
          </Link>
        </div>
      </div>
      {projects === null && <p className="muted">Ładowanie…</p>}
      {projects?.length === 0 && (
        <div className="empty">
          <p>Nie masz jeszcze żadnych projektów.</p>
          <Link className="btn btn-primary" to="/konfigurator/kuchnia">
            Zaprojektuj pierwszą kuchnię
          </Link>
        </div>
      )}
      <div className="project-grid">
        {projects?.map((p) => (
          <article key={p.id} className="project-card">
            <div className="project-top">
              <span className="tag">{p.type === 'szafa' ? 'Szafa' : 'Kuchnia'}</span>
              <StatusBadge status={p.status} />
            </div>
            <h3>{p.name}</h3>
            <div className="project-price">
              {p.offerPrice ? (
                <>
                  <b>{pln(p.offerPrice)}</b> <small>oferta stolarni</small>
                </>
              ) : (
                <>
                  <b>{pln(p.price.gross)}</b> <small>wg konfiguratora</small>
                </>
              )}
            </div>
            {p.adminNote && <p className="admin-note">„{p.adminNote}”</p>}
            <p className="muted small">Zmieniono {fmtDate(p.updatedAt)}</p>
            <div className="project-actions">
              <Link className="btn btn-sm btn-primary" to={`/konfigurator/${p.type}/${p.id}`}>
                {p.status === 'szkic' ? 'Edytuj' : 'Podgląd'}
              </Link>
              {confirmId === p.id ? (
                <>
                  <button className="btn btn-sm btn-danger" onClick={() => remove(p.id)}>
                    Na pewno usunąć?
                  </button>
                  <button className="btn btn-sm" onClick={() => setConfirmId(null)}>
                    Anuluj
                  </button>
                </>
              ) : (
                <button className="btn btn-sm btn-ghost" onClick={() => setConfirmId(p.id)}>
                  Usuń
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
