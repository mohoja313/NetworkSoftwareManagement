import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { fetchPublishers } from '../api';
import { useLang } from '../i18n';
import type { Publisher } from '../types';
import { ErrorState, Empty } from '../components/States';

export default function Publishers() {
  const { t } = useLang();
  const [items, setItems] = useState<Publisher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    fetchPublishers()
      .then((p) => alive && setItems(p))
      .catch((e: Error) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div>
      <h1 className="flex items-center gap-2 text-2xl font-extrabold">
        <Users className="h-6 w-6 text-brand-500" /> {t('publishers')}
      </h1>
      <div className="mt-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label={t('loading')}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass rounded-3xl p-5 shadow-card">
                <div className="skeleton-shimmer h-11 w-11 rounded-2xl" />
                <div className="skeleton-shimmer mt-3 h-4 w-2/3 rounded-lg" />
                <div className="skeleton-shimmer mt-2 h-3 w-1/3 rounded-lg" />
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={() => window.location.reload()} />
        ) : items.length === 0 ? (
          <Empty />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <Link key={p.id} to={`/publishers/${p.id}`} className="glass rounded-3xl p-5 shadow-card transition hover:-translate-y-1 hover:shadow-lift">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 font-extrabold text-white">
                    {p.displayName.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-extrabold">{p.displayName}</div>
                    <div className="truncate text-xs text-slate-500" dir="ltr">{p.email}</div>
                  </div>
                </div>
                <div className="mt-3 text-xs tabular-nums text-slate-500">
                  {p.softwareCount.toLocaleString()} {t('softwareCount')}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
