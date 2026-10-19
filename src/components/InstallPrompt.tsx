import { useEffect, useState } from "react";
import { Share, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "ecoteiner-install-dismissed-at";
const RETRY_AFTER_MS = 7 * 24 * 60 * 60 * 1000; // ask again after 7 days

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  // iOS Safari reports installed state via navigator.standalone
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const wasRecentlyDismissed = () => {
  try {
    const ts = Number(localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(ts) && ts > 0 && Date.now() - ts < RETRY_AFTER_MS;
  } catch {
    return false;
  }
};

/**
 * Suggests installing the app on the device home screen (PWA).
 * Manifest-only: no service worker, no offline caching.
 * - Chromium/Android: uses the native beforeinstallprompt dialog.
 * - iOS Safari: shows manual instructions (no beforeinstallprompt there).
 * Shown only on mobile, only for signed-in users (rendered in DashboardLayout).
 */
const InstallPrompt = () => {
  const isMobile = useIsMobile();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isMobile || isStandalone() || wasRecentlyDismissed()) return;

    let iosTimer: ReturnType<typeof setTimeout> | undefined;
    const onPrompt = (e: Event) => {
      // Prevent the browser from showing its own competing banner.
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS never fires beforeinstallprompt; show manual instructions after a
    // short delay so it doesn't compete with the initial page load.
    if (isIOS()) {
      iosTimer = setTimeout(() => {
        if (!isStandalone() && !wasRecentlyDismissed()) {
          setShowIosHint(true);
          setVisible(true);
        }
      }, 4000);
    }

    const onInstalled = () => setVisible(false);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, [isMobile]);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // storage unavailable: just hide for this session
    }
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setVisible(false);
    setDeferredPrompt(null);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      className="fixed inset-x-3 bottom-3 z-50 rounded-xl border bg-card p-4 shadow-card sm:inset-x-auto sm:right-4 sm:max-w-sm"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dispensar sugestão"
        className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary">
          <Smartphone className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            Adicione o Ecoteiner à tela inicial
          </p>
          {showIosHint ? (
            <p className="mt-1 text-xs text-muted-foreground">
              No Safari, toque no botão <Share className="inline h-3 w-3" /> Compartilhar e
              depois em "Adicionar à Tela de Início".
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Crie um atalho no seu celular para acessar mais rápido.
            </p>
          )}
          {deferredPrompt && (
            <Button size="sm" className="mt-3" onClick={install}>
              Adicionar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
