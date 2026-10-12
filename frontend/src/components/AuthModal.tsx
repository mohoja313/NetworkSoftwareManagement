import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Mail, KeyRound, Loader2, ShieldCheck, UserPlus } from 'lucide-react';
import {
  requestCode,
  verifyCode,
  passwordLogin,
  adminLogin,
  adminSetEmail,
  adminSetup,
  adminChangePassword,
  adminListUsers,
  adminUpsertUser,
  adminClearPassword,
  ApiError,
} from '../api';
import type { AdminUser } from '../types';
import { useAuth } from '../auth';
import { useLang } from '../i18n';
import { useToast } from '../toast';

type Step = 'login' | 'code' | 'adminEmail' | 'adminPanel';

export default function AuthModal() {
  const { authOpen, setAuthOpen, setSession } = useAuth();
  const { t } = useLang();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userTab, setUserTab] = useState<'code' | 'password'>('code');
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // admin panel state
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [ownCurrentPassword, setOwnCurrentPassword] = useState('');
  const [ownNewPassword, setOwnNewPassword] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const boxes = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (authOpen) {
      setStep('login');
      setError('');
      setPassword('');
    }
  }, [authOpen]);

  useEffect(() => {
    if (!authOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAuthOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [authOpen, setAuthOpen]);

  const trimmed = email.trim();
  // Anything without '@' is treated as the manager username (default "Admin").
  const isAdminInput = trimmed.length > 0 && !trimmed.includes('@');
  const validEmail = /^[^\s@]+@gmail\.com$/i.test(trimmed);

  async function sendCode() {
    if (!validEmail) {
      setError(t('gmailOnly'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      const r = await requestCode(trimmed);
      toast(r.message || t('codeSent'), 'success');
      setStep('code');
      window.setTimeout(() => boxes.current[0]?.focus(), 60);
    } catch (e) {
      const err = e as ApiError;
      setError(err.status === 429 ? 'Too many requests. Please wait and retry.' : err.message);
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    const joined = code.join('');
    if (joined.length !== 6) {
      setError('Enter the 6-digit code.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const r = await verifyCode(trimmed, joined);
      setSession(r.token, r.email, r.displayName, { isAdmin: false, role: 'user' });
      toast(t('welcome'), 'success');
      setAuthOpen(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function loginWithPassword() {
    if (!validEmail) {
      setError(t('gmailOnly'));
      return;
    }
    if (!password) {
      setError(t('passwordPlaceholder'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      const r = await passwordLogin(trimmed, password);
      if (r.isAdmin) {
        // Manager signing in with his own registered email + password.
        setSession(r.token, r.email, r.displayName, { isAdmin: true, role: 'admin' });
        setAdminEmail(r.adminEmail || trimmed);
        await loadUsers();
        setStep('adminPanel');
      } else {
        setSession(r.token, r.email, r.displayName, { isAdmin: false, role: 'user' });
        setAuthOpen(false);
      }
      toast(t('welcome'), 'success');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function loginAsAdmin() {
    if (!trimmed || !password) {
      setError(t('passwordPlaceholder'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      const r = await adminLogin(trimmed, password);
      setSession(r.token, r.email, r.displayName, { isAdmin: true, role: 'admin' });
      if (r.needEmailSetup) {
        // First (and only) Admin login: register own email + password now.
        setAdminEmail('');
        setAdminPassword('');
        setStep('adminEmail');
      } else {
        setAdminEmail(r.adminEmail || '');
        await loadUsers();
        setStep('adminPanel');
      }
      toast(t('welcome'), 'success');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function doAdminSetup() {
    if (!/^[^\s@]+@gmail\.com$/i.test(adminEmail.trim())) {
      setError(t('gmailOnly'));
      return;
    }
    if (adminPassword.length < 4) {
      setError(t('passwordPlaceholder'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      const r = await adminSetup(adminEmail.trim(), adminPassword);
      // From now on the Admin username is dead; session carries the manager's own email.
      setSession(r.token, r.email, r.displayName, { isAdmin: true, role: 'admin' });
      setAdminEmail(r.adminEmail || adminEmail.trim());
      await loadUsers();
      setStep('adminPanel');
      toast(t('userSaved'), 'success');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveAdminEmail() {
    if (!/^[^\s@]+@gmail\.com$/i.test(adminEmail.trim())) {
      setError(t('gmailOnly'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      const r = await adminSetEmail(adminEmail.trim());
      // refresh stored session (token rotated)
      setSession(r.token, r.email, r.displayName, { isAdmin: true, role: 'admin' });
      await loadUsers();
      setStep('adminPanel');
      toast(t('userSaved'), 'success');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function changeOwnPassword() {
    if (ownNewPassword.length < 4) {
      setError(t('passwordPlaceholder'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      await adminChangePassword(ownCurrentPassword, ownNewPassword);
      setOwnCurrentPassword('');
      setOwnNewPassword('');
      toast(t('userSaved'), 'success');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function loadUsers() {
    try {
      setUsers(await adminListUsers());
    } catch {
      /* panel still works without the list */
    }
  }

  async function createUser() {
    if (!/^[^\s@]+@gmail\.com$/i.test(newUserEmail.trim())) {
      setError(t('gmailOnly'));
      return;
    }
    if (newUserPassword.length < 4) {
      setError(t('passwordPlaceholder'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      await adminUpsertUser({
        email: newUserEmail.trim(),
        password: newUserPassword,
        sendEmail,
      });
      setNewUserEmail('');
      setNewUserPassword('');
      await loadUsers();
      toast(t('userSaved'), 'success');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function clearPassword(id: number) {
    setBusy(true);
    try {
      await adminClearPassword(id);
      await loadUsers();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function onBoxChange(i: number, v: string) {
    const d = v.replace(/\D/g, '').slice(-1);
    setCode((prev) => {
      const next = [...prev];
      next[i] = d;
      return next;
    });
    if (d && i < 5) boxes.current[i + 1]?.focus();
  }

  function onBoxKey(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !code[i] && i > 0) boxes.current[i - 1]?.focus();
    if (e.key === 'Enter') verify();
  }

  return (
    <AnimatePresence>
      {authOpen && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setAuthOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={t('login')}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            onClick={(e) => e.stopPropagation()}
            className="my-8 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-extrabold">
                {step === 'adminPanel' && <ShieldCheck className="h-5 w-5 text-brand-500" />}
                {step === 'adminPanel' ? t('adminPanel') : t('login')}
              </h2>
              <button
                type="button"
                onClick={() => setAuthOpen(false)}
                aria-label={t('clear')}
                className="grid h-9 w-9 place-items-center rounded-xl hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {step === 'login' && (
              <div className="mt-4 space-y-3">
                <label htmlFor="auth-email" className="text-sm font-semibold">
                  {t('email')}
                </label>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2.5 focus-within:border-brand-500 dark:border-white/10">
                  {isAdminInput ? (
                    <ShieldCheck className="h-4 w-4 shrink-0 text-brand-500" />
                  ) : (
                    <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                  )}
                  <input
                    id="auth-email"
                    dir="ltr"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (isAdminInput ? loginAsAdmin() : userTab === 'code' ? sendCode() : loginWithPassword())}
                    placeholder={t('emailPlaceholder')}
                    className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                    autoComplete="username"
                  />
                </div>

                {isAdminInput ? (
                  <>
                    <p className="flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {t('adminLogin')}
                    </p>
                    <label htmlFor="auth-password" className="text-sm font-semibold">
                      {t('password')}
                    </label>
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2.5 focus-within:border-brand-500 dark:border-white/10">
                      <KeyRound className="h-4 w-4 shrink-0 text-slate-400" />
                      <input
                        id="auth-password"
                        dir="ltr"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && loginAsAdmin()}
                        placeholder={t('passwordPlaceholder')}
                        className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                        autoComplete="current-password"
                      />
                    </div>
                    {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
                    <button
                      type="button"
                      onClick={loginAsAdmin}
                      disabled={busy}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-500 disabled:opacity-60"
                    >
                      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                      {t('adminLogin')}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 text-xs font-bold dark:bg-white/10">
                      <button
                        type="button"
                        onClick={() => setUserTab('code')}
                        className={`rounded-xl px-3 py-2 transition ${userTab === 'code' ? 'bg-white shadow dark:bg-slate-800' : 'text-slate-500'}`}
                      >
                        {t('loginWithCode')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setUserTab('password')}
                        className={`rounded-xl px-3 py-2 transition ${userTab === 'password' ? 'bg-white shadow dark:bg-slate-800' : 'text-slate-500'}`}
                      >
                        {t('loginWithPassword')}
                      </button>
                    </div>
                    {!validEmail && trimmed.length > 3 && (
                      <p className="text-xs text-amber-600">{t('gmailOnly')}</p>
                    )}
                    {userTab === 'code' ? (
                      <>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{t('codeHint')}</p>
                        {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
                        <button
                          type="button"
                          onClick={sendCode}
                          disabled={busy}
                          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-500 disabled:opacity-60"
                        >
                          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                          {t('sendCode')}
                        </button>
                      </>
                    ) : (
                      <>
                        <label htmlFor="auth-user-password" className="text-sm font-semibold">
                          {t('password')}
                        </label>
                        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2.5 focus-within:border-brand-500 dark:border-white/10">
                          <KeyRound className="h-4 w-4 shrink-0 text-slate-400" />
                          <input
                            id="auth-user-password"
                            dir="ltr"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && loginWithPassword()}
                            placeholder={t('passwordPlaceholder')}
                            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                            autoComplete="current-password"
                          />
                        </div>
                        {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
                        <button
                          type="button"
                          onClick={loginWithPassword}
                          disabled={busy}
                          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-500 disabled:opacity-60"
                        >
                          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                          {t('login')}
                        </button>
                      </>
                    )}
                  </>
                )}
                <p className="text-[11px] text-slate-400">{t('adminHint')}</p>
              </div>
            )}

            {step === 'code' && (
              <div className="mt-4 space-y-3">
                <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <KeyRound className="h-4 w-4" />
                  <span dir="ltr">{trimmed}</span>
                </p>
                <div className="flex justify-center gap-2" dir="ltr">
                  {code.map((c, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        boxes.current[i] = el;
                      }}
                      value={c}
                      onChange={(e) => onBoxChange(i, e.target.value)}
                      onKeyDown={(e) => onBoxKey(i, e)}
                      inputMode="numeric"
                      maxLength={1}
                      aria-label={`digit ${i + 1}`}
                      className="h-12 w-11 rounded-2xl border border-slate-200 bg-transparent text-center text-lg font-extrabold focus:border-brand-500 focus:outline-none dark:border-white/10"
                    />
                  ))}
                </div>
                {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
                <button
                  type="button"
                  onClick={verify}
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-500 disabled:opacity-60"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t('verify')}
                </button>
                <button type="button" onClick={() => setStep('login')} className="w-full text-center text-xs text-slate-500 hover:underline">
                  {t('back')}
                </button>
              </div>
            )}

            {step === 'adminEmail' && (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('adminEmailSetup')}</p>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2.5 focus-within:border-brand-500 dark:border-white/10">
                  <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                  <input
                    dir="ltr"
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder={t('emailPlaceholder')}
                    className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                  />
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2.5 focus-within:border-brand-500 dark:border-white/10">
                  <KeyRound className="h-4 w-4 shrink-0 text-slate-400" />
                  <input
                    dir="ltr"
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && doAdminSetup()}
                    placeholder={t('passwordPlaceholder')}
                    className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                    autoComplete="new-password"
                  />
                </div>
                {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
                <button
                  type="button"
                  onClick={doAdminSetup}
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-500 disabled:opacity-60"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t('saveEmail')}
                </button>
              </div>
            )}

            {step === 'adminPanel' && (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl bg-slate-50 p-3 text-xs dark:bg-white/5">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span dir="ltr" className="font-bold">{adminEmail || '—'}</span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input
                      dir="ltr"
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder={t('emailPlaceholder')}
                      className="w-full rounded-xl border border-slate-200 bg-transparent px-2.5 py-1.5 text-xs outline-none dark:border-white/10"
                    />
                    <button
                      type="button"
                      onClick={saveAdminEmail}
                      disabled={busy}
                      className="shrink-0 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60 dark:bg-white dark:text-slate-900"
                    >
                      {t('saveEmail')}
                    </button>
                  </div>
                </div>

                <div className="space-y-2 rounded-2xl border border-slate-200 p-3 dark:border-white/10">
                  <p className="text-sm font-bold">{t('password')}</p>
                  <input
                    dir="ltr"
                    type="password"
                    value={ownCurrentPassword}
                    onChange={(e) => setOwnCurrentPassword(e.target.value)}
                    placeholder={t('passwordPlaceholder')}
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-slate-400 dark:border-white/10"
                  />
                  <input
                    dir="ltr"
                    type="password"
                    value={ownNewPassword}
                    onChange={(e) => setOwnNewPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && changeOwnPassword()}
                    placeholder={t('newUserPassword')}
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-slate-400 dark:border-white/10"
                  />
                  <button
                    type="button"
                    onClick={changeOwnPassword}
                    disabled={busy}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold transition hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:hover:bg-white/5"
                  >
                    {t('save')}
                  </button>
                </div>

                <div className="space-y-2 rounded-2xl border border-slate-200 p-3 dark:border-white/10">
                  <p className="flex items-center gap-1.5 text-sm font-bold">
                    <UserPlus className="h-4 w-4" />
                    {t('createUser')}
                  </p>
                  <input
                    dir="ltr"
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder={t('newUserEmail')}
                    className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-slate-400 dark:border-white/10"
                  />
                  <input
                    dir="ltr"
                    type="text"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder={t('newUserPassword')}
                    className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-slate-400 dark:border-white/10"
                  />
                  <label className="flex cursor-pointer items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={sendEmail}
                      onChange={(e) => setSendEmail(e.target.checked)}
                      className="h-4 w-4 accent-brand-600"
                    />
                    {t('sendEmailToUser')}
                  </label>
                  {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
                  <button
                    type="button"
                    onClick={createUser}
                    disabled={busy}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-500 disabled:opacity-60"
                  >
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t('createUser')}
                  </button>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-bold">
                    {t('usersList')} ({users.length})
                  </p>
                  <div className="max-h-48 space-y-1.5 overflow-y-auto">
                    {users.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center gap-2 rounded-xl border border-slate-100 px-2.5 py-1.5 text-xs dark:border-white/5"
                      >
                        <span dir="ltr" className="min-w-0 flex-1 truncate font-semibold">{u.email}</span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 font-bold ${u.hasPassword ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-white/10'}`}>
                          {u.hasPassword ? t('hasPassword') : t('codeOnly')}
                        </span>
                        {u.hasPassword && (
                          <button
                            type="button"
                            onClick={() => clearPassword(u.id)}
                            className="shrink-0 text-rose-500 hover:underline"
                          >
                            {t('removePassword')}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAuthOpen(false)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-bold transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
                >
                  {t('save')}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
