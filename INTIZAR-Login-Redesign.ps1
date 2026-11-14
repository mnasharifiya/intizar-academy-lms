# INTIZAR ACADEMY login redesign
# Run this script from the root of the existing Vite/React project.
# It backs up the current LoginPage.tsx and any existing LoginPage.css before writing.

$ErrorActionPreference = 'Stop'

$projectRoot = (Get-Location).Path
$packageJson = Join-Path $projectRoot 'package.json'
$loginPath = Join-Path $projectRoot 'src\pages\auth\LoginPage.tsx'
$cssPath = Join-Path $projectRoot 'src\pages\auth\LoginPage.css'
$assetsPath = Join-Path $projectRoot 'src\assets'
$logoPath = Join-Path $projectRoot 'public\intizar-logo.jpg'

if (-not (Test-Path -LiteralPath $packageJson)) {
    throw 'package.json was not found. Open the INTIZAR ACADEMY project root in VS Code terminal and run this script again.'
}
if (-not (Test-Path -LiteralPath $loginPath)) {
    throw "Expected login component was not found: $loginPath. No files were changed."
}

$photoNames = @(
    'IMG-20261113-WA0002.jpg',
    'IMG-20261113-WA0003.jpg',
    'IMG-20261113-WA0004.jpg',
    'IMG-20261113-WA0005.jpg',
    'IMG-20261113-WA0006.jpg',
    'IMG-20261113-WA0007.jpg',
    'IMG-20261113-WA0008.jpg',
    'IMG-20261113-WA0009.jpg',
    'FB_IMG_1794583138954.jpg',
    'FB_IMG_1794583344967.jpg',
    'FB_IMG_1794583377573.jpg',
    'FB_IMG_1794583460982.jpg'
)

Write-Host ''
Write-Host 'INTIZAR ACADEMY asset check' -ForegroundColor Cyan
if (Test-Path -LiteralPath $assetsPath) {
    foreach ($name in $photoNames) {
        $asset = Join-Path $assetsPath $name
        if (Test-Path -LiteralPath $asset) {
            Write-Host "  FOUND   $name" -ForegroundColor Green
        } else {
            Write-Host "  MISSING $name" -ForegroundColor Yellow
        }
    }
} else {
    Write-Warning "The expected assets folder was not found: $assetsPath. The photo carousel will show its branded fallback until the assets are placed in src/assets."
}

if (Test-Path -LiteralPath $logoPath) {
    Write-Host '  FOUND   public\intizar-logo.jpg' -ForegroundColor Green
} else {
    Write-Warning 'public\intizar-logo.jpg was not found. The current component already references this path; confirm the official logo exists there or update LOGO_SRC in LoginPage.tsx.'
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupLogin = "$loginPath.$timestamp.bak"
Copy-Item -LiteralPath $loginPath -Destination $backupLogin
Write-Host "Backed up LoginPage.tsx to: $backupLogin" -ForegroundColor DarkCyan

if (Test-Path -LiteralPath $cssPath) {
    $backupCss = "$cssPath.$timestamp.bak"
    Copy-Item -LiteralPath $cssPath -Destination $backupCss
    Write-Host "Backed up LoginPage.css to: $backupCss" -ForegroundColor DarkCyan
}

$tsx = @'
import React, { useEffect, useState } from "react";
import { APP_NAME } from "../../lib/theme";
import { signIn } from "../../lib/api";
import "./LoginPage.css";

type LoginPageProps = {
  onLogin: (user: any) => void;
  onApply?: () => void;
  onVerify?: () => void;
  onForgotPassword?: () => void;
};

type IconName =
  | "mail"
  | "lock"
  | "eye"
  | "eyeOff"
  | "login"
  | "book"
  | "progress"
  | "certificate"
  | "arrow";

const ICON_PATHS: Record<IconName, string[]> = {
  mail: ["M4 6h16v12H4z", "m4 7 8 6 8-6"],
  lock: ["M5 10h14v10H5z", "M8 10V7a4 4 0 0 1 8 0v3"],
  eye: ["M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z", "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"],
  eyeOff: ["m3 3 18 18", "M10.6 10.6a2 2 0 0 0 2.8 2.8", "M9.9 5.2A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a16 16 0 0 1-3.1 3.9", "M6.2 6.2C3.5 8 2 12 2 12s3.5 7 10 7a10 10 0 0 0 4-.8"],
  login: ["M10 17l5-5-5-5", "M15 12H3", "M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"],
  book: ["M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22z", "M4 5.5v14A2.5 2.5 0 0 1 6.5 17H20", "M8 7h8", "M8 10h7"],
  progress: ["M3 3v18h18", "m7 14 4-4 3 3 6-7", "M16 6h4v4"],
  certificate: ["M6 3h12v13H6z", "M9 7h6", "M9 10h6", "m9 16-1 5 4-2 4 2-1-5"],
  arrow: ["M7 17 17 7", "M7 7h10v10"],
};

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
    >
      {ICON_PATHS[name].map((path, index) => (
        <path d={path} key={`${name}-${index}`} />
      ))}
    </svg>
  );
}

