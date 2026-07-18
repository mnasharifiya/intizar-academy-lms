import React, { useState } from "react";
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
