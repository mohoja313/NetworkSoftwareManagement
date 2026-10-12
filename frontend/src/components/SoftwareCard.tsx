import { motion } from 'framer-motion';
import { Download, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { iconUrl } from '../api';
import { useLang } from '../i18n';
import type { Software } from '../types';

const badge: Record<string, string> = {
  ANDROID: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  WINDOWS: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  LINUX: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  MACOS: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
};

export default function SoftwareCard({ sw, index = 0 }: { sw: Software; index?: number }) {
  const { t } = useLang();
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.4) }}
    >
      <Link
        to={`/software/${sw.id}`}
        aria-label={`${sw.name} ${sw.version}`}
        className="glass group flex h-full flex-col rounded-3xl p-4 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-lift"
      >
        <div className="flex items-start gap-3">
          {sw.hasIcon ? (
            <img
              src={iconUrl(sw.id)}
              alt=""
              loading="lazy"
              className="h-12 w-12 shrink-0 rounded-2xl border border-slate-200 object-cover dark:border-white/10"
            />
          ) : (
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 text-white">
              <Package className="h-6 w-6" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-extrabold leading-tight group-hover:text-brand-600">{sw.name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400" dir="ltr">
              v{sw.version} · {sw.fileSizeFormatted}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${badge[sw.platform] ?? 'bg-slate-500/15'}`}>
            {sw.platformLabel || sw.platform}
          </span>
        </div>
        <p className="clamp-2 mt-3 min-h-[2.5rem] text-sm text-slate-600 dark:text-slate-300">{sw.description}</p>
        <div className="mt-3 flex items-center justify-between border-t border-slate-200/70 pt-3 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
          <span className="truncate">{sw.publisher.displayName}</span>
          <span className="flex items-center gap-1 tabular-nums" title={t('downloads')}>
            <Download className="h-3.5 w-3.5" />
            {sw.downloadCount.toLocaleString()}
          </span>
        </div>
      </Link>
    </motion.article>
  );
}