const LOGO_SRC = "/intizar-logo.jpg";

// These are the photo filenames supplied in the existing LoginPage implementation.
// Vite resolves only files that actually exist in src/assets, so missing files are skipped safely.
const PHOTO_FILENAMES = [
  "IMG-20261113-WA0002.jpg",
  "IMG-20261113-WA0003.jpg",
  "IMG-20261113-WA0004.jpg",
  "IMG-20261113-WA0005.jpg",
  "IMG-20261113-WA0006.jpg",
  "IMG-20261113-WA0007.jpg",
  "IMG-20261113-WA0008.jpg",
  "IMG-20261113-WA0009.jpg",
  "FB_IMG_1794583138954.jpg",
  "FB_IMG_1794583344967.jpg",
  "FB_IMG_1794583377573.jpg",
  "FB_IMG_1794583460982.jpg",
];

const photoModules = import.meta.glob("../../assets/*.{jpg,jpeg,png,webp}", {
  eager: true,
  import: "default",
  query: "?url",
}) as Record<string, string>;

const CAROUSEL_PHOTOS = PHOTO_FILENAMES.flatMap((filename) => {
  const match = Object.entries(photoModules).find(([path]) =>
    path.toLowerCase().endsWith(`/${filename.toLowerCase()}`),
  );
  return match ? [{ src: match[1], alt: "INTIZAR Academy students and learning environment" }] : [];
});

