import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Boxes, Moon, Sun, LogOut, Upload, Languages } from 'lucide-react';
import { useAuth } from '../auth';
import { useLang } from '../i18n';
import { useTheme } from '../theme';

export default function Header() {
  const { user, logout, setAuthOpen } = useAuth();
  const { t, lang, setLang } = useLang();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link to="/" className="flex items-center gap-2 font-extrabold tracking-tight" aria-label={t('appName')}>
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-lift">
            <Boxes className="h-5 w-5" />
          </span>
          <span className="hidden text-lg sm:block">{t('appName')}</span>
        </Link>
        <nav className="mx-2 hidden items-center gap-1 text-sm font-medium md:flex" aria-label="primary">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `rounded-xl px-3 py-2 transition hover:bg-slate-100 dark:hover:bg-white/10 ${isActive ? 'bg-slate-100 dark:bg-white/10' : ''}`
            }
          >
            {t('home')}
          </NavLink>
          <NavLink
            to="/browse"
            className={({ isActive }) =>
              `rounded-xl px-3 py-2 transition hover:bg-slate-100 dark:hover:bg-white/10 ${isActive ? 'bg-slate-100 dark:bg-white/10' : ''}`
            }
          >
            {t('browse')}
          </NavLink>
          <NavLink
            to="/publishers"
            className={({ isActive }) =>
              `rounded-xl px-3 py-2 transition hover:bg-slate-100 dark:hover:bg-white/10 ${isActive ? 'bg-slate-100 dark:bg-white/10' : ''}`
            }
          >
            {t('publishers')}
          </NavLink>
        </nav>
        <div className="ms-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLang(lang === 'fa' ? 'en' : 'fa')}
            aria-label={t('language')}
            className="flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-2 text-xs font-bold hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/10"
          >
            <Languages className="h-4 w-4" />
            {lang === 'fa' ? 'EN' : 'فا'}
          </button>
          <button
            type="button"
            onClick={toggle}
            aria-label={theme === 'dark' ? t('lightMode') : t('darkMode')}
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/10"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {user ? (
            <>
              <button
                type="button"
                onClick={() => navigate('/upload')}
                className="hidden items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-bold text-white shadow-lift transition hover:bg-brand-500 sm:flex"
              >
                <Upload className="h-4 w-4" />
                {t('upload')}
              </button>
              <span className="hidden max-w-[140px] truncate text-sm font-semibold lg:block" title={user.email}>
                {user.isAdmin ? 'Admin' : user.displayName}
              </span>
              {user.isAdmin && (
                <span className="hidden rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-extrabold text-brand-700 sm:block dark:bg-brand-500/15 dark:text-brand-300">
                  {t('admin')}
                </span>
              )}
              <button
                type="button"
                onClick={logout}
                aria-label={t('logout')}
                className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/10"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white shadow-lift transition hover:bg-brand-500"
            >
              {t('login')}
            </button>
          )}
        </div>
      </div>
      <nav className="flex items-center gap-1 overflow-x-auto px-4 pb-2 text-sm font-medium md:hidden" aria-label="primary-mobile">
        <NavLink to="/" className="rounded-lg px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-white/10">
          {t('home')}
        </NavLink>
        <NavLink to="/browse" className="rounded-lg px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-white/10">
          {t('browse')}
        </NavLink>
        <NavLink to="/publishers" className="rounded-lg px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-white/10">
          {t('publishers')}
        </NavLink>
        {user && (
          <NavLink to="/upload" className="rounded-lg px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-white/10">
            {t('upload')}
          </NavLink>
        )}
      </nav>
    </header>
  );
}
