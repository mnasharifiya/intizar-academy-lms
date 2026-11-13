import React, { useState, useEffect } from "react";
import { Button, Input } from "../../components/common/ui";
import { APP_NAME } from "../../lib/theme";
import { signIn } from "../../lib/api";

const CAROUSEL_PHOTOS = [
  "/src/assets/IMG-20261113-WA0002.jpg",
  "/src/assets/IMG-20261113-WA0003.jpg",
  "/src/assets/IMG-20261113-WA0004.jpg",
  "/src/assets/IMG-20261113-WA0005.jpg",
  "/src/assets/IMG-20261113-WA0006.jpg",
  "/src/assets/IMG-20261113-WA0007.jpg",
  "/src/assets/IMG-20261113-WA0008.jpg",
  "/src/assets/IMG-20261113-WA0009.jpg",
  "/src/assets/FB_IMG_1794583138954.jpg",
  "/src/assets/FB_IMG_1794583344967.jpg",
  "/src/assets/FB_IMG_1794583377573.jpg",
  "/src/assets/FB_IMG_1794583460982.jpg",
];

export default function LoginPage({ onLogin, onApply, onVerify, onForgotPassword }: { onLogin: (user: any) => void; onApply?: () => void; onVerify?: () => void; onForgotPassword?: () => void }) {
  const [email, setEmail] = useState("admin@intizar.edu");
  const [password, setPassword] = useState("");
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
      gridTemplateColumns: "1.1fr .9fr",
      background: "#022c22",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      {/* Left Brand & Carousel Section (12 Photos) */}
      <div 
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 56,
          color: "#fff",
          position: "relative",
          overflow: "hidden",
          backgroundColor: "#064e3b",
        }}
      >
        {CAROUSEL_PHOTOS.map((photo, index) => (
          <div
            key={photo}
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `linear-gradient(135deg, rgba(2, 44, 34, 0.92) 0%, rgba(6, 78, 59, 0.88) 100%), url(${photo})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: index === currentPhotoIndex ? 1 : 0,
              transition: "opacity 1s ease-in-out",
              zIndex: 1,
            }}
          />
        ))}

        <div style={{ position: "relative", zIndex: 2 }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            background: "rgba(255,255,255,0.1)",
            padding: "8px 16px",
            borderRadius: 30,
            marginBottom: 32,
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.15)",
          }}>
            <img
              src="/intizar-logo.jpg"
              alt="INTIZAR Academy Logo"
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                objectFit: "contain",
                background: "#fff",
                padding: 2,
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.5px" }}>{APP_NAME} PORTAL</span>
          </div>

          <h1 style={{ fontSize: 48, lineHeight: 1.1, margin: "0 0 16px", fontWeight: 900, letterSpacing: "-1px" }}>
            Building Knowledge.<br />
            <span style={{ color: "#34d399" }}>Shaping Tomorrow.</span>
          </h1>

          <p style={{ fontSize: 17, lineHeight: 1.7, color: "#d1fae5", maxWidth: 460, margin: "0 0 24px" }}>
            A structured, role-based Learning Management System for students, instructors, and administrators.
          </p>

          {/* Carousel Indicators for 12 Photos */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 24, maxWidth: 320 }}>
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
        </div>

        <div style={{ position: "relative", zIndex: 2, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {[
            ["15", "students/group"],
            ["3", "groups/instructor"],
            ["2x", "sessions/week"],
          ].map(([n, l]) => (
            <div key={l} style={{
              background: "rgba(255, 255, 255, 0.08)",
              padding: "16px",
              borderRadius: 16,
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#ffffff", marginBottom: 2 }}>{n}</div>
              <div style={{ fontSize: 11, color: "#a7f3d0" }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Authentication Card Section */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fafc",
        padding: 40,
      }}>
        <form onSubmit={submit} style={{
          width: "100%",
          maxWidth: 440,
          background: "#fff",
          padding: 40,
          borderRadius: 24,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.12)",
          border: "1px solid #e2e8f0",
        }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <img
              src="/intizar-logo.jpg"
              alt="Crest"
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                objectFit: "contain",
                background: "#f0fdf4",
                padding: 6,
                border: "2px solid #dcfce7",
                marginBottom: 16,
              }}
            />
            <h2 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800, color: "#0f172a" }}>Welcome back</h2>
            <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>Sign in to continue to INTIZAR Academy.</p>
          </div>

          {error && (
            <div style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              padding: "12px 16px",
              borderRadius: 12,
              marginBottom: 20,
              fontSize: 13,
              fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6 }}>Email Address</label>
            <Input value={email} onChange={setEmail} placeholder="admin@intizar.edu" type="email" />
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>Password</label>
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
            <div style={{ position: "relative" }}>
              <Input value={password} onChange={setPassword} placeholder="Enter your password" type={showPassword ? "text" : "password"} />
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

          <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
            <Button type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>

            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              margin: "6px 0",
              color: "#94a3b8",
              fontSize: 12,
            }}>
              <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
              <span>portal access options</span>
              <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
            </div>

            <Button type="button" variant="secondary" onClick={onApply}>
              Apply for Admission
            </Button>

            <Button type="button" variant="secondary" onClick={onVerify}>
              Verify Certificate
            </Button>
          </div>

          <div style={{
            marginTop: 32,
            textAlign: "center",
            fontSize: 11,
            color: "#94a3b8",
            letterSpacing: "0.5px",
            fontWeight: 600,
          }}>
            INTIZAR ACADEMY • LEARNING • CHARACTER • EXCELLENCE
          </div>
        </form>
      </div>
    </div>
  );
}