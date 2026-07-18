const fs = require("fs");
const path = require("path");

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function replaceOrThrow(text, search, replacement, label) {
  if (!text.includes(search)) {
    throw new Error("Could not find: " + label);
  }
  return text.replace(search, replacement);
}

/* 1) Add API functions */
const apiPath = "src/lib/api.ts";
let api = fs.readFileSync(apiPath, "utf8");

if (!api.includes("requestPasswordReset")) {
  api += `

export async function requestPasswordReset(email: string) {
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanEmail) {
    throw new Error("Please enter your email address.");
  }

  const redirectTo = \`\${window.location.origin}/?resetPassword=1\`;

  const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo,
  });

  if (error) throw error;
  return true;
}

export async function changeCurrentUserPassword(newPassword: string) {
  const password = newPassword.trim();

  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  const { data, error } = await supabase.auth.updateUser({
    password,
  });

  if (error) throw error;
  return data;
}
`;
  fs.writeFileSync(apiPath, api, "utf8");
}

/* 2) Create Forgot Password page */
writeFile("src/pages/auth/ForgotPasswordPage.tsx", `import React, { useState } from "react";
import { Button, Input } from "../../components/common/ui";
import { C, APP_NAME } from "../../lib/theme";
import { requestPasswordReset } from "../../lib/api";

export default function ForgotPasswordPage({ onBackToLogin }: { onBackToLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStatus("");
    setLoading(true);

    try {
      await requestPasswordReset(email);
      setStatus("If this email exists in the system, a password reset link has been sent. Please check your inbox.");
    } catch (err: any) {
      setError(err?.message || "Could not send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg,#052e16,#064e3b)",
      padding: 24,
    }}>
      <form onSubmit={submit} style={{
        width: "100%",
        maxWidth: 430,
        background: "#fff",
        padding: 32,
        borderRadius: 22,
        boxShadow: "0 20px 60px rgba(0,0,0,.18)",
      }}>
        <div style={{textAlign:"center",marginBottom:22}}>
          <img
            src="/intizar-logo.jpg"
            alt="INTIZAR Academy Logo"
            style={{
              width:76,
              height:76,
              borderRadius:"50%",
              objectFit:"contain",
              background:"#fff",
              padding:6,
              marginBottom:12,
              boxShadow:"0 10px 25px rgba(0,0,0,.12)",
            }}
          />
          <h2 style={{margin:"0 0 6px",fontSize:26,color:C.text}}>Forgot Password</h2>
          <p style={{margin:0,color:C.muted,fontSize:14}}>
            Enter your registered email for {APP_NAME}.
          </p>
        </div>

        {error && (
          <div style={{background:"#fee2e2",color:"#991b1b",padding:12,borderRadius:10,marginBottom:14}}>
            {error}
          </div>
        )}

        {status && (
          <div style={{background:"#dcfce7",color:"#166534",padding:12,borderRadius:10,marginBottom:14,lineHeight:1.5}}>
            {status}
          </div>
        )}

        <div style={{marginBottom:16}}>
          <label style={{fontSize:13,fontWeight:700,color:C.text}}>Email</label>
          <div style={{marginTop:6}}>
            <Input value={email} onChange={setEmail} placeholder="student@example.com" type="email" />
          </div>
        </div>

        <div style={{display:"grid",gap:10}}>
          <Button type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>

          <Button type="button" variant="secondary" onClick={onBackToLogin}>
            Back to Login
          </Button>
        </div>
      </form>
    </div>
  );
}
`);