export default function LoginPage({
  onLogin,
  onApply,
  onVerify,
  onForgotPassword,
}: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    try {
      const savedEmail = window.localStorage.getItem("intizar.rememberedEmail");
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch {
      // Storage can be unavailable in privacy-restricted browsing contexts.
    }
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener?.("change", updatePreference);
    return () => mediaQuery.removeEventListener?.("change", updatePreference);
  }, []);

  useEffect(() => {
    if (isPaused || reducedMotion || CAROUSEL_PHOTOS.length < 2) return;
    const timer = window.setInterval(() => {
      setCurrentPhotoIndex((previous) => (previous + 1) % CAROUSEL_PHOTOS.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [isPaused, reducedMotion]);

  function goToPhoto(index: number) {
    if (CAROUSEL_PHOTOS.length === 0) return;
    setCurrentPhotoIndex((index + CAROUSEL_PHOTOS.length) % CAROUSEL_PHOTOS.length);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const normalizedEmail = email.trim();
      const user = await signIn(normalizedEmail, password);
      try {
        if (rememberMe) window.localStorage.setItem("intizar.rememberedEmail", normalizedEmail);
        else window.localStorage.removeItem("intizar.rememberedEmail");
      } catch {
        // Authentication must still succeed if local storage is unavailable.
      }
      onLogin(user);
    } catch (err: any) {
      setError(err?.message || "Login failed. Please check your email and password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="intizar-login-page">
      <section
        className="intizar-brand-panel"
        aria-label="INTIZAR Academy introduction"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocusCapture={() => setIsPaused(true)}
        onBlurCapture={(event) => {
          const nextTarget = event.relatedTarget as Node | null;
          if (!nextTarget || !event.currentTarget.contains(nextTarget)) setIsPaused(false);
        }}
      >
        <div className="intizar-photo-stage" aria-roledescription="carousel" aria-label="Photos of INTIZAR Academy">
          {CAROUSEL_PHOTOS.length > 0 ? (
            CAROUSEL_PHOTOS.map((photo, index) => (
              <img
                className={`intizar-slide${index === currentPhotoIndex ? " is-active" : ""}`}
                src={photo.src}
                alt={index === currentPhotoIndex ? photo.alt : ""}
                aria-hidden={index !== currentPhotoIndex}
                key={photo.src}
                loading={index === 0 ? "eager" : "lazy"}
                decoding="async"
              />
            ))
          ) : (
            <div className="intizar-photo-fallback" />
          )}
          <div className="intizar-photo-overlay" />
        </div>

        <div className="intizar-brand-content">
          <header className="intizar-brand-header">
            <div className="intizar-logo-wrap">
              <img className="intizar-brand-logo" src={LOGO_SRC} alt="INTIZAR Academy crest" />
            </div>
            <div className="intizar-brand-heading">
              <div className="intizar-brand-name">{APP_NAME || "INTIZAR ACADEMY"}</div>
              <div className="intizar-brand-tagline">LEARNING MANAGEMENT PORTAL</div>
            </div>
          </header>

          <div className="intizar-brand-copy">
            <div className="intizar-eyebrow">A COMMUNITY BUILT FOR GROWTH</div>
            <h1>
              Building Knowledge.
              <span>Shaping Tomorrow.</span>
            </h1>
            <p className="intizar-brand-description">
              A learning community where students develop knowledge, skills, discipline and character.
            </p>

            <div className="intizar-carousel-controls" aria-label="Choose a featured photograph">
              <div className="intizar-carousel-dots">
                {CAROUSEL_PHOTOS.map((photo, index) => (
                  <button
                    className={`intizar-carousel-dot${index === currentPhotoIndex ? " is-active" : ""}`}
                    key={photo.src}
                    type="button"
                    onClick={() => goToPhoto(index)}
                    aria-label={`Show photograph ${index + 1}`}
                    aria-current={index === currentPhotoIndex ? "true" : undefined}
                  />
                ))}
              </div>
              {CAROUSEL_PHOTOS.length > 1 && (
                <div className="intizar-carousel-arrows">
                  <button type="button" onClick={() => goToPhoto(currentPhotoIndex - 1)} aria-label="Previous photograph">‹</button>
                  <button type="button" onClick={() => goToPhoto(currentPhotoIndex + 1)} aria-label="Next photograph">›</button>
                </div>
              )}
            </div>

            <div className="intizar-brand-features">
              <div className="intizar-feature">
                <span className="intizar-feature-icon"><Icon name="book" size={22} /></span>
                <span>Structured<br />Learning</span>
              </div>
              <div className="intizar-feature-divider" />
              <div className="intizar-feature">
                <span className="intizar-feature-icon"><Icon name="progress" size={22} /></span>
                <span>Track Your<br />Progress</span>
              </div>
              <div className="intizar-feature-divider" />
              <div className="intizar-feature">
                <span className="intizar-feature-icon"><Icon name="certificate" size={22} /></span>
                <span>Verified<br />Certificates</span>
              </div>
            </div>
          </div>

          <div className="intizar-brand-footer">
            <span>Discover INTIZAR</span>
            <Icon name="arrow" size={17} />
            <span className="intizar-brand-footer-rule" />
            <span className="intizar-brand-footer-note">LEARN · GROW · ACHIEVE</span>
          </div>
        </div>
      </section>

      <section className="intizar-auth-panel" aria-label="Sign in to INTIZAR Academy">
        <img className="intizar-watermark" src={LOGO_SRC} alt="" aria-hidden="true" />
        <div className="intizar-auth-content">
          <div className="intizar-auth-card">
            <div className="intizar-auth-heading">
              <div className="intizar-auth-eyebrow">YOUR LEARNING SPACE</div>
              <h2>Welcome back</h2>
              <p>Sign in to continue your learning journey.</p>
            </div>

            {error && (
              <div className="intizar-login-error" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={submit}>
              <div className="intizar-form-field">
                <label htmlFor="intizar-email">Email address</label>
                <div className="intizar-input-wrap">
                  <span className="intizar-input-icon"><Icon name="mail" size={19} /></span>
                  <input
                    id="intizar-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Enter your email address"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div className="intizar-form-field">
                <label htmlFor="intizar-password">Password</label>
                <div className="intizar-input-wrap">
                  <span className="intizar-input-icon"><Icon name="lock" size={19} /></span>
                  <input
                    id="intizar-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    className="intizar-password-toggle"
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                  >
                    <Icon name={showPassword ? "eyeOff" : "eye"} size={19} />
                  </button>
                </div>
              </div>

              <div className="intizar-form-options">
                <label className="intizar-remember-me">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
                {onForgotPassword && (
                  <button className="intizar-text-action" type="button" onClick={onForgotPassword}>
                    Forgot password?
                  </button>
                )}
              </div>

              <button className="intizar-signin-button" type="submit" disabled={loading}>
                <span>{loading ? "Signing in…" : "Sign In"}</span>
                {!loading && <Icon name="login" size={19} />}
              </button>
            </form>

            {(onApply || onVerify) && (
              <>
                <div className="intizar-auth-divider"><span>OTHER PORTAL SERVICES</span></div>
                <div className="intizar-secondary-actions">
                  {onApply && (
                    <button className="intizar-secondary-button" type="button" onClick={onApply}>
                      Apply for Admission <Icon name="arrow" size={15} />
                    </button>
                  )}
                  {onVerify && (
                    <button className="intizar-secondary-button" type="button" onClick={onVerify}>
                      Verify Certificate <Icon name="arrow" size={15} />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="intizar-auth-footer">
            <span className="intizar-footer-line" />
            <span>INTIZAR ACADEMY <b>·</b> LEARNING <b>·</b> CHARACTER <b>·</b> EXCELLENCE</span>
            <span className="intizar-footer-line" />
          </div>
        </div>
      </section>
    </main>
  );
}
'@

$css = @'
:root {
  --intizar-forest: #064e3b;
  --intizar-deep: #022c22;
  --intizar-green: #0f7653;
  --intizar-bright: #34d399;
  --intizar-ink: #17382e;
  --intizar-muted: #718078;
  --intizar-border: #e5ece8;
  --intizar-paper: #fbfdfb;
}

.intizar-login-page,
.intizar-login-page * {
  box-sizing: border-box;
}

.intizar-login-page {
  min-height: 100vh;
  min-height: 100svh;
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(420px, 1fr);
  overflow: hidden;
  background: var(--intizar-paper);
  color: var(--intizar-ink);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.intizar-brand-panel {
  position: relative;
  isolation: isolate;
  min-width: 0;
  min-height: 100vh;
  min-height: 100svh;
  overflow: hidden;
  padding: clamp(28px, 3.8vw, 62px) clamp(28px, 4vw, 66px) 27px;
  color: #fff;
  background:
    radial-gradient(circle at 12% 80%, rgba(52, 211, 153, .17), transparent 31%),
    linear-gradient(135deg, #064e3b 0%, #043d30 55%, #022c22 100%);
  clip-path: polygon(0 0, 100% 0, 95.5% 100%, 0 100%);
}

.intizar-brand-panel::before,
.intizar-brand-panel::after {
  content: "";
  position: absolute;
  pointer-events: none;
  z-index: 1;
}

.intizar-brand-panel::before {
  width: 430px;
  height: 430px;
  border: 1px solid rgba(255, 255, 255, .09);
  border-radius: 50%;
  right: -205px;
  top: -225px;
  box-shadow: 0 0 0 35px rgba(255,255,255,.018), 0 0 0 75px rgba(255,255,255,.014);
}

.intizar-brand-panel::after {
  width: 280px;
  height: 280px;
  border: 1px solid rgba(52, 211, 153, .16);
  border-radius: 50%;
  left: -205px;
  bottom: -180px;
}

.intizar-photo-stage {
  position: absolute;
  z-index: 0;
  inset: 132px 25px 115px 21%;
  overflow: hidden;
  border-radius: 28px 76px 28px 28px;
  background: linear-gradient(145deg, #0e7453, #022c22);
  box-shadow: 0 28px 70px rgba(0, 0, 0, .24);
}

.intizar-slide {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  object-position: center;
  opacity: 0;
  transform: scale(1.025);
  transition: opacity 1.15s ease, transform 7.2s ease;
}

.intizar-slide.is-active {
  opacity: 1;
  transform: scale(1);
}

.intizar-photo-fallback {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 70% 35%, rgba(52, 211, 153, .36), transparent 40%),
    linear-gradient(135deg, #0d7654, #022c22);
}

.intizar-photo-overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(2, 44, 34, .82) 0%, rgba(2, 44, 34, .42) 35%, rgba(2, 44, 34, .08) 78%),
    linear-gradient(0deg, rgba(2, 44, 34, .91) 0%, rgba(2, 44, 34, .24) 38%, rgba(2, 44, 34, .05) 75%);
}

.intizar-brand-content {
  position: relative;
  z-index: 2;
  min-height: calc(100vh - 27px - clamp(28px, 3.8vw, 62px));
  min-height: calc(100svh - 27px - clamp(28px, 3.8vw, 62px));
  display: flex;
  flex-direction: column;
}

.intizar-brand-header {
  display: flex;
  align-items: center;
  gap: 18px;
  max-width: 610px;
}

.intizar-logo-wrap {
  flex: 0 0 auto;
  width: 66px;
  height: 66px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, .82);
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, .15);
}

.intizar-brand-logo {
  width: 88%;
  height: 88%;
  object-fit: contain;
  display: block;
}

.intizar-brand-heading {
  min-width: 0;
  padding-left: 18px;
  border-left: 1px solid rgba(255, 255, 255, .5);
}

.intizar-brand-name {
  color: #fff;
  font-size: clamp(18px, 1.65vw, 25px);
  line-height: 1.1;
  font-weight: 850;
  letter-spacing: .035em;
  text-transform: uppercase;
}

.intizar-brand-tagline {
  margin-top: 7px;
  color: rgba(232, 255, 244, .78);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .19em;
}

.intizar-brand-copy {
  position: relative;
  width: min(100%, 710px);
  margin-top: auto;
  padding-bottom: 25px;
}

.intizar-eyebrow,
.intizar-auth-eyebrow {
  color: var(--intizar-bright);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .19em;
}

.intizar-brand-copy h1 {
  margin: 13px 0 15px;
  color: #fff;
  font-size: clamp(38px, 4.1vw, 64px);
  line-height: 1.015;
  font-weight: 850;
  letter-spacing: -.055em;
  text-wrap: balance;
}

.intizar-brand-copy h1 span {
  display: block;
  color: var(--intizar-bright);
}

.intizar-brand-description {
  max-width: 490px;
  margin: 0;
  color: rgba(241, 255, 247, .88);
  font-size: clamp(13px, 1.1vw, 15px);
  line-height: 1.75;
}

.intizar-carousel-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 440px;
  min-height: 35px;
  margin-top: 14px;
}

.intizar-carousel-dots {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
}

.intizar-carousel-dot {
  width: 7px;
  height: 7px;
  padding: 0;
  border: 0;
  border-radius: 20px;
  background: rgba(255, 255, 255, .42);
  cursor: pointer;
  transition: width .25s ease, background .25s ease;
}

.intizar-carousel-dot.is-active {
  width: 25px;
  background: var(--intizar-bright);
}

.intizar-carousel-dot:focus-visible,
.intizar-carousel-arrows button:focus-visible,
.intizar-text-action:focus-visible,
.intizar-password-toggle:focus-visible,
.intizar-signin-button:focus-visible,
.intizar-secondary-button:focus-visible {
  outline: 3px solid rgba(52, 211, 153, .72);
  outline-offset: 3px;
}

.intizar-carousel-arrows {
  display: flex;
  gap: 7px;
}

.intizar-carousel-arrows button {
  width: 28px;
  height: 28px;
  padding: 0 0 3px;
  border: 1px solid rgba(255,255,255,.36);
  border-radius: 50%;
  color: white;
  background: rgba(255,255,255,.09);
  font-size: 23px;
  line-height: 1;
  cursor: pointer;
}

.intizar-brand-features {
  display: flex;
  align-items: center;
  gap: clamp(12px, 1.4vw, 23px);
  width: fit-content;
  max-width: 100%;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, .2);
}

.intizar-feature {
  display: flex;
  align-items: center;
  gap: 11px;
  color: rgba(255, 255, 255, .96);
  font-size: 11px;
  font-weight: 650;
  line-height: 1.4;
  white-space: nowrap;
}

.intizar-feature-icon {
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, .25);
  border-radius: 12px;
  color: var(--intizar-bright);
  background: rgba(255, 255, 255, .09);
}

.intizar-feature-divider {
  width: 1px;
  height: 31px;
  background: rgba(255, 255, 255, .24);
}

.intizar-brand-footer {
  display: flex;
  align-items: center;
  gap: 9px;
  padding-top: 17px;
  color: #fff;
  font-size: 11px;
  font-weight: 750;
  letter-spacing: .04em;
}

.intizar-brand-footer svg {
  color: var(--intizar-bright);
}

.intizar-brand-footer-rule {
  width: 36px;
  height: 1px;
  margin-left: 5px;
  background: rgba(255,255,255,.42);
}

.intizar-brand-footer-note {
  color: rgba(255,255,255,.63);
  font-size: 9px;
  letter-spacing: .16em;
}

.intizar-auth-panel {
  position: relative;
  min-width: 0;
  min-height: 100vh;
  min-height: 100svh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 54px clamp(30px, 4.2vw, 72px) 72px clamp(25px, 3.5vw, 58px);
  overflow: hidden;
  background:
    radial-gradient(circle at 100% 0%, rgba(52, 211, 153, .055), transparent 34%),
    var(--intizar-paper);
}

.intizar-watermark {
  position: absolute;
  z-index: 0;
  top: 5%;
  right: 4%;
  width: clamp(125px, 14vw, 205px);
  height: auto;
  max-height: 220px;
  object-fit: contain;
  opacity: .045;
  filter: grayscale(1);
  pointer-events: none;
}

.intizar-auth-content {
  position: relative;
  z-index: 1;
  width: min(100%, 450px);
  margin: auto;
}

.intizar-auth-card {
  width: 100%;
  padding: clamp(30px, 3.2vw, 46px);
  border: 1px solid rgba(20, 75, 54, .09);
  border-radius: 25px;
  background: rgba(255, 255, 255, .97);
  box-shadow: 0 24px 70px rgba(22, 58, 43, .095), 0 3px 10px rgba(22, 58, 43, .035);
}

.intizar-auth-heading {
  margin-bottom: 29px;
  text-align: left;
}

.intizar-auth-eyebrow {
  margin-bottom: 11px;
  color: #159466;
  font-size: 9px;
}

.intizar-auth-heading h2 {
  margin: 0 0 8px;
  color: #18392d;
  font-size: clamp(27px, 2.4vw, 34px);
  line-height: 1.15;
  font-weight: 820;
  letter-spacing: -.045em;
}

.intizar-auth-heading p {
  margin: 0;
  color: #78847e;
  font-size: 13px;
  line-height: 1.6;
}

.intizar-login-error {
  margin: -9px 0 19px;
  padding: 12px 14px;
  border: 1px solid #fecaca;
  border-radius: 11px;
  color: #a52222;
  background: #fff5f5;
  font-size: 12px;
  line-height: 1.5;
}

.intizar-form-field {
  margin-bottom: 19px;
}

.intizar-form-field label {
  display: block;
  margin-bottom: 8px;
  color: #344c41;
  font-size: 12px;
  font-weight: 750;
}

.intizar-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.intizar-label-row label {
  margin-bottom: 8px;
}

.intizar-text-action {
  margin: 0 0 8px;
  padding: 0;
  border: 0;
  color: #13875e;
  background: transparent;
  font: inherit;
  font-size: 11px;
  font-weight: 750;
  cursor: pointer;
}

.intizar-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 53px;
  border: 1px solid #dfe8e2;
  border-radius: 11px;
  background: #fff;
  transition: border-color .2s ease, box-shadow .2s ease;
}

.intizar-input-wrap:focus-within {
  border-color: #269b70;
  box-shadow: 0 0 0 3px rgba(52, 211, 153, .13);
}

.intizar-input-icon {
  display: grid;
  place-items: center;
  width: 48px;
  flex: 0 0 48px;
  color: #87978e;
}

.intizar-input-wrap input {
  width: 100%;
  min-width: 0;
  height: 51px;
  padding: 0 14px 0 0;
  border: 0;
  outline: 0;
  color: #203d31;
  background: transparent;
  font: inherit;
  font-size: 13px;
}

.intizar-input-wrap input::placeholder {
  color: #a1ada6;
}

.intizar-password-toggle {
  width: 45px;
  height: 48px;
  flex: 0 0 45px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  color: #7b8c82;
  background: transparent;
  cursor: pointer;
}

.intizar-form-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 3px 0 22px;
  color: #849189;
  font-size: 10px;
}

.intizar-remember-me {
  display: inline-flex !important;
  align-items: center;
  gap: 8px;
  margin: 0 !important;
  color: #68786f !important;
  font-size: 11px !important;
  font-weight: 550 !important;
  cursor: pointer;
}

.intizar-remember-me input {
  width: 15px;
  height: 15px;
  margin: 0;
  accent-color: #08764f;
  cursor: pointer;
}

.intizar-signin-button {
  width: 100%;
  min-height: 53px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 0 20px;
  border: 0;
  border-radius: 11px;
  color: #fff;
  background: linear-gradient(100deg, #07563e, #08764f);
  box-shadow: 0 9px 20px rgba(6, 78, 59, .16);
  font: inherit;
  font-size: 13px;
  font-weight: 780;
  cursor: pointer;
  transition: transform .2s ease, box-shadow .2s ease, filter .2s ease;
}

.intizar-signin-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(6, 78, 59, .2);
  filter: brightness(1.04);
}

.intizar-signin-button:disabled {
  opacity: .7;
  cursor: wait;
}

.intizar-auth-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 25px 0 15px;
  color: #9aa69f;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: .14em;
  white-space: nowrap;
}

.intizar-auth-divider::before,
.intizar-auth-divider::after {
  content: "";
  height: 1px;
  flex: 1;
  background: #e9efeb;
}

.intizar-secondary-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.intizar-secondary-button {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 10px;
  border: 1px solid #b9d9c9;
  border-radius: 10px;
  color: #176c4d;
  background: #fff;
  font: inherit;
  font-size: 10px;
  font-weight: 750;
  cursor: pointer;
  transition: background .2s ease, border-color .2s ease, transform .2s ease;
}

.intizar-secondary-button:hover {
  transform: translateY(-1px);
  border-color: #75bd9b;
  background: #f4fbf7;
}

.intizar-auth-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 29px;
  color: #9aa59f;
  font-size: 8px;
  font-weight: 750;
  letter-spacing: .105em;
  text-align: center;
  white-space: nowrap;
}

.intizar-auth-footer b {
  padding: 0 2px;
  color: #4c9b75;
}

.intizar-footer-line {
  width: 22px;
  height: 1px;
  flex: 0 0 22px;
  background: #dce8e0;
}

@media (min-width: 1500px) {
  .intizar-brand-copy h1 {
    font-size: clamp(60px, 4vw, 72px);
  }
  .intizar-auth-content {
    max-width: 470px;
  }
}

@media (max-width: 1100px) {
  .intizar-login-page {
    grid-template-columns: minmax(0, 1.2fr) minmax(390px, 1fr);
  }
  .intizar-brand-panel {
    padding-left: 34px;
    padding-right: 32px;
  }
  .intizar-photo-stage {
    left: 16%;
    right: 12px;
  }
  .intizar-feature {
    gap: 7px;
    font-size: 10px;
  }
  .intizar-feature-icon {
    width: 33px;
    height: 33px;
  }
  .intizar-auth-panel {
    padding-left: 20px;
    padding-right: 28px;
  }
}

@media (max-width: 850px) {
  .intizar-login-page {
    grid-template-columns: 1fr;
    overflow: visible;
  }
  .intizar-brand-panel {
    min-height: 620px;
    min-height: 72svh;
    clip-path: none;
    padding: 30px clamp(24px, 6vw, 54px) 25px;
  }
  .intizar-brand-content {
    min-height: calc(72svh - 55px);
  }
  .intizar-photo-stage {
    inset: 105px 18px 105px 19%;
    border-radius: 24px 62px 24px 24px;
  }
  .intizar-brand-copy {
    max-width: 650px;
  }
  .intizar-brand-copy h1 {
    font-size: clamp(43px, 7vw, 61px);
  }
  .intizar-auth-panel {
    min-height: auto;
    padding: 55px 24px 35px;
  }
  .intizar-auth-content {
    max-width: 490px;
  }
  .intizar-watermark {
    top: 15px;
    right: 20px;
  }
}

@media (max-width: 540px) {
  .intizar-brand-panel {
    min-height: 625px;
    min-height: 78svh;
    padding: 24px 22px 22px;
  }
  .intizar-brand-content {
    min-height: calc(78svh - 46px);
  }
  .intizar-brand-header {
    gap: 12px;
  }
  .intizar-logo-wrap {
    width: 53px;
    height: 53px;
  }
  .intizar-brand-heading {
    padding-left: 12px;
  }
  .intizar-brand-name {
    font-size: 16px;
  }
  .intizar-brand-tagline {
    font-size: 8px;
    letter-spacing: .12em;
  }
  .intizar-photo-stage {
    inset: 92px 10px 130px 13%;
    border-radius: 20px 48px 20px 20px;
  }
  .intizar-brand-copy h1 {
    margin: 10px 0 11px;
    font-size: clamp(36px, 10vw, 48px);
  }
  .intizar-brand-description {
    max-width: 355px;
    font-size: 12px;
  }
  .intizar-eyebrow {
    font-size: 8px;
  }
  .intizar-brand-features {
    width: 100%;
    justify-content: space-between;
    gap: 8px;
    padding-top: 15px;
  }
  .intizar-feature {
    gap: 6px;
    font-size: 9px;
    white-space: normal;
  }
  .intizar-feature-icon {
    width: 29px;
    height: 29px;
    border-radius: 9px;
  }
  .intizar-feature-icon svg {
    width: 17px;
    height: 17px;
  }
  .intizar-feature-divider {
    height: 25px;
  }
  .intizar-brand-footer {
    font-size: 10px;
  }
  .intizar-brand-footer-note,
  .intizar-brand-footer-rule {
    display: none;
  }
  .intizar-auth-panel {
    padding: 38px 17px 27px;
  }
  .intizar-auth-card {
    padding: 29px 22px;
    border-radius: 20px;
  }
  .intizar-auth-heading h2 {
    font-size: 28px;
  }
  .intizar-secondary-actions {
    grid-template-columns: 1fr;
  }
  .intizar-secondary-button {
    min-height: 45px;
    font-size: 11px;
  }
  .intizar-auth-footer {
    gap: 7px;
    font-size: 7px;
    letter-spacing: .06em;
  }
  .intizar-footer-line {
    width: 11px;
    flex-basis: 11px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .intizar-login-page *,
  .intizar-login-page *::before,
  .intizar-login-page *::after {
    scroll-behavior: auto !important;
    transition-duration: .01ms !important;
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
  }
}
'@

$encoding = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText($loginPath, $tsx, $encoding)
[System.IO.File]::WriteAllText($cssPath, $css, $encoding)

Write-Host ''
Write-Host 'INTIZAR login redesign files written successfully.' -ForegroundColor Green
Write-Host "Updated: $loginPath"
Write-Host "Created: $cssPath"
Write-Host ''
Write-Host 'Next, run:' -ForegroundColor Cyan
Write-Host '  npm run build' -ForegroundColor White
Write-Host ''
Write-Host 'Then open the app and inspect the login page at desktop and mobile widths.' -ForegroundColor Cyan
Write-Host 'If the logo is not visible, verify that public\intizar-logo.jpg is the correct original crest file.' -ForegroundColor Yellow
