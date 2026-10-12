import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Copy, Check, Package, Pencil, Trash2, Loader2 } from 'lucide-react';
import { deleteSoftware, downloadUrl, fetchSoftwareById, iconUrl, updateSoftware, ApiError } from '../api';
import { useAuth } from '../auth';
import { useLang } from '../i18n';
import { useToast } from '../toast';
import type { Platform, Software } from '../types';
import { ErrorState } from '../components/States';

export default function Detail() {
  const { id } = useParams();
  const { t } = useLang();
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sw, setSw] = useState<Software | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: '', version: '', description: '', platform: 'ANDROID' as Platform });

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    fetchSoftwareById(id ?? '')
      .then((s) => {
        if (!alive) return;
        setSw(s);
        setForm({ name: s.name, version: s.version, description: s.description, platform: s.platform });
      })
      .catch((e: Error) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  const isOwner = !!user && !!sw && user.email.toLowerCase() === sw.publisher.email.toLowerCase();

  async function copySha() {
    if (!sw) return;
    try {
      await navigator.clipboard.writeText(sw.sha256);
      setCopied(true);
      toast(t('copied'), 'success');
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast('Copy failed', 'error');
    }
  }

  async function save() {
    if (!sw) return;
    setBusy(true);
    try {
      const updated = await updateSoftware(sw.id, form);
      setSw(updated);
      setEditing(false);
      toast(t('save'), 'success');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!sw) return;
    if (!window.confirm(t('confirmDelete'))) return;
    setBusy(true);
    try {
      await deleteSoftware(sw.id);
      toast(t('remove'), 'success');
      navigate('/browse');
    } catch (e) {
      const err = e as ApiError;
      toast(err.message, 'error');
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="glass rounded-3xl p-6 shadow-card" aria-label={t('loading')}>
        <div className="flex gap-5">
          <div className="skeleton-shimmer h-24 w-24 rounded-3xl" />
          <div className="flex-1 space-y-3">
            <div className="skeleton-shimmer h-6 w-1/2 rounded-xl" />
            <div className="skeleton-shimmer h-4 w-1/3 rounded-xl" />
            <div className="skeleton-shimmer h-16 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }
  if (error || !sw) return <ErrorState message={error || 'Not found'} onRetry={() => window.location.reload()} />;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-6 shadow-card sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row">
        {sw.hasIcon ? (
          <img src={iconUrl(sw.id)} alt="" className="h-24 w-24 rounded-3xl border border-slate-200 object-cover dark:border-white/10" />
        ) : (
          <span className="grid h-24 w-24 place-items-center rounded-3xl bg-gradient-to-br from-brand-500 to-violet-600 text-white">
            <Package className="h-12 w-12" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-xs font-bold">{t('name')}
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-white/10" />
              </label>
              <label className="text-xs font-bold">{t('version')}
                <input value={form.version} dir="ltr" onChange={(e) => setForm({ ...form, version: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-white/10" />
              </label>
              <label className="text-xs font-bold">{t('platform')}
                <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value as Platform })} className="mt-1 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm outline-none dark:border-white/10 dark:bg-slate-900">
                  <option value="ANDROID">ANDROID</option>
                  <option value="WINDOWS">WINDOWS</option>
                  <option value="LINUX">LINUX</option>
                  <option value="MACOS">MACOS</option>
                </select>
              </label>
              <div className="flex items-end gap-2">
                <button type="button" onClick={save} disabled={busy} className="flex items-center gap-1 rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-500 disabled:opacity-60">
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}{t('save')}
                </button>
                <button type="button" onClick={() => setEditing(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold dark:border-white/10">{t('cancel')}</button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold">{sw.name}</h1>
                <span className="rounded-full bg-brand-500/15 px-2.5 py-1 text-[11px] font-bold text-brand-600 dark:text-brand-300">{sw.platformLabel || sw.platform}</span>
                <span className="rounded-full bg-slate-500/15 px-2.5 py-1 text-[11px] font-bold tabular-nums" dir="ltr">v{sw.version}</span>
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t('size')}: <span className="tabular-nums" dir="ltr">{sw.fileSizeFormatted}</span> · {t('downloads')}: <span className="tabular-nums">{sw.downloadCount.toLocaleString()}</span>
              </p>
            </>
          )}
          <a
            href={downloadUrl(sw.id)}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-6 py-3 font-extrabold text-white shadow-lift transition hover:bg-brand-500"
          >
            <Download className="h-5 w-5" /> {t('download')}
          </a>
          {isOwner && !editing && (
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/10">
                <Pencil className="h-3.5 w-3.5" /> {t('edit')}
              </button>
              <button type="button" onClick={remove} disabled={busy} className="flex items-center gap-1 rounded-xl border border-rose-300 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10">
                <Trash2 className="h-3.5 w-3.5" /> {t('remove')}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <h2 className="font-extrabold">{t('description')}</h2>
        {editing ? (
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="mt-2 w-full rounded-2xl border border-slate-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-white/10" />
        ) : (
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-200">{sw.description}</p>
        )}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
          <div className="text-xs font-bold text-slate-500">{t('sha256')}</div>
          <div className="mt-1 flex items-center gap-2">
            <code dir="ltr" className="min-w-0 flex-1 break-all font-mono text-[11px] leading-5">{sw.sha256}</code>
            <button type="button" onClick={copySha} aria-label={t('copy')} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-white/10">
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <div className="mt-2 text-xs text-slate-500" dir="ltr">{sw.fileName}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 p-4 text-sm dark:border-white/10">
          <div className="text-xs font-bold text-slate-500">{t('publisher')}</div>
          <Link to={`/publishers/${sw.publisher.id}`} className="mt-1 inline-block font-bold text-brand-600 hover:underline">
            {sw.publisher.displayName}
          </Link>
          <p className="mt-2 text-xs text-slate-500">
            {t('publishedBy')} {sw.publisher.displayName} {t('fromIp')} <span dir="ltr" className="font-mono">{sw.uploaderIp}</span> {t('at')} {new Date(sw.publishedAt).toLocaleString()}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
