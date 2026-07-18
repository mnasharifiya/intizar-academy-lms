import React, { useState } from "react";
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
