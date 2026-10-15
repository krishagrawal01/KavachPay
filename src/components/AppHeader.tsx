import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Info,
  Share,
  ShieldCheck,
  Volume2,
  VolumeX,
  X,
  Settings2,
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface AppHeaderProps {
  muted: boolean;
  onToggleMute: () => void;
  onToggleJudgePanel: () => void;
}

function isRunningInstalled(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  const standaloneMedia = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standaloneMedia || iosStandalone;
}

function isAppleMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function AppHeader({ muted, onToggleMute, onToggleJudgePanel }: AppHeaderProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const updateInstalledState = () => setIsInstalled(isRunningInstalled());
    updateInstalledState();
    setIsIOS(isAppleMobile());

    const media = window.matchMedia?.('(display-mode: standalone)');
    media?.addEventListener?.('change', updateInstalledState);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
      setShowInstallHelp(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      media?.removeEventListener?.('change', updateInstalledState);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (isInstalled) {
      setShowInstallHelp(true);
      return;
    }

    if (!deferredPrompt) {
      // Keep a useful install action visible even on browsers which do not
      // expose beforeinstallprompt (for example iOS Safari or browsers that
      // have not met the PWA installability criteria).
      setShowInstallHelp(true);
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (choice.outcome === 'accepted') setIsInstalled(isRunningInstalled());
      else setShowInstallHelp(true);
    } catch {
      setDeferredPrompt(null);
      setShowInstallHelp(true);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface/95 px-4 py-3 backdrop-blur-md sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-pale text-brand-blue">
            <ShieldCheck size={22} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <div className="text-[17px] font-extrabold leading-tight tracking-tight text-ink-primary">Kavach</div>
            <div className="mt-0.5 text-[11px] font-medium text-ink-muted">Payment safety</div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => void handleInstall()}
            aria-label={isInstalled ? 'View app installation status' : 'Install Kavach'}
            title={isInstalled ? 'Kavach is installed' : 'Install Kavach'}
            className="tactile flex h-10 items-center gap-1.5 rounded-xl bg-brand-blue px-3 py-2 text-xs font-bold text-white hover:brightness-105"
          >
            {isInstalled ? <CheckCircle2 size={15} /> : <Download size={15} />}
            <span>{isInstalled ? 'Installed' : 'Install app'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Enable warning sounds' : 'Mute warning sounds'}
            title={muted ? 'Enable warning sounds' : 'Mute warning sounds'}
            className="tactile flex h-10 w-10 items-center justify-center rounded-xl text-ink-muted hover:bg-obsidian hover:text-ink-primary"
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          <button
            type="button"
            onClick={onToggleJudgePanel}
            aria-label="Open demo and advanced settings"
            title="Demo and advanced settings"
            className="tactile flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-ink-muted hover:bg-obsidian hover:text-ink-primary"
          >
            <Settings2 size={18} />
          </button>
        </div>
      </header>

      {showInstallHelp && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 p-3 sm:items-center"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowInstallHelp(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="kavach-install-title"
            className="w-full max-w-md rounded-3xl border border-border bg-white p-5 text-slate-900 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-pale text-brand-blue">
                  <Download size={21} />
                </div>
                <div>
                  <h2 id="kavach-install-title" className="text-base font-extrabold">
                    {isInstalled ? 'Kavach is installed' : 'Install Kavach'}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">Add quick access to your home screen</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInstallHelp(false)}
                aria-label="Close install help"
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {isInstalled ? (
              <div className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm leading-relaxed text-emerald-900">
                <p className="font-bold">You're already using the installed app.</p>
                <p className="mt-1 text-xs">To load a newer version, close Kavach completely and reopen it. If the old version remains, open the website in your browser and refresh it.</p>
              </div>
            ) : isIOS ? (
              <div className="mt-4 space-y-3 text-sm">
                <p className="text-slate-600">On iPhone or iPad, open this site in Safari and follow these steps:</p>
                <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3">
                  <Share size={18} className="mt-0.5 shrink-0 text-brand-blue" />
                  <div><p className="font-bold">1. Tap Share</p><p className="mt-1 text-xs text-slate-500">Use Safari's share icon.</p></div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-brand-blue" />
                  <div><p className="font-bold">2. Choose “Add to Home Screen”</p><p className="mt-1 text-xs text-slate-500">Confirm by tapping Add.</p></div>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3 text-sm">
                <p className="text-slate-600">If the install prompt did not appear, try the browser menu:</p>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="font-bold">1. Open the deployed HTTPS site in Chrome</p>
                  <p className="mt-1 text-xs text-slate-500">Use the full Kavach site URL, not the VS Code preview or an in-app browser.</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="font-bold">2. Tap the ⋮ menu</p>
                  <p className="mt-1 text-xs text-slate-500">Choose “Install app” or “Add to Home screen”, then confirm.</p>
                </div>
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                  <Info size={16} className="mt-0.5 shrink-0" />
                  <p>If Chrome does not offer either option, the website's web manifest or service worker may not meet installability requirements, or the app may already be installed. The button cannot bypass those browser requirements.</p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowInstallHelp(false)}
              className="mt-5 w-full rounded-xl bg-brand-blue px-4 py-3 text-sm font-bold text-white hover:brightness-105"
            >
              Done
            </button>
          </section>
        </div>
      )}
    </>
  );
}
