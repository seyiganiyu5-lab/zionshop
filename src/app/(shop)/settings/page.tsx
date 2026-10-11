import type { Metadata } from "next";
import QRCode from "qrcode";
import { ActionForm } from "@/components/ActionForm";
import { PasswordInput } from "@/components/PasswordInput";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { db } from "@/lib/db";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import { requireUser } from "@/lib/auth/session";
import { totpUri } from "@/lib/auth/totp";
import { getI18n } from "@/lib/i18n/server";
import {
  cancelTwoFactorSetup,
  changePassword,
  changeUsername,
  confirmTwoFactor,
  disableTwoFactor,
  signOutOtherDevices,
  startTwoFactor,
} from "./actions";
import { pendingTwoFactorSecret } from "./pending";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.settings.title };
}

function describeDevice(userAgent: string | null, fallback: string) {
  if (!userAgent) return fallback;
  const os = /iPhone|iPad/.test(userAgent)
    ? "iPhone/iPad"
    : /Android/.test(userAgent)
      ? "Android"
      : /Windows/.test(userAgent)
        ? "Windows"
        : /Mac OS X/.test(userAgent)
          ? "Mac"
          : /Linux/.test(userAgent)
            ? "Linux"
            : null;
  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /Chrome\//.test(userAgent)
      ? "Chrome"
      : /Firefox\//.test(userAgent)
        ? "Firefox"
        : /Safari\//.test(userAgent)
          ? "Safari"
          : null;
  return [browser, os].filter(Boolean).join(" · ") || fallback;
}

