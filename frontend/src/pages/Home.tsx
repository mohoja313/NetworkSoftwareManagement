import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X, ArrowRight, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchPublishers, fetchSoftware, fetchStats } from '../api';
import { useLang } from '../i18n';
import type { Publisher, Software, Stats } from '../types';
import PlatformCards from '../components/PlatformCards';
import SoftwareCard from '../components/SoftwareCard';
import { RowSkeleton } from '../components/Skeletons';
import { Empty } from '../components/States';

const PLATFORMS = ['', 'ANDROID', 'WINDOWS', 'LINUX', 'MACOS'] as const;

function useDebounced(value: string, ms: number): string {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return v;
}

export default function Home() {
  const { t } = useLang();
  const [stats, setStats] = useState<Stats | null>(null);
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [newest, setNewest] = useState<Software[]>([]);
  const [popular, setPopular] = useState<Software[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);

  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [chip, setChip] = useState<string>('');
  const [sort, setSort] = useState<'newest' | 'popular' | 'size'>('newest');
  const [results, setResults] = useState<Software[]>([]);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const debounced = useDebounced(query, 300);
  const searchMode = focused || debounced.trim().length > 0;

  useEffect(() => {
    let alive = true;
    fetchStats().then((s) => alive && setStats(s)).catch(() => {});
    fetchPublishers().then((p) => alive && setPublishers(p.slice(0, 6))).catch(() => {});
    Promise.all([fetchSoftware({ sort: 'newest', size: 8 }), fetchSoftware({ sort: 'popular', size: 8 })])
      .then(([n, p]) => {
        if (!alive) return;
        setNewest(n.content);
        setPopular(p.content);
      })
      .catch(() => {})
      .finally(() => alive && setLoadingRows(false));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!searchMode) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    let alive = true;
    fetchSoftware({ q: debounced, platform: chip || undefined, sort, size: 20 })
      .then((r) => alive && setResults(r.content))
      .catch(() => alive && setResults([]))
      .finally(() => alive && setSearching(false));
    return () => {
      alive = false;
    };
  }, [debounced, chip, sort, searchMode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea';
      if (e.key === '/' && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (document.activeElement === searchRef.current) searchRef.current?.blur();
        setQuery('');
        setChip('');
        setFocused(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const clear = useCallback(() => {
    setQuery('');
    setChip('');
    setResults([]);
    searchRef.current?.focus();
  }, []);

  const statsCards = useMemo(
    () => [
      { label: t('totalSoftware'), value: stats?.totalSoftware ?? 0 },
      { label: t('totalDownloads'), value: stats?.totalDownloads ?? 0 },
      { label: t('totalPublishers'), value: stats?.totalPublishers ?? 0 },
    ],
    [stats, t],
  );

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-violet-600 to-fuchsia-600 p-8 text-white shadow-lift sm:p-12">
        <div className="pointer-events-none absolute -top-24 -end-24 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -start-16 h-72 w-72 rounded-full bg-black/20 blur-3xl" />
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="relative">
          <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">{t('appName')}</h1>
          <p className="mt-3 max-w-2xl text-white/85">{t('tagline')}</p>
          <div className="mt-6 flex items-center gap-2 rounded-2xl bg-white/95 p-2 text-slate-900 shadow-xl backdrop-blur">
            <Search className="ms-2 h-5 w-5 shrink-0 text-slate-400" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              placeholder={t('searchPlaceholder')}
              aria-label={t('search')}
              className="w-full bg-transparent py-2 text-sm font-medium outline-none placeholder:text-slate-400"
            />
            {query && (
              <button
                type="button"
                onClick={clear}
                aria-label={t('clear')}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-xl hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <Link
              to={`/browse?q=${encodeURIComponent(query)}${chip ? `&platform=${chip}` : ''}`}
              className="shrink-0 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700"
            >
              {t('search')}
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <div className="flex gap-1.5" role="group" aria-label={t('platform')}>
              {PLATFORMS.map((p) => (
                <button
                  key={p || 'all'}
                  type="button"
                  onClick={() => setChip(p)}
                  className={`rounded-full px-3 py-1.5 font-bold backdrop-blur transition ${
                    chip === p ? 'bg-white text-slate-900' : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  {p === '' ? t('all') : p}
                </button>
              ))}
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as 'newest' | 'popular' | 'size')}
              aria-label={t('sort')}
              className="rounded-full bg-white/20 px-3 py-1.5 font-bold text-white outline-none backdrop-blur [&>option]:text-slate-900"
            >
              <option value="newest">{t('sortNewest')}</option>
              <option value="popular">{t('sortPopular')}</option>
              <option value="size">{t('sortSize')}</option>
            </select>
          </div>
        </motion.div>
      </section>

      {/* Live search results */}
      <AnimatePresence>
        {searchMode && (
          <motion.section
            key="search-results"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
            aria-live="polite"
          >
            <div className="mt-6 flex items-center justify-between">
              <h2 className="font-extrabold">
                {t('resultsFor')} <span dir="auto">“{debounced || '…'}”</span>
                <span className="ms-2 text-xs font-medium text-slate-500">({t('escToClear')})</span>
              </h2>
              <button type="button" onClick={clear} className="flex items-center gap-1 text-sm text-slate-500 hover:underline">
                <X className="h-4 w-4" /> {t('clear')}
              </button>
            </div>
            <div className="mt-3">
              {searching ? (
                <RowSkeleton n={4} />
              ) : results.length === 0 ? (
                <Empty />
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {results.map((sw, i) => (
                    <SoftwareCard key={sw.id} sw={sw} index={i} />
                  ))}
                </div>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Collapsible sections */}
      <AnimatePresence initial={false}>
        {!searchMode && (
          <motion.div
            key="home-sections"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-10 overflow-hidden"
          >
            <section className="mt-8 grid grid-cols-3 gap-3">
              {statsCards.map((s) => (
                <div key={s.label} className="glass rounded-3xl p-4 text-center shadow-card">
                  <div className="text-2xl font-extrabold tabular-nums">{s.value.toLocaleString()}</div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{s.label}</div>
                </div>
              ))}
            </section>

            <section>
              <PlatformCards stats={stats} />
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-extrabold">
                  <Users className="h-5 w-5 text-brand-500" /> {t('publishers')}
                </h2>
                <Link to="/publishers" className="flex items-center gap-1 text-sm font-bold text-brand-600 hover:underline">
                  {t('viewAll')} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {publishers.map((p) => (
                  <Link
                    key={p.id}
                    to={`/publishers/${p.id}`}
                    className="glass rounded-2xl p-4 text-center shadow-card transition hover:-translate-y-1 hover:shadow-lift"
                  >
                    <div className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 font-extrabold text-white">
                      {p.displayName.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="mt-2 truncate text-sm font-bold">{p.displayName}</div>
                    <div className="text-xs tabular-nums text-slate-500">{p.softwareCount}</div>
                  </Link>
                ))}
              </div>
            </section>

            <RowSection title={t('newest')} link="/browse?sort=newest" items={newest} loading={loadingRows} />
            <RowSection title={t('popular')} link="/browse?sort=popular" items={popular} loading={loadingRows} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RowSection({ title, link, items, loading }: { title: string; link: string; items: Software[]; loading: boolean }) {
  const { t } = useLang();
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-extrabold">{title}</h2>
        <Link to={link} className="flex items-center gap-1 text-sm font-bold text-brand-600 hover:underline">
          {t('viewAll')} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </Link>
      </div>
      {loading ? (
        <RowSkeleton n={4} />
      ) : items.length === 0 ? (
        <Empty />
      ) : (
        <div className="grid grid-flow-col auto-cols-[240px] gap-3 overflow-x-auto pb-2 sm:auto-cols-[280px]">
          {items.map((sw, i) => (
            <SoftwareCard key={sw.id} sw={sw} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
