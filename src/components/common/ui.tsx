import React from "react";
import { C } from "../../lib/theme";

export function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const bg =
    variant === "primary" ? C.primary :
    variant === "danger" ? C.danger :
    C.surface;

  const color = variant === "secondary" ? C.text : C.white;

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{
        background: bg,
        color,
        border: "1px solid " + (variant === "secondary" ? C.border : bg),
        padding: "10px 16px",
        borderRadius: 10,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: C.white,
      border: "1px solid " + C.border,
      borderRadius: 16,
      padding: 20,
      boxShadow: "0 1px 3px rgba(0,0,0,.05)",
    }}>
      {children}
    </div>
  );
}

export function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      value={value}
      type={type}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "12px 14px",
        border: "1px solid " + C.border,
        borderRadius: 10,
        outline: "none",
      }}
    />
  );
}

export function PageHeader({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
      <div>
        <h1 style={{fontSize:26,fontWeight:800,color:C.text,margin:0}}>{title}</h1>
        {sub && <p style={{fontSize:14,color:C.muted,marginTop:6}}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}