export default async function SettingsPage() {
  const session = await requireUser();
  const { t, fmt } = await getI18n();
  const s = t.settings;
  const { user } = session;

  const [sessions, attempts, pendingSecret] = await Promise.all([
    db.session.findMany({ where: { userId: user.id, expiresAt: { gt: new Date() } }, orderBy: { lastSeenAt: "desc" } }),
    db.loginAttempt.findMany({ orderBy: { createdAt: "desc" }, take: 15 }),
    user.totpEnabled ? null : pendingTwoFactorSecret(),
  ]);
  const qr = pendingSecret
    ? await QRCode.toDataURL(totpUri(pendingSecret, user.username), { margin: 1, width: 200 })
    : null;

  return (
    <>
      <PageHeader title={s.title} subtitle={s.subtitle(user.username)} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card space-y-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">{s.twoFactorTitle}</h2>
            <span className={`badge ${user.totpEnabled ? "badge-success" : "badge-warning"}`}>
              {user.totpEnabled ? "✓" : "!"} {user.totpEnabled ? s.enabled2fa : s.disabled2fa}
            </span>
          </div>
          <p className="text-sm text-muted">{user.totpEnabled ? s.twoFactorOn : s.twoFactorOff}</p>

          {user.totpEnabled ? (
            <ActionForm action={disableTwoFactor} className="grid max-w-xl gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <p className="text-sm sm:col-span-3">{s.disableHelp}</p>
              <label>
                <span className="label">{t.auth.password}</span>
                <PasswordInput name="password" required autoComplete="current-password" />
              </label>
              <label>
                <span className="label">{t.auth.code}</span>
                <input name="code" required inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="input font-mono" />
              </label>
              <SubmitButton className="btn btn-danger">{s.disable2fa}</SubmitButton>
            </ActionForm>
          ) : pendingSecret && qr ? (
            <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
              <div>
                <p className="mb-2 text-sm font-medium">{s.scan}</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr} alt="QR code" width={200} height={200} className="rounded-lg bg-white p-2" />
                <p className="mt-3 text-xs text-muted">{s.manual}</p>
                <code className="mt-1 block max-w-[220px] text-xs break-all">{pendingSecret}</code>
              </div>
              <div className="space-y-3">
                <ActionForm action={confirmTwoFactor} className="space-y-3">
                  <label className="block max-w-xs">
                    <span className="label">{s.enterCode}</span>
                    <input
                      name="code"
                      required
                      autoFocus
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="\d{6}"
                      maxLength={6}
                      className="input text-center font-mono text-lg tracking-[0.4em]"
                    />
                  </label>
                  <SubmitButton>{s.confirm2fa}</SubmitButton>
                </ActionForm>
                <form action={cancelTwoFactorSetup}>
                  <button className="text-sm text-muted hover:text-fg">{s.cancel}</button>
                </form>
              </div>
            </div>
          ) : (
            <form action={startTwoFactor}>
              <button className="btn btn-primary">{s.start2fa}</button>
            </form>
          )}
        </section>

        <section className="card">
          <h2 className="mb-4 font-semibold">{s.passwordTitle}</h2>
          <ActionForm action={changePassword} resetOnSuccess className="space-y-3">
            {/* Lets password managers know which account this is for. */}
            <input type="text" name="username" autoComplete="username" defaultValue={user.username} hidden readOnly />
            <label className="block">
              <span className="label">{s.currentPassword}</span>
              <PasswordInput name="current" required autoComplete="current-password" />
            </label>
            <label className="block">
              <span className="label">{s.newPassword}</span>
              <PasswordInput name="next" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" />
              <span className="mt-1 block text-xs text-muted">{s.passwordHelp(MIN_PASSWORD_LENGTH)}</span>
            </label>
            <label className="block">
              <span className="label">{s.confirmPassword}</span>
              <PasswordInput name="confirm" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" />
            </label>
            <SubmitButton>{s.changePassword}</SubmitButton>
          </ActionForm>
        </section>

        <section className="card">
          <h2 className="mb-4 font-semibold">{s.usernameTitle}</h2>
          <ActionForm action={changeUsername} className="space-y-3">
            <label className="block">
              <span className="label">{s.newUsername}</span>
              <input
                name="username"
                required
                defaultValue={user.username}
                autoCapitalize="none"
                spellCheck={false}
                pattern="[A-Za-z0-9._\-]{3,32}"
                className="input"
              />
              <span className="mt-1 block text-xs text-muted">{s.usernameHelp}</span>
            </label>
            <label className="block">
              <span className="label">{s.currentPassword}</span>
              <PasswordInput name="password" required autoComplete="current-password" />
            </label>
            <SubmitButton>{s.changeUsername}</SubmitButton>
          </ActionForm>
        </section>

        <section className="card">
          <h2 className="mb-3 font-semibold">{s.sessionsTitle}</h2>
          <ul className="mb-4 divide-y divide-line">
            {sessions.map((x) => (
              <li key={x.id} className="py-2 text-sm">
                <div className="font-medium">
                  {describeDevice(x.userAgent, s.unknownDevice)}
                  {x.id === session.id && <span className="ml-2 badge badge-success">{s.thisDevice}</span>}
                </div>
                <div className="text-xs text-muted">
                  {x.ip} · {s.lastActive(fmt.dateTime(x.lastSeenAt))}
                </div>
              </li>
            ))}
          </ul>
          {sessions.length > 1 && (
            <ActionForm action={signOutOtherDevices}>
              <SubmitButton className="btn btn-secondary">{s.signOutOthers}</SubmitButton>
            </ActionForm>
          )}
        </section>

        <section className="card">
          <h2 className="mb-3 font-semibold">{s.activityTitle}</h2>
          {attempts.length === 0 ? (
            <p className="text-sm text-muted">{s.noActivity}</p>
          ) : (
            <ul className="divide-y divide-line">
              {attempts.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span>
                    <span className={`badge ${a.success ? "badge-success" : "badge-danger"}`}>
                      {a.success ? s.success : s.failed}
                    </span>
                    <span className="ml-2 font-mono text-xs">{a.username}</span>
                  </span>
                  <span className="text-right text-xs text-muted">
                    {a.ip}
                    <br />
                    {fmt.dateTime(a.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
