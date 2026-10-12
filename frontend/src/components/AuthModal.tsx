import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Mail, KeyRound, Loader2 } from 'lucide-react';
import { requestCode, verifyCode, ApiError } from '../api';
import { useAuth } from '../auth';
import { useLang } from '../i18n';
import { useToast } from '../toast';

export default function AuthModal() {
  const { authOpen, setAuthOpen, setSession } = useAuth();
  const { t } = useLang();
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const boxes = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (authOpen) {
      setStep(1);
      setError('');
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

  const validEmail = /^[^\s@]+@gmail\.com$/i.test(email.trim());

  async function sendCode() {
    if (!validEmail) {
      setError(t('gmailOnly'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      const r = await requestCode(email.trim());
      toast(r.message || t('codeSent'), 'success');
      setStep(2);
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
      const r = await verifyCode(email.trim(), joined);
      setSession(r.token, r.email, r.displayName);
      toast(t('welcome'), 'success');
      setAuthOpen(false);
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
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
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
            className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold">{t('login')}</h2>
              <button
                type="button"
                onClick={() => setAuthOpen(false)}
                aria-label={t('clear')}
                className="grid h-9 w-9 place-items-center rounded-xl hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {step === 1 ? (
              <div className="mt-4 space-y-3">
                <label htmlFor="auth-email" className="text-sm font-semibold">
                  {t('email')}
                </label>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2.5 focus-within:border-brand-500 dark:border-white/10">
                  <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                  <input
                    id="auth-email"
                    dir="ltr"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendCode()}
                    placeholder={t('emailPlaceholder')}
                    className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                    autoComplete="email"
                  />
                </div>
                {!validEmail && email.length > 3 && <p className="text-xs text-amber-600">{t('gmailOnly')}</p>}
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
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <KeyRound className="h-4 w-4" />
                  <span dir="ltr">{email}</span>
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
                <button type="button" onClick={() => setStep(1)} className="w-full text-center text-xs text-slate-500 hover:underline">
                  {t('back')}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
