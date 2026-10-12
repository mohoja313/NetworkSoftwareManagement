import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LanguageProvider, useLang } from './i18n';
import { ThemeProvider } from './theme';
import { ToastProvider } from './toast';
import { AuthProvider } from './auth';
import Header from './components/Header';
import AuthModal from './components/AuthModal';
import Home from './pages/Home';
import Browse from './pages/Browse';
import Detail from './pages/Detail';
import Publishers from './pages/Publishers';
import PublisherDetail from './pages/PublisherDetail';
import Upload from './pages/Upload';

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.main
        key={location.pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.22 }}
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-6"
      >
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/software/:id" element={<Detail />} />
          <Route path="/publishers" element={<Publishers />} />
          <Route path="/publishers/:id" element={<PublisherDetail />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="*" element={<Browse />} />
        </Routes>
      </motion.main>
    </AnimatePresence>
  );
}

function Footer() {
  const { t } = useLang();
  return (
    <footer className="border-t border-slate-200/70 py-6 text-center text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
      Network Software Hub · {t('developedBy')}
    </footer>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <div className="flex min-h-screen flex-col">
                <Header />
                <AnimatedRoutes />
                <Footer />
                <AuthModal />
              </div>
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
