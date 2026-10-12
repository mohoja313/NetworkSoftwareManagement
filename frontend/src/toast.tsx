import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export type ToastKind = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}
interface ToastCtx {
  toast: (message: string, kind?: ToastKind) => void;
}
const Ctx = createContext<ToastCtx>({ toast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const idRef = useRef(1);
  const toast = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = idRef.current++;
    setItems((prev) => [...prev.slice(-3), { id, kind, message }]);
    window.setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3600);
  }, []);
  const value = useMemo(() => ({ toast }), [toast]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 inset-x-0 z-[100] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              role="status"
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              className="glass pointer-events-auto flex max-w-md items-center gap-2 rounded-2xl px-4 py-2.5 text-sm shadow-card"
            >
              {t.kind === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : t.kind === 'error' ? (
                <AlertTriangle className="h-4 w-4 text-rose-500" />
              ) : (
                <Info className="h-4 w-4 text-brand-500" />
              )}
              <span>{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastCtx {
  return useContext(Ctx);
}
