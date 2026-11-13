import React, { useState, useEffect } from "react";
import { Button, Input } from "../../components/common/ui";
import { APP_NAME } from "../../lib/theme";
import { signIn } from "../../lib/api";

const CAROUSEL_PHOTOS = [
  "/IMG-20261113-WA0002.jpg",
  "/IMG-20261113-WA0003.jpg",
  "/IMG-20261113-WA0004.jpg",
  "/IMG-20261113-WA0005.jpg",
  "/IMG-20261113-WA0006.jpg",
  "/IMG-20261113-WA0007.jpg",
  "/IMG-20261113-WA0008.jpg",
  "/IMG-20261113-WA0009.jpg",
  "/FB_IMG_1794583138954.jpg",
  "/FB_IMG_1794583344967.jpg",
  "/FB_IMG_1794583377573.jpg",
  "/FB_IMG_1794583460982.jpg",
];

export default function LoginPage({ onLogin, onApply, onVerify, onForgotPassword }: { onLogin: (user: any) => void; onApply?: () => void; onVerify?: () => void; onForgotPassword?: () => void }) {
  const [email, setEmail] = useState("admin@intizar.edu");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrentPhotoIndex((prev) => (prev + 1) % CAROUSEL_PHOTOS.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [isPaused]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await signIn(email, password);
      onLogin(user);
    } catch (err: any) {
      setError(err?.message || "Login failed. Please check your email and password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "grid",
      gridTemplateColumns: "1.15fr 0.85fr",
      background: "#022c22",
      fontFamily: "system-ui, -apple-system, sans-serif",
      overflow: "hidden",
    }}>
      {/* Left Brand & Photo Carousel Section */}
      <div 
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "48px 56px",
          color: "#fff",
          position: "relative",
          overflow: "hidden",
          backgroundColor: "#064e3b",
        }}
      >
        {/* Background Photos with Forest Green Gradient Overlay */}
        {CAROUSEL_PHOTOS.map((photo, index) => (
          <div
            key={photo}
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `linear-gradient(135deg, rgba(2, 44, 34, 0.92) 0%, rgba(6, 78, 59, 0.85) 100%), url(${photo})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: index === currentPhotoIndex ? 1 : 0,
              transition: "opacity 1s ease-in-out",
              zIndex: 1,
            }}
          />
        ))}

        {/* Top Header / Logo */}
        <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", gap: 16 }}>
          <img
            src="/intizar-logo.jpg"
            alt="INTIZAR Academy Logo"
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              objectFit: "contain",
              background: "#fff",
              padding: 4,
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            }}
          />
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, letterSpacing: "-0.5px" }}>{APP_NAME}</h2>
            <p style={{ margin: 0, fontSize: 12, color: "#a7f3d0", maxWidth: 380, lineHeight: 1.4 }}>
              A structured, role-based Learning Management System for students, instructors, and administrators.
            </p>
          </div>
        </div>

        {/* Center Main Headline & Highlights */}
        <div style={{ position: "relative", zIndex: 2, margin: "32px 0" }}>
          <h1 style={{ fontSize: 46, lineHeight: 1.1, margin: "0 0 16px", fontWeight: 900, letterSpacing: "-1.5px" }}>
            Building Knowledge.<br />
            <span style={{ color: "#34d399" }}>Shaping Tomorrow.</span>
          </h1>

          <p style={{ fontSize: 16, lineHeight: 1.7, color: "#d1fae5", maxWidth: 440, margin: "0 0 28px" }}>
            A learning community where students develop knowledge, skills, discipline and character.
          </p>

          {/* Three Feature Highlights */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 13, fontWeight: 600, color: "#a7f3d0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span>📚</span> Structured Learning
            </div>
            <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.2)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span>📈</span> Track Your Progress
            </div>
            <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.2)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span>🛡️</span> Verified Certificates
            </div>
          </div>
        </div>

        {/* Bottom Footer & Carousel Dots */}
        <div style={{ position: "relative", zIndex: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 6 }}>
            {CAROUSEL_PHOTOS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentPhotoIndex(idx)}
                style={{
                  width: idx === currentPhotoIndex ? 22 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: idx === currentPhotoIndex ? "#34d399" : "rgba(255,255,255,0.3)",
                  border: 0,
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  padding: 0,
                }}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setCurrentPhotoIndex((prev) => (prev + 1) % CAROUSEL_PHOTOS.length)}
            style={{
              background: "transparent",
              border: 0,
              color: "#34d399",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Discover INTIZAR →
          </button>
        </div>
      </div>

      {/* Right Authentication Card Section */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fafc",
        padding: 40,
        position: "relative",
      }}>
        {/* Faint Watermark Crest */}
        <div style={{
          position: "absolute",
          top: 20,
          right: 20,
          width: 120,
          height: 120,
          backgroundImage: "url('/intizar-logo.jpg')",
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          opacity: 0.03,
          pointerEvents: "none",
        }} />

        <form onSubmit={submit} style={{
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          padding: 36,
          borderRadius: 24,
          boxShadow: "0 20px 45px -10px rgba(0, 0, 0, 0.08)",
          border: "1px solid #e2e8f0",
          position: "relative",
          zIndex: 2,
        }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 900, color: "#0f172a" }}>Welcome back</h2>
            <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>Sign in to continue your learning journey.</p>
          </div>

          {error && (
            <div style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              padding: "12px 14px",
              borderRadius: 10,
              marginBottom: 16,
              fontSize: 13,
              fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>Email address</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 14 }}>✉️</span>
              <div style={{ paddingLeft: 28 }}>
                <Input value={email} onChange={setEmail} placeholder="Enter your email" type="email" />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>Password</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 14 }}>🔒</span>
              <div style={{ paddingLeft: 28, paddingRight: 48 }}>
                <Input value={password} onChange={setPassword} placeholder="Enter your password" type={showPassword ? "text" : "password"} />
              </div>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: 0,
                  background: "transparent",
                  color: "#059669",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, fontSize: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#475569", cursor: "pointer", fontWeight: 500 }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: "#059669", width: 14, height: 14 }}
              />
              Remember me
            </label>
            {onForgotPassword && (
              <button
                type="button"
                onClick={onForgotPassword}
                style={{
                  border: 0,
                  background: "transparent",
                  color: "#059669",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Forgot password?
              </button>
            )}
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <Button type="submit" disabled={loading}>
              {loading ? "Signing in..." : "🚪 Sign In"}
            </Button>

            <Button type="button" variant="secondary" onClick={onApply}>
              🎓 Apply for Admission
            </Button>

            <Button type="button" variant="secondary" onClick={onVerify}>
              🛡️ Verify Certificate
            </Button>
          </div>

          <div style={{
            marginTop: 28,
            textAlign: "center",
            fontSize: 10,
            color: "#94a3b8",
            letterSpacing: "0.8px",
            fontWeight: 700,
          }}>
            INTIZAR ACADEMY • LEARNING • CHARACTER • EXCELLENCE
          </div>
        </form>
      </div>
    </div>
  );
}