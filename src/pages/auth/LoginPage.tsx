import React, { useState } from "react";
import { Button, Input } from "../../components/common/ui";
import { C, APP_NAME } from "../../lib/theme";
import { signIn } from "../../lib/api";

export default function LoginPage({ onLogin, onApply }: { onLogin: (user: any) => void; onApply?: () => void }) {
  const [email, setEmail] = useState("admin@intizar.edu");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      background: "linear-gradient(135deg,#052e16,#064e3b)",
    }}>
      <div style={{
        display:"flex",
        alignItems:"center",
        justifyContent:"center",
        padding:40,
        color:"#fff",
      }}>
        <div style={{maxWidth:520}}>
          <img
            src="/intizar-logo.jpg"
            alt="INTIZAR Academy Logo"
            style={{
              width:96,
              height:96,
              borderRadius:"50%",
              objectFit:"contain",
              background:"#fff",
              padding:8,
              marginBottom:24,
              boxShadow:"0 16px 35px rgba(0,0,0,.18)",
            }}
          />

          <h1 style={{fontSize:48,lineHeight:1.05,margin:"0 0 16px",fontWeight:900}}>
            {APP_NAME}
          </h1>

          <p style={{fontSize:18,lineHeight:1.8,color:C.pale}}>
            A structured, role-based Learning Management System for students,
            instructors, and administrators.
          </p>

          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginTop:34}}>
            {[
              ["15", "students/group"],
              ["3", "groups/instructor"],
              ["2x", "sessions/week"],
            ].map(([n, l]) => (
              <div key={l} style={{background:"rgba(255,255,255,.08)",padding:16,borderRadius:14,textAlign:"center"}}>
                <div style={{fontSize:28,fontWeight:900,color:C.light}}>{n}</div>
                <div style={{fontSize:12,color:C.pale}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{
        display:"flex",
        alignItems:"center",
        justifyContent:"center",
        background:"#f8fafc",
        padding:36,
      }}>
        <form onSubmit={submit} style={{
          width:"100%",
          maxWidth:420,
          background:"#fff",
          padding:32,
          borderRadius:22,
          boxShadow:"0 20px 60px rgba(0,0,0,.14)",
        }}>
          <h2 style={{margin:"0 0 8px",fontSize:28,color:C.text}}>Welcome back</h2>
          <p style={{margin:"0 0 24px",color:C.muted}}>Sign in to continue to INTIZAR Academy.</p>

          {error && (
            <div style={{background:"#fee2e2",color:"#991b1b",padding:12,borderRadius:10,marginBottom:14}}>
              {error}
            </div>
          )}

          <div style={{marginBottom:14}}>
            <label style={{fontSize:13,fontWeight:700,color:C.text}}>Email</label>
            <div style={{marginTop:6}}>
              <Input value={email} onChange={setEmail} placeholder="admin@intizar.edu" type="email" />
            </div>
          </div>

          <div style={{marginBottom:20}}>
            <label style={{fontSize:13,fontWeight:700,color:C.text}}>Password</label>
            <div style={{marginTop:6}}>
              <Input value={password} onChange={setPassword} placeholder="Enter password" type="password" />
            </div>
          </div>

          <div style={{display:"grid",gap:10}}>
            <Button type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>

            <Button type="button" variant="secondary" onClick={onApply}>
              Apply for Admission
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

