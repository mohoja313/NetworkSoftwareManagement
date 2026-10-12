import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type Lang = 'fa' | 'en';

const dict = {
  appName: { fa: 'هاب نرم‌افزار شبکه', en: 'Network Software Hub' },
  tagline: {
    fa: 'کشف، دانلود و اشتراک نرم‌افزار برای اندروید، ویندوز، لینوکس و مک',
    en: 'Discover, download and share software for Android, Windows, Linux and macOS.',
  },
  searchPlaceholder: { fa: 'جستجوی نرم‌افزار… ( / برای فوکس )', en: 'Search software… ( / to focus )' },
  search: { fa: 'جستجو', en: 'Search' },
  clear: { fa: 'پاک کردن', en: 'Clear' },
  browse: { fa: 'مرور همه', en: 'Browse all' },
  home: { fa: 'خانه', en: 'Home' },
  publishers: { fa: 'منتشرکنندگان', en: 'Publishers' },
  upload: { fa: 'انتشار نرم‌افزار', en: 'Publish software' },
  login: { fa: 'ورود', en: 'Sign in' },
  logout: { fa: 'خروج', en: 'Sign out' },
  newest: { fa: 'جدیدترین‌ها', en: 'Newest' },
  popular: { fa: 'پرمخاطب‌ترین‌ها', en: 'Most popular' },
  viewAll: { fa: 'مشاهده همه', en: 'View all' },
  all: { fa: 'همه', en: 'All' },
  sort: { fa: 'مرتب‌سازی', en: 'Sort' },
  sortNewest: { fa: 'جدیدترین', en: 'Newest' },
  sortPopular: { fa: 'پردانلودترین', en: 'Most downloaded' },
  sortSize: { fa: 'حجم', en: 'Size' },
  platform: { fa: 'پلتفرم', en: 'Platform' },
  android: { fa: 'اندروید', en: 'Android' },
  windows: { fa: 'ویندوز', en: 'Windows' },
  linux: { fa: 'لینوکس', en: 'Linux' },
  macos: { fa: 'مک', en: 'macOS' },
  downloads: { fa: 'دانلودها', en: 'Downloads' },
  softwareCount: { fa: 'نرم‌افزارها', en: 'Software' },
  totalSoftware: { fa: 'کل نرم‌افزارها', en: 'Total software' },
  totalDownloads: { fa: 'کل دانلودها', en: 'Total downloads' },
  totalPublishers: { fa: 'منتشرکنندگان', en: 'Publishers' },
  noResults: { fa: 'نتیجه‌ای یافت نشد', en: 'No results found' },
  noResultsHint: { fa: 'عبارت دیگری را امتحان کنید یا فیلترها را پاک کنید.', en: 'Try another query or clear filters.' },
  loading: { fa: 'در حال بارگذاری…', en: 'Loading…' },
  loadError: { fa: 'خطا در بارگذاری', en: 'Failed to load' },
  retry: { fa: 'تلاش مجدد', en: 'Retry' },
  download: { fa: 'دانلود', en: 'Download' },
  version: { fa: 'نسخه', en: 'Version' },
  size: { fa: 'حجم', en: 'Size' },
  sha256: { fa: 'SHA-256', en: 'SHA-256' },
  copy: { fa: 'کپی', en: 'Copy' },
  copied: { fa: 'کپی شد', en: 'Copied' },
  description: { fa: 'توضیحات', en: 'Description' },
  publisher: { fa: 'منتشرکننده', en: 'Publisher' },
  publishedBy: { fa: 'منتشر شده توسط', en: 'Published by' },
  fromIp: { fa: 'از IP', en: 'from IP' },
  at: { fa: 'در تاریخ', en: 'at' },
  edit: { fa: 'ویرایش', en: 'Edit' },
  save: { fa: 'ذخیره', en: 'Save' },
  cancel: { fa: 'انصراف', en: 'Cancel' },
  remove: { fa: 'حذف', en: 'Delete' },
  confirmDelete: { fa: 'آیا از حذف این نرم‌افزار مطمئن هستید؟', en: 'Are you sure you want to delete this software?' },
  name: { fa: 'نام', en: 'Name' },
  file: { fa: 'فایل', en: 'File' },
  icon: { fa: 'آیکون (اختیاری)', en: 'Icon (optional)' },
  dropHere: { fa: 'فایل را اینجا رها کنید یا کلیک کنید', en: 'Drop your file here or click to choose' },
  preview: { fa: 'پیش‌نمایش انتشار', en: 'Publish preview' },
  publish: { fa: 'انتشار', en: 'Publish' },
  uploading: { fa: 'در حال آپلود', en: 'Uploading' },
  needLogin: { fa: 'برای انتشار ابتدا وارد شوید.', en: 'Please sign in to publish.' },
  platformRequired: { fa: 'انتخاب پلتفرم الزامی است.', en: 'Platform selection is required.' },
  email: { fa: 'ایمیل', en: 'Email' },
  emailPlaceholder: { fa: 'you@gmail.com', en: 'you@gmail.com' },
  gmailOnly: { fa: 'فقط ایمیل Gmail مجاز است.', en: 'Only @gmail.com addresses are allowed.' },
  sendCode: { fa: 'ارسال کد', en: 'Send code' },
  verify: { fa: 'تأیید', en: 'Verify' },
  codeSent: { fa: 'کد تأیید ارسال شد.', en: 'Verification code sent.' },
  welcome: { fa: 'خوش آمدید! ورود با موفقیت انجام شد.', en: 'Welcome! Signed in successfully.' },
  codeHint: {
    fa: 'راهنما: اگر SMTP تنظیم نشده باشد، کد در لاگ سرور ثبت می‌شود.',
    en: 'Hint: if SMTP is not configured, the code is logged server-side.',
  },
  back: { fa: 'بازگشت', en: 'Back' },
  joinedAt: { fa: 'عضویت', en: 'Joined' },
  firstPublish: { fa: 'اولین انتشار', en: 'First publish' },
  theirSoftware: { fa: 'نرم‌افزارهای این منتشرکننده', en: 'Software by this publisher' },
  lightMode: { fa: 'حالت روشن', en: 'Light mode' },
  darkMode: { fa: 'حالت تیره', en: 'Dark mode' },
  language: { fa: 'زبان', en: 'Language' },
  resultsFor: { fa: 'نتایج برای', en: 'Results for' },
  escToClear: { fa: 'Esc برای پاک کردن', en: 'Esc to clear' },
  developedBy: { fa: 'توسعه‌دهنده: MohammadHosseinJafary', en: 'Developed by MohammadHosseinJafary' },
} as const;

export type DictKey = keyof typeof dict;

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: DictKey) => string;
  dir: 'rtl' | 'ltr';
}

const Ctx = createContext<LangCtx | null>(null);
const LANG_KEY = 'nsh_lang';

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'fa' || saved === 'en') return saved;
  } catch {
    /* ignore */
  }
  return 'fa';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
  }, [lang]);
  const t = useCallback((k: DictKey) => dict[k][lang], [lang]);
  const value = useMemo<LangCtx>(
    () => ({ lang, setLang, t, dir: lang === 'fa' ? 'rtl' : 'ltr' }),
    [lang, setLang, t],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useLang must be used inside LanguageProvider');
  return v;
}
