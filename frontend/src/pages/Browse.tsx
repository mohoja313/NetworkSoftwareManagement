import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { fetchSoftware } from '../api';
import { useLang } from '../i18n';
import type { Software } from '../types';
import SoftwareCard from '../components/SoftwareCard';
import { GridSkeleton } from '../components/Skeletons';
import { Empty, ErrorState } from '../components/States';

const PLATFORMS = ['', 'ANDROID', 'WINDOWS', 'LINUX', 'MACOS'] as const;

export default function Browse() {
  const { t } = useLang();
  const [params, setParams] = useSearchParams();
  const platform = params.get('platform') ?? '';
  const q = params.get('q') ?? '';
  const sort = params.get('sort') ?? 'newest';
  const [items, setItems] = useState<Software[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState(q);

  useEffect(() => setDraft(q), [q]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    fetchSoftware({ platform: platform || undefined, q: q || undefined, sort, size: 24 })
      .then((r) => {
        if (!alive) return;
        setItems(r.content);
        setTotal(r.totalElements);
      })
      .catch((e: Error) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [platform, q, sort]);

  function set(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold">{t('browse')}</h1>
      <p className="mt-1 text-sm tabular-nums text-slate-500">{total.toLocaleString()} {t('softwareCount')}</p>

      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 dark:border-white/10 dark:bg-slate-900">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && set('q', draft)}
            placeholder={t('searchPlaceholder')}
            aria-label={t('search')}
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
          {draft && (
            <button type="button" aria-label={t('clear')} onClick={() => { setDraft(''); set('q', ''); }} className="grid h-7 w-7 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-white/10">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t('platform')}>
          {PLATFORMS.map((p) => (
            <button
              key={p || 'all'}
              type="button"
              onClick={() => set('platform', p)}
              className={`rounded-full px-3.5 py-2 text-xs font-bold transition ${
                platform === p
                  ? 'bg-brand-600 text-white shadow-lift'
                  : 'border border-slate-200 bg-white hover:bg-slate-100 dark:border-white/10 dark:bg-slate-900 dark:hover:bg-white/10'
              }`}
            >
              {p === '' ? t('all') : p}
            </button>
          ))}
          <select
            value={sort}
            onChange={(e) => set('sort', e.target.value)}
            aria-label={t('sort')}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none dark:border-white/10 dark:bg-slate-900"
          >
            <option value="newest">{t('sortNewest')}</option>
            <option value="popular">{t('sortPopular')}</option>
            <option value="size">{t('sortSize')}</option>
          </select>
        </div>
      </div>

      <div className="mt-6">
        {loading ? (
          <GridSkeleton n={8} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => set('sort', sort)} />
        ) : items.length === 0 ? (
          <Empty />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((sw, i) => (
              <SoftwareCard key={sw.id} sw={sw} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
