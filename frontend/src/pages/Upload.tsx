import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Smartphone, AppWindow, Terminal, Command, FileUp, ImagePlus, Loader2, Package } from 'lucide-react';
import { uploadSoftware, ApiError } from '../api';
import { useAuth } from '../auth';
import { useLang } from '../i18n';
import { useToast } from '../toast';
import type { Platform } from '../types';

const PLATFORM_OPTS: Array<{ key: Platform; icon: typeof Smartphone; grad: string }> = [
  { key: 'ANDROID', icon: Smartphone, grad: 'from-emerald-400 to-green-600' },
  { key: 'WINDOWS', icon: AppWindow, grad: 'from-sky-400 to-blue-600' },
  { key: 'LINUX', icon: Terminal, grad: 'from-amber-400 to-orange-600' },
  { key: 'MACOS', icon: Command, grad: 'from-violet-400 to-purple-600' },
];

export default function Upload() {
  const { t } = useLang();
  const { toast } = useToast();
  const { user, setAuthOpen } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [icon, setIcon] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [version, setVersion] = useState('');
  const [description, setDescription] = useState('');
  const [platform, setPlatform] = useState<Platform | ''>('');
  const [drag, setDrag] = useState(false);
  const [pct, setPct] = useState(0);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const iconRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) setAuthOpen(true);
  }, [user, setAuthOpen]);

  useEffect(() => {
    if (!icon) {
      setIconPreview(null);
      return;
    }
    const url = URL.createObjectURL(icon);
    setIconPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [icon]);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) {
      setFile(f);
      if (!name) setName(f.name.replace(/\.[^.]+$/, ''));
    }
  }

  async function submit() {
    if (!user) {
      setAuthOpen(true);
      toast(t('needLogin'), 'error');
      return;
    }
    if (!file) {
      toast(t('file'), 'error');
      return;
    }
    if (!name.trim() || !version.trim()) {
      toast(`${t('name')} / ${t('version')}`, 'error');
      return;
    }
    if (!platform) {
      toast(t('platformRequired'), 'error');
      return;
    }
    setBusy(true);
    setPct(0);
    try {
      const created = await uploadSoftware(
        { file, icon, name: name.trim(), version: version.trim(), description, platform },
        setPct,
      );
      toast(t('publish'), 'success');
      navigate(`/software/${created.id}`);
    } catch (e) {
      const err = e as ApiError;
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-extrabold">{t('upload')}</h1>
      {!user && <p className="mt-1 text-sm text-amber-600">{t('needLogin')}</p>}

      <div className="mt-6 space-y-5">
        <div
          role="button"
          tabIndex={0}
          aria-label={t('file')}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          className={`glass flex cursor-pointer flex-col items-center rounded-3xl border-2 border-dashed px-6 py-10 text-center shadow-card transition ${
            drag ? 'border-brand-500 bg-brand-500/10' : 'border-slate-300 dark:border-white/15'
          }`}
        >
          <FileUp className="h-10 w-10 text-brand-500" />
          <p className="mt-3 font-bold">{t('dropHere')}</p>
          {file && (
            <p className="mt-2 rounded-full bg-brand-500/15 px-3 py-1 font-mono text-xs" dir="ltr">
              {file.name} · {(file.size / 1048576).toFixed(2)} MB
            </p>
          )}
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setFile(f);
                if (!name) setName(f.name.replace(/\.[^.]+$/, ''));
              }
            }}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-bold">{t('name')}
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-white/10 dark:bg-slate-900" />
          </label>
          <label className="text-sm font-bold">{t('version')}
            <input value={version} dir="ltr" onChange={(e) => setVersion(e.target.value)} placeholder="1.0.0" className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-white/10 dark:bg-slate-900" />
          </label>
        </div>
        <label className="block text-sm font-bold">{t('description')}
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-white/10 dark:bg-slate-900" />
        </label>

        <fieldset>
          <legend className="text-sm font-bold">{t('platform')} *</legend>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4" role="radiogroup" aria-label={t('platform')}>
            {PLATFORM_OPTS.map((o) => {
              const Icon = o.icon;
              const active = platform === o.key;
              return (
                <button
                  key={o.key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setPlatform(o.key)}
                  className={`rounded-3xl border-2 p-4 text-center transition hover:-translate-y-0.5 ${
                    active
                      ? 'border-brand-500 bg-brand-500/10 shadow-lift'
                      : 'border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900'
                  }`}
                >
                  <span className={`mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br text-white ${o.grad}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="mt-2 text-xs font-extrabold">{o.key}</div>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div>
          <div className="text-sm font-bold">{t('icon')}</div>
          <button
            type="button"
            onClick={() => iconRef.current?.click()}
            className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:hover:bg-white/5"
          >
            {iconPreview ? (
              <img src={iconPreview} alt="" className="h-10 w-10 rounded-xl object-cover" />
            ) : (
              <ImagePlus className="h-6 w-6 text-slate-400" />
            )}
            <span className="font-mono text-xs" dir="ltr">{icon?.name ?? '…'}</span>
          </button>
          <input ref={iconRef} type="file" accept="image/*" className="hidden" onChange={(e) => setIcon(e.target.files?.[0] ?? null)} />
        </div>

        {/* Preview */}
        <div className="glass rounded-3xl p-4 shadow-card">
          <div className="text-sm font-extrabold">{t('preview')}</div>
          <div className="mt-2 flex items-center gap-3">
            {iconPreview ? (
              <img src={iconPreview} alt="" className="h-12 w-12 rounded-2xl object-cover" />
            ) : (
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 text-white">
                <Package className="h-6 w-6" />
              </span>
            )}
            <div className="min-w-0">
              <div className="truncate font-extrabold">{name || '—'}</div>
              <div className="text-xs text-slate-500" dir="ltr">v{version || '—'} · {platform || '—'}</div>
            </div>
          </div>
        </div>

        {busy && (
          <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t('uploading')} className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
            <div className="flex justify-between text-xs font-bold tabular-nums">
              <span>{t('uploading')}…</span>
              <span dir="ltr">{pct}%</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500" animate={{ width: `${pct}%` }} transition={{ ease: 'easeOut', duration: 0.2 }} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 font-extrabold text-white shadow-lift transition hover:bg-brand-500 disabled:opacity-60"
        >
          {busy && <Loader2 className="h-5 w-5 animate-spin" />}
          {busy ? `${t('uploading')} ${pct}%` : t('publish')}
        </button>
      </div>
    </div>
  );
}
