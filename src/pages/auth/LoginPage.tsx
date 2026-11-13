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
                  <button className="intizar-carousel-nav" type="button" onClick={() => goToPhoto(currentPhotoIndex - 1)} aria-label="Previous photograph">
                    <span className="intizar-carousel-arrow-icon" aria-hidden="true">&#8592;</span>
                    <span>PREVIOUS</span>
                  </button>
                  <button className="intizar-carousel-nav" type="button" onClick={() => goToPhoto(currentPhotoIndex + 1)} aria-label="Next photograph">
                    <span>NEXT</span>
                    <span className="intizar-carousel-arrow-icon" aria-hidden="true">&#8594;</span>
                  </button>
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
            <span className="intizar-brand-footer-note">LEARN Â· GROW Â· ACHIEVE</span>
          </div>
        </div>
      </section>

      <section className="intizar-auth-panel" aria-label="Sign in to INTIZAR Academy">
        <img className="intizar-watermark" src={LOGO_SRC} alt="" aria-hidden="true" />
        <div className="intizar-auth-content">
          <div className="intizar-auth-card">
            <div className="intizar-auth-heading">
  <img
    className="intizar-auth-logo"
    src={LOGO_SRC}
    alt="INTIZAR Academy logo"
  />
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
                <span>{loading ? "Signing inâ€¦" : "Sign In"}</span>
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
            <span>INTIZAR ACADEMY <b>Â·</b> LEARNING <b>Â·</b> CHARACTER <b>Â·</b> EXCELLENCE</span>
            <span className="intizar-footer-line" />
          </div>
        </div>
      </section>
    </main>
  );
}
