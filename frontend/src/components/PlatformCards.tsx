import { motion } from 'framer-motion';
import { Smartphone, AppWindow, Terminal, Command } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLang } from '../i18n';
import type { Stats } from '../types';

const CARDS = [
  { key: 'ANDROID', icon: Smartphone, grad: 'from-emerald-400 to-green-600', glow: 'shadow-emerald-500/25' },
  { key: 'WINDOWS', icon: AppWindow, grad: 'from-sky-400 to-blue-600', glow: 'shadow-sky-500/25' },
  { key: 'LINUX', icon: Terminal, grad: 'from-amber-400 to-orange-600', glow: 'shadow-orange-500/25' },
  { key: 'MACOS', icon: Command, grad: 'from-violet-400 to-purple-600', glow: 'shadow-violet-500/25' },
] as const;

export function platformLabel(key: string, t: (k: 'android' | 'windows' | 'linux' | 'macos' | 'all') => string): string {
  switch (key) {
    case 'ANDROID':
      return t('android');
    case 'WINDOWS':
      return t('windows');
    case 'LINUX':
      return t('linux');
    case 'MACOS':
      return t('macos');
    default:
      return key;
  }
}

export default function PlatformCards({ stats }: { stats: Stats | null }) {
  const { t } = useLang();
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" role="list">
      {CARDS.map((c, i) => {
        const Icon = c.icon;
        const count = stats?.byPlatform?.[c.key] ?? 0;
        return (
          <motion.div
            key={c.key}
            role="listitem"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
          >
            <Link
              to={`/browse?platform=${c.key}`}
              aria-label={`${platformLabel(c.key, t)} — ${count}`}
              className={`glass group block rounded-3xl p-5 shadow-card transition duration-300 hover:-translate-y-1.5 hover:shadow-lift ${c.glow}`}
            >
              <span className={`inline-grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg ${c.grad}`}>
                <Icon className="h-6 w-6" />
              </span>
              <div className="mt-3 text-base font-extrabold">{platformLabel(c.key, t)}</div>
              <div className="text-sm tabular-nums text-slate-500 dark:text-slate-400">{count.toLocaleString()}</div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
