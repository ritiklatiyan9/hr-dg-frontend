import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import React, {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  Inbox,
  ShieldCheck,
  WifiOff,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { Alert, AlertDescription } from "./components/ui/alert";
import { Badge as UiBadge } from "./components/ui/badge";
import { cn } from "./lib/utils";
import { humanize, statusTone } from "./components/shared/status";
export { humanize, statusTone };
export const Preferences = createContext({
  language: "en",
  setLanguage: (_s: string) => {},
  dark: false,
  setDark: (_b: boolean) => {},
});
export const useT = () => {
  const { language } = useContext(Preferences);
  return (en: string, hi: string) => (language === "hi" ? hi : en);
};
export function PreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [language, setLanguage] = useState(
    () => localStorage.getItem("dg.language") ?? "en",
  );
  const [dark, setDark] = useState(
    () => localStorage.getItem("dg.theme") === "dark",
  );
  useEffect(() => {
    localStorage.setItem("dg.language", language);
    document.documentElement.lang = language;
  }, [language]);
  useEffect(() => {
    localStorage.setItem("dg.theme", dark ? "dark" : "light");
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);
  return (
    <Preferences.Provider value={{ language, setLanguage, dark, setDark }}>
      {children}
    </Preferences.Provider>
  );
}
export function Notice({
  children,
  success = false,
}: {
  children: React.ReactNode;
  success?: boolean;
}) {
  return (
    <Alert
      variant={success ? "success" : "warning"}
      role={success ? "status" : "alert"}
    >
      {success ? <CheckCircle2 /> : <AlertCircle />}
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
export function Skeleton() {
  return (
    <div className="grid gap-3" role="status" aria-label="Loading">
      <div className="bg-accent h-8 w-1/3 animate-pulse rounded-md" />
      {[0, 1, 2, 3].map((i) => (
        <div className="bg-accent h-12 animate-pulse rounded-md" key={i} />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
export function Empty({
  title,
  children,
  denied = false,
  icon,
  action,
}: {
  title: string;
  children?: React.ReactNode;
  denied?: boolean;
  icon?: LucideIcon;
  action?: React.ReactNode;
}) {
  const Icon = icon ?? (denied ? ShieldCheck : Inbox);
  return (
    <div className="bg-card/60 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-12 text-center">
      <span className="bg-muted text-muted-foreground mb-1 flex size-11 items-center justify-center rounded-full">
        <Icon className="size-5" />
      </span>
      <h2 className="text-base font-semibold tracking-normal">{title}</h2>
      {children && (
        <p className="text-muted-foreground max-w-md text-sm">{children}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  const t = useT();
  return (
    <div className="grid justify-items-start gap-3">
      <Notice>
        {!navigator.onLine
          ? t(
              "You are offline. Reconnect to load secure HR records.",
              "आप ऑफ़लाइन हैं। सुरक्षित रिकॉर्ड देखने के लिए कनेक्ट करें।",
            )
          : t(
              "We couldn’t load this information. Try again, or contact your administrator if it continues.",
              "जानकारी लोड नहीं हो सकी। दोबारा प्रयास करें।",
            )}
      </Notice>
      <Button variant="outline" onClick={retry}>
        {t("Try again", "दोबारा प्रयास करें")}
      </Button>
    </div>
  );
}
export function Dialog({
  title,
  children,
  onClose,
  wide = false,
  sheet = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
  sheet?: boolean;
}) {
  const t = useT();
  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=open]:animate-fade-in fixed inset-0 z-50 bg-black/40" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "bg-background text-foreground fixed z-50 flex flex-col border shadow-lg outline-none",
            sheet
              ? "data-[state=open]:animate-sheet-in inset-y-0 right-0 h-full w-full sm:max-w-xl"
              : "data-[state=open]:animate-fade-in top-1/2 left-1/2 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg",
            !sheet && (wide ? "sm:max-w-3xl" : "sm:max-w-lg"),
          )}
        >
          <header className="flex items-center justify-between gap-4 border-b px-6 py-4">
            <DialogPrimitive.Title className="text-lg leading-tight font-semibold tracking-tight">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("Close dialog", "संवाद बंद करें")}
              >
                <X className="size-4" />
              </Button>
            </DialogPrimitive.Close>
          </header>
          <div className="dialog-body flex-1 overflow-y-auto p-6">
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
export function Tabs({
  items,
  value,
  onChange,
}: {
  items: { id: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <TabsPrimitive.Root
      value={value}
      onValueChange={onChange}
      className="mb-5 max-w-full overflow-x-auto"
    >
      <TabsPrimitive.List
        className="bg-muted text-muted-foreground inline-flex h-9 items-center rounded-lg p-[3px]"
        aria-label="Sections"
      >
        {items.map((i) => (
          <TabsPrimitive.Trigger
            key={i.id}
            value={i.id}
            className="hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground inline-flex h-full items-center justify-center rounded-md px-3 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] data-[state=active]:shadow-sm"
          >
            {i.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
    </TabsPrimitive.Root>
  );
}
const variants = {
  success: "success",
  green: "success",
  danger: "destructive",
  red: "destructive",
  warning: "warning",
  amber: "warning",
  info: "info",
  blue: "info",
  neutral: "secondary",
} as const;
/** Status badge: humanizes machine values and colours them by meaning. */
export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: string;
  className?: string;
}) {
  const text = typeof children === "string" ? children : "";
  const semantic = tone !== "neutral" ? tone : statusTone(text);
  return (
    <UiBadge
      variant={variants[semantic as keyof typeof variants] ?? "secondary"}
      className={className}
    >
      {text ? humanize(text) : children}
    </UiBadge>
  );
}
export function OnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const t = useT();
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online ? null : (
    <div className="offline-banner" role="status">
      <WifiOff size={16} />
      {t(
        "Offline · reconnect before making changes",
        "ऑफ़लाइन · बदलाव करने से पहले कनेक्ट करें",
      )}
    </div>
  );
}
export function Heading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 space-y-1.5">
        {eyebrow && (
          <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground max-w-3xl text-sm">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      )}
    </header>
  );
}

export function PageSkeleton({ title }: { title: string }) {
  return (
    <section aria-busy="true">
      <Heading title={title} />
      <Skeleton />
    </section>
  );
}
