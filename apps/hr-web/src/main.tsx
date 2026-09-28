import { HashRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { useAuthText } from "./auth-labels";
import { Preferences, PreferencesProvider } from "./ui";
import { Workspace } from "./workspace";
import React, { useContext, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  Clock3,
  FileText,
  Leaf,
  LogOut,
  MapPin,
  Search,
  ShieldCheck,
  Users,
  Wallet,
  CalendarDays,
  MessageSquare,
  ClipboardList,
  AlertCircle,
  LoaderCircle,
} from "lucide-react";
import { ApiError, rest } from "./api";
import { Button } from "./components/ui/button";
import "./app.css";
type AuthState = "loading" | "login" | "mfa" | "ready";
function AuthTools() {
  const p = useContext(Preferences);
  return (
    <div className="auth-tools">
      <select
        aria-label="Language"
        value={p.language}
        onChange={(e) => p.setLanguage(e.target.value)}
      >
        <option value="en">English</option>
        <option value="hi">हिन्दी</option>
      </select>
      <Button variant="ghost" onClick={() => p.setDark(!p.dark)}>
        {p.dark ? "☀" : "☾"}
      </Button>
    </div>
  );
}
function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark">
        <Leaf size={25} />
      </div>
      <div>
        Defence Garden<span>PEOPLE & HR</span>
      </div>
    </div>
  );
}
function Busy() {
  return (
    <div className="empty">
      <LoaderCircle className="spin" />
      <p>Loading your workspace…</p>
    </div>
  );
}
function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="notice" role="alert">
      <AlertCircle size={18} />
      <span>{children}</span>
    </div>
  );
}
function Login({
  onLogin,
}: {
  onLogin: (mfa: boolean, enroll: boolean) => void;
}) {
  const at = useAuthText();
  const [mode, setMode] = useState(
    location.hash.startsWith("#action=") ? "reset" : "login",
  );
  const action = useRef(
    location.hash.startsWith("#action=") ? location.hash.slice(8) : "",
  );
  useEffect(() => {
    if (action.current) history.replaceState(null, "", location.pathname);
  }, []);
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      if (mode === "reset") {
        await rest("/auth/redeem", {
          token: action.current,
          password: f.get("password"),
        });
        setMode("login");
        setMessage(at("Your password is ready. Sign in to continue."));
      } else if (mode === "recover") {
        const r = await rest<{ message: string }>("/auth/recovery", {
          email: f.get("email"),
        });
        setMessage(r.message);
      } else {
        const r = await rest<{
          mfaRequired: boolean;
          enrollmentRequired: boolean;
        }>("/auth/login", {
          email: f.get("email"),
          password: f.get("password"),
          kind: "web",
        });
        onLogin(r.mfaRequired, r.enrollmentRequired);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login">
      <AuthTools />
      <section className="login-story">
        <Brand />
        <div>
          <div className="eyebrow light">{at("A PLACE FOR YOUR PEOPLE")}</div>
          <h1>
            {at("Good work starts")}
            <br />
            {at("with people.")}
          </h1>
          <p>
            One connected workspace for the teams
            <br />
            behind Defence Garden and River Green.
          </p>
        </div>
        <span className="login-footer">
          <ShieldCheck size={17} /> Your people. Your authorized workspace.
        </span>
      </section>
      <section className="login-form">
        <div className="mobile-brand">
          <Brand />
        </div>
        <div className="form-inner">
          <div className="eyebrow">DEFENCE GARDEN HR</div>
          <h2>
            {mode === "login"
              ? at("Welcome back")
              : mode === "recover"
                ? at("Reset your password")
                : at("Set a new password")}
          </h2>
          <p className="muted">
            {mode === "login"
              ? at("Sign in to your organization’s HR workspace.")
              : at("Secure access to your people workspace.")}
          </p>
          <form onSubmit={submit}>
            {mode !== "reset" && (
              <>
                <label>
                  {at("Email ID")}
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="username"
                    placeholder="you@company.com"
                  />
                </label>
              </>
            )}
            {mode !== "recover" && (
              <label>
                {at("Password")}
                <input
                  name="password"
                  type="password"
                  required
                  minLength={mode === "reset" ? 12 : 1}
                  maxLength={128}
                  autoComplete={
                    mode === "reset" ? "new-password" : "current-password"
                  }
                  placeholder={
                    mode === "reset"
                      ? at("At least 12 characters")
                      : at("Enter your password")
                  }
                />
              </label>
            )}
            {error && <Notice>{error}</Notice>}
            {message && (
              <div className="success" role="status">
                {message}
              </div>
            )}
            <Button disabled={busy} className="full">
              {busy
                ? at("Please wait…")
                : mode === "login"
                  ? at("Sign in")
                  : mode === "recover"
                    ? at("Send recovery link")
                    : at("Save password")}
              <ArrowRight size={17} />
            </Button>
          </form>
          <Button
            variant="ghost"
            onClick={() => {
              setError("");
              setMessage("");
              setMode(mode === "login" ? "recover" : "login");
            }}
          >
            {mode === "login"
              ? at("Forgot your password?")
              : at("Back to sign in")}
          </Button>
          <div className="access-note">
            <ShieldCheck size={19} />
            <span>
              {at("Access is granted by your administrator.")}
              <br />
              {at("Need help? Contact your HR team.")}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
function Mfa({
  enroll,
  onDone,
  onCancel,
}: {
  enroll: boolean;
  onDone: () => void;
  onCancel: () => void;
}) {
  const at = useAuthText();
  const [secret, setSecret] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function setup() {
    try {
      const r = await rest<{ secret: string }>("/auth/mfa/setup", {});
      setSecret(r.secret);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function verify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      await rest("/auth/mfa/verify", {
        code: new FormData(e.currentTarget).get("code"),
      });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="center-page">
      <AuthTools />
      <div className="auth-card">
        <Brand />
        <ShieldCheck className="large-icon" />
        <h2>{at("Two-step verification")}</h2>
        <p className="muted">
          {enroll
            ? "Administrative accounts need an authenticator before accessing employee records."
            : "Enter the current code from your authenticator."}
        </p>
        {enroll && !secret && (
          <Button onClick={setup}>{at("Set up authenticator")}</Button>
        )}
        {secret && (
          <label>
            Add this key to your authenticator
            <code className="secret">{secret}</code>
          </label>
        )}
        <form onSubmit={verify}>
          <label>
            {at("Six-digit code")}
            <input
              name="code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoComplete="one-time-code"
            />
          </label>
          {error && <Notice>{error}</Notice>}
          <Button disabled={busy || (enroll && !secret)} className="full">
            {at("Verify and continue")}
          </Button>
        </form>
        <Button variant="ghost" onClick={onCancel}>
          Cancel sign in
        </Button>
      </div>
    </div>
  );
}
function App() {
  const [auth, setAuth] = useState<AuthState>("loading"),
    [enroll, setEnroll] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const client = useQueryClient();
  useEffect(() => {
    rest<{ mfaRequired: boolean; enrollmentRequired: boolean }>("/auth/session")
      .then((r) => {
        setEnroll(r.enrollmentRequired);
        setAuth(r.mfaRequired ? "mfa" : "ready");
      })
      .catch(() => setAuth("login"));
  }, []);
  async function logout() {
    setSignOutError("");
    try {
      await rest("/auth/logout", {});
    } catch (error) {
      if (!(error instanceof ApiError && error.code === "UNAUTHENTICATED")) {
        setSignOutError(
          "Sign-out could not be confirmed. Check your connection and try again.",
        );
        return;
      }
    }
    await client.cancelQueries();
    client.clear();
    setAuth("login");
  }
  if (auth === "loading") return <Busy />;
  if (auth === "login")
    return (
      <Login
        onLogin={(m, e) => {
          setEnroll(e);
          setAuth(m ? "mfa" : "ready");
        }}
      />
    );
  if (auth === "mfa")
    return (
      <Mfa
        enroll={enroll}
        onDone={() => setAuth("ready")}
        onCancel={() => void logout()}
      />
    );
  return (
    <>
      {signOutError && (
        <div className="session-error">
          <Notice>{signOutError}</Notice>
        </div>
      )}
      <Workspace onLogout={logout} />
    </>
  );
}
const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      gcTime: 300_000,
    },
  },
});
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <HashRouter>
        <PreferencesProvider>
          <App />
          <Toaster richColors />
        </PreferencesProvider>
      </HashRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