/* 3) Create Reset Password page */
writeFile("src/pages/auth/ResetPasswordPage.tsx", `import React, { useState } from "react";
import { Button, Input } from "../../components/common/ui";
import { C } from "../../lib/theme";
import { changeCurrentUserPassword } from "../../lib/api";

export default function ResetPasswordPage({ onBackToLogin }: { onBackToLogin: () => void }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStatus("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await changeCurrentUserPassword(password);
      setStatus("Your password has been changed successfully. You can now login with the new password.");
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err?.message || "Could not change password. Please open the reset link again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg,#052e16,#064e3b)",
      padding: 24,
    }}>
      <form onSubmit={submit} style={{
        width: "100%",
        maxWidth: 430,
        background: "#fff",
        padding: 32,
        borderRadius: 22,
        boxShadow: "0 20px 60px rgba(0,0,0,.18)",
      }}>
        <div style={{textAlign:"center",marginBottom:22}}>
          <img
            src="/intizar-logo.jpg"
            alt="INTIZAR Academy Logo"
            style={{
              width:76,
              height:76,
              borderRadius:"50%",
              objectFit:"contain",
              background:"#fff",
              padding:6,
              marginBottom:12,
              boxShadow:"0 10px 25px rgba(0,0,0,.12)",
            }}
          />
          <h2 style={{margin:"0 0 6px",fontSize:26,color:C.text}}>Set New Password</h2>
          <p style={{margin:0,color:C.muted,fontSize:14}}>
            Enter your new password below.
          </p>
        </div>

        {error && (
          <div style={{background:"#fee2e2",color:"#991b1b",padding:12,borderRadius:10,marginBottom:14}}>
            {error}
          </div>
        )}

        {status && (
          <div style={{background:"#dcfce7",color:"#166534",padding:12,borderRadius:10,marginBottom:14,lineHeight:1.5}}>
            {status}
          </div>
        )}

        <div style={{marginBottom:14}}>
          <label style={{fontSize:13,fontWeight:700,color:C.text}}>New Password</label>
          <div style={{marginTop:6}}>
            <Input value={password} onChange={setPassword} placeholder="New password" type="password" />
          </div>
        </div>

        <div style={{marginBottom:18}}>
          <label style={{fontSize:13,fontWeight:700,color:C.text}}>Confirm New Password</label>
          <div style={{marginTop:6}}>
            <Input value={confirmPassword} onChange={setConfirmPassword} placeholder="Confirm password" type="password" />
          </div>
        </div>

        <div style={{display:"grid",gap:10}}>
          <Button type="submit" disabled={loading}>
            {loading ? "Changing..." : "Change Password"}
          </Button>

          <Button type="button" variant="secondary" onClick={onBackToLogin}>
            Back to Login
          </Button>
        </div>
      </form>
    </div>
  );
}
`);

/* 4) Create logged-in Change Password page */
writeFile("src/pages/common/ChangePasswordPage.tsx", `import React, { useState } from "react";
import { Button, Input } from "../../components/common/ui";
import { C } from "../../lib/theme";
import { changeCurrentUserPassword } from "../../lib/api";

export default function ChangePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStatus("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await changeCurrentUserPassword(password);
      setStatus("Password changed successfully.");
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err?.message || "Could not change password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{maxWidth:560}}>
      <h1 style={{margin:"0 0 8px",color:C.text}}>Change Password</h1>
      <p style={{margin:"0 0 22px",color:C.muted}}>
        Update your account password. Use a password you can remember but others cannot guess.
      </p>

      <form onSubmit={submit} style={{
        background:"#fff",
        border:"1px solid " + C.border,
        borderRadius:18,
        padding:24,
        boxShadow:"0 12px 35px rgba(15,23,42,.08)",
      }}>
        {error && (
          <div style={{background:"#fee2e2",color:"#991b1b",padding:12,borderRadius:10,marginBottom:14}}>
            {error}
          </div>
        )}

        {status && (
          <div style={{background:"#dcfce7",color:"#166534",padding:12,borderRadius:10,marginBottom:14}}>
            {status}
          </div>
        )}

        <div style={{marginBottom:14}}>
          <label style={{fontSize:13,fontWeight:700,color:C.text}}>New Password</label>
          <div style={{marginTop:6}}>
            <Input value={password} onChange={setPassword} placeholder="New password" type="password" />
          </div>
        </div>

        <div style={{marginBottom:18}}>
          <label style={{fontSize:13,fontWeight:700,color:C.text}}>Confirm New Password</label>
          <div style={{marginTop:6}}>
            <Input value={confirmPassword} onChange={setConfirmPassword} placeholder="Confirm password" type="password" />
          </div>
        </div>

        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save New Password"}
        </Button>
      </form>
    </div>
  );
}
`);

/* 5) Patch LoginPage */
const loginPath = "src/pages/auth/LoginPage.tsx";
let login = fs.readFileSync(loginPath, "utf8");

