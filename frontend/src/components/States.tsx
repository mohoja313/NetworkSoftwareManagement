import { PackageSearch, WifiOff } from 'lucide-react';
import { useLang } from '../i18n';

export function Empty({ hint }: { hint?: string }) {
  const { t } = useLang();
  return (
    <div className="glass mx-auto flex max-w-md flex-col items-center rounded-3xl px-6 py-12 text-center shadow-card">
      <span className="grid h-14 w-14 place-items-center rounded-3xl bg-slate-200/70 dark:bg-white/10">
        <PackageSearch className="h-7 w-7 text-slate-500" />
      </span>
      <p className="mt-4 font-extrabold">{t('noResults')}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{hint ?? t('noResultsHint')}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useLang();
  return (
    <div className="glass mx-auto flex max-w-md flex-col items-center rounded-3xl px-6 py-12 text-center shadow-card" role="alert">
      <span className="grid h-14 w-14 place-items-center rounded-3xl bg-rose-500/15">
        <WifiOff className="h-7 w-7 text-rose-500" />
      </span>
      <p className="mt-4 font-extrabold">{t('loadError')}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400" dir="ltr">
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-500"
        >
          {t('retry')}
        </button>
      )}
    </div>
  );
}
