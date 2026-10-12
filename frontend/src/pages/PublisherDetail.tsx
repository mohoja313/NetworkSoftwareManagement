import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchPublisher, fetchSoftware } from '../api';
import { useLang } from '../i18n';
import type { Publisher, Software } from '../types';
import SoftwareCard from '../components/SoftwareCard';
import { GridSkeleton } from '../components/Skeletons';
import { Empty, ErrorState } from '../components/States';

const PLATFORMS = ['', 'ANDROID', 'WINDOWS', 'LINUX', 'MACOS'] as const;

export default function PublisherDetail() {
  const { id } = useParams();
  const { t } = useLang();
  const [pub, setPub] = useState<Publisher | null>(null);
  const [items, setItems] = useState<Software[]>([]);
  const [chip, setChip] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([fetchPublisher(id ?? ''), fetchSoftware({ publisherId: id ?? '', size: 50 })])
      .then(([p, list]) => {
        if (!alive) return;
        setPub(p);
        setItems(list.content);
      })
      .catch((e: Error) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) return <GridSkeleton n={6} />;
  if (error || !pub) return <ErrorState message={error || 'Not found'} onRetry={() => window.location.reload()} />;

  const filtered = chip ? items.filter((s) => s.platform === chip) : items;

  return (
    <div>
      <div className="glass flex items-center gap-4 rounded-3xl p-6 shadow-card">
        <span className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-brand-500 to-violet-600 text-2xl font-extrabold text-white">
          {pub.displayName.slice(0, 1).toUpperCase()}
        </span>
        <div>
          <h1 className="text-2xl font-extrabold">{pub.displayName}</h1>
          <p className="text-sm text-slate-500" dir="ltr">{pub.email}</p>
          <p className="mt-1 text-xs text-slate-500">
            {pub.softwareCount.toLocaleString()} {t('softwareCount')}
            {pub.joinedAt && <> · {t('joinedAt')}: {new Date(pub.joinedAt).toLocaleDateString()}</>}
            {pub.firstPublishedAt && <> · {t('firstPublish')}: {new Date(pub.firstPublishedAt).toLocaleDateString()}</>}
          </p>
        </div>
      </div>

      <h2 className="mt-8 font-extrabold">{t('theirSoftware')}</h2>
      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label={t('platform')}>
        {PLATFORMS.map((p) => (
          <button
            key={p || 'all'}
            type="button"
            onClick={() => setChip(p)}
            className={`rounded-full px-3.5 py-2 text-xs font-bold transition ${
              chip === p
                ? 'bg-brand-600 text-white shadow-lift'
                : 'border border-slate-200 bg-white hover:bg-slate-100 dark:border-white/10 dark:bg-slate-900 dark:hover:bg-white/10'
            }`}
          >
            {p === '' ? t('all') : p}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {filtered.length === 0 ? (
          <Empty />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((sw, i) => (
              <SoftwareCard key={sw.id} sw={sw} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