if (!login.includes("onForgotPassword")) {
  login = login.replace(
    `export default function LoginPage({ onLogin, onApply, onVerify }: { onLogin: (user: any) => void; onApply?: () => void; onVerify?: () => void }) {`,
    `export default function LoginPage({ onLogin, onApply, onVerify, onForgotPassword }: { onLogin: (user: any) => void; onApply?: () => void; onVerify?: () => void; onForgotPassword?: () => void }) {`
  );

  login = login.replace(
    `          <div style={{marginBottom:20}}>
            <label style={{fontSize:13,fontWeight:700,color:C.text}}>Password</label>
            <div style={{marginTop:6}}>
              <Input value={password} onChange={setPassword} placeholder="Enter password" type="password" />
            </div>
          </div>

          <div style={{display:"grid",gap:10}}>`,
    `          <div style={{marginBottom:10}}>
            <label style={{fontSize:13,fontWeight:700,color:C.text}}>Password</label>
            <div style={{marginTop:6}}>
              <Input value={password} onChange={setPassword} placeholder="Enter password" type="password" />
            </div>
          </div>

          {onForgotPassword && (
            <button
              type="button"
              onClick={onForgotPassword}
              style={{
                border:0,
                background:"transparent",
                color:"#166534",
                fontWeight:800,
                cursor:"pointer",
                padding:0,
                margin:"0 0 18px",
                textAlign:"left",
              }}
            >
              Forgot password?
            </button>
          )}

          <div style={{display:"grid",gap:10}}>`
  );

  fs.writeFileSync(loginPath, login, "utf8");
}

/* 6) Patch App.tsx */
const appPath = "src/App.tsx";
let app = fs.readFileSync(appPath, "utf8");

if (!app.includes("ForgotPasswordPage")) {
  app = app.replace(
    `import LoginPage from "./pages/auth/LoginPage";`,
    `import LoginPage from "./pages/auth/LoginPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import ChangePasswordPage from "./pages/common/ChangePasswordPage";`
  );
}

app = app.replace(
  `const [publicPage, setPublicPage] = useState<"login" | "apply" | "verify">(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("verifyCertificate") === "1" ? "verify" : "login";
  });`,
  `const [publicPage, setPublicPage] = useState<"login" | "apply" | "verify" | "forgot" | "reset">(() => {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

    if (
      window.location.pathname === "/reset-password" ||
      params.get("resetPassword") === "1" ||
      params.get("type") === "recovery" ||
      hashParams.get("type") === "recovery" ||
      hashParams.has("access_token")
    ) {
      return "reset";
    }

    return params.get("verifyCertificate") === "1" ? "verify" : "login";
  });`
);

if (!app.includes('publicPage === "forgot"')) {
  app = app.replace(
    `  if (!currentUser) {
    if (publicPage === "apply") {`,
    `  if (!currentUser) {
    if (publicPage === "reset") {
      return <ResetPasswordPage onBackToLogin={() => setPublicPage("login")} />;
    }

    if (publicPage === "forgot") {
      return <ForgotPasswordPage onBackToLogin={() => setPublicPage("login")} />;
    }

    if (publicPage === "apply") {`
  );
}

if (!app.includes("onForgotPassword")) {
  app = app.replace(
    `        onVerify={() => setPublicPage("verify")}
      />`,
    `        onVerify={() => setPublicPage("verify")}
        onForgotPassword={() => setPublicPage("forgot")}
      />`
  );
}

if (!app.includes('page === "change-password"')) {
  app = app.replace(
    `  function renderPage() {`,
    `  function renderPage() {
    if (page === "change-password") return <ChangePasswordPage />;`
  );
}

if (!app.includes("onChangePassword")) {
  app = app.replace(
    `      setPage={setPage}
      onLogout={() => setCurrentUser(null)}`,
    `      setPage={setPage}
      onChangePassword={() => setPage("change-password")}
      onLogout={() => setCurrentUser(null)}`
  );
}

fs.writeFileSync(appPath, app, "utf8");

/* 7) Patch AppLayout */
const layoutPath = "src/components/layout/AppLayout.tsx";
let layout = fs.readFileSync(layoutPath, "utf8");

if (!layout.includes("onChangePassword")) {
  layout = layout.replace(`  onLogout,`, `  onLogout,
  onChangePassword,`);

  layout = layout.replace(
    `  onLogout: () => void;`,
    `  onLogout: () => void;
  onChangePassword?: () => void;`
  );

  layout = layout.replace(
    `            <button
              onClick={onLogout}`,
    `            {onChangePassword && (
              <button
                onClick={onChangePassword}
                style={{
                  border:"1px solid #bbf7d0",
                  background:"#f0fdf4",
                  color:"#166534",
                  borderRadius:12,
                  padding:"10px 12px",
                  fontWeight:900,
                  cursor:"pointer",
                }}
              >
                Change Password
              </button>
            )}

            <button
              onClick={onLogout}`
  );

  fs.writeFileSync(layoutPath, layout, "utf8");
}

console.log("Password reset and change password patch completed.");
