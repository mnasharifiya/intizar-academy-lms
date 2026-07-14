import { useEffect, useState, type CSSProperties } from "react";
import { PageHeader, Card, Button } from "../../components/common/ui";
import { C } from "../../lib/theme";
import {
  DEFAULT_SETTINGS,
  loadAppSettings,
  saveAppSettings,
  type AppSettings,
} from "../../lib/settingsApi";

export default function AdminSettings({
  user,
  data,
}: {
  user: any;
  data: any;
}) {
  const adminGroups = data?.adminGroups ?? [];
  const myAdminLinks = adminGroups.filter((ag: any) => ag.adminId === user?.id);
  const isMainController = user?.role === "admin" && myAdminLinks.length === 0;

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setBusy(true);

    try {
      const loaded = await loadAppSettings();
      setSettings(loaded);
    } catch (err: any) {
      alert(err?.message || "Could not load settings.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  }

  async function save() {
    if (!isMainController) {
      alert("Only Main Controller can update system settings.");
      return;
    }

    setBusy(true);

    try {
      await saveAppSettings(settings);
      alert("Settings saved successfully.");
      await refresh();
    } catch (err: any) {
      alert(err?.message || "Could not save settings.");
    } finally {
      setBusy(false);
    }
  }

  if (!isMainController) {
    return (
      <div>
        <PageHeader
          title="System Settings"
          sub="Restricted admins cannot change global academy settings."
        />

        <Card>
          <div style={blockedBox}>
            <h2 style={{margin:0,color:C.text}}>Access restricted</h2>
            <p style={{color:C.muted,lineHeight:1.7}}>
              Only the Main Controller can update bank details, certificate signatures, academy fee settings, and official payment instructions.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="System Settings"
        sub="Manage official academy payment details, certificate assets, and global instructions."
      />

      <div style={grid}>
        <Card>
          <h2 style={sectionTitle}>Academy Information</h2>
          <p style={sectionSub}>These details appear across public forms, certificates, and reports.</p>

          <div style={formGrid}>
            <Field label="Organization Name">
              <TextInput
                value={settings.organizationName}
                onChange={(value) => update("organizationName", value)}
              />
            </Field>

            <Field label="Application Fee ₦">
              <TextInput
                value={settings.applicationFee}
                onChange={(value) => update("applicationFee", value)}
                placeholder="1500"
              />
            </Field>
          </div>
        </Card>

        <Card>
          <h2 style={sectionTitle}>Bank Payment Details</h2>
          <p style={sectionSub}>Applicants and students will use these details for manual bank transfer.</p>

          <div style={formGrid}>
            <Field label="Bank Name">
              <TextInput
                value={settings.bankName}
                onChange={(value) => update("bankName", value)}
                placeholder="Example: Jaiz Bank"
              />
            </Field>

            <Field label="Account Name">
              <TextInput
                value={settings.accountName}
                onChange={(value) => update("accountName", value)}
                placeholder="INTIZAR official account name"
              />
            </Field>

            <Field label="Account Number">
              <TextInput
                value={settings.accountNumber}
                onChange={(value) => update("accountNumber", value)}
                placeholder="0000000000"
              />
            </Field>
          </div>

          <Field label="Payment Instructions">
            <textarea
              style={textarea}
              value={settings.paymentInstructions}
              onChange={(e) => update("paymentInstructions", e.target.value)}
              rows={4}
            />
          </Field>
        </Card>

        <Card>
          <h2 style={sectionTitle}>Remedial Payment Rule</h2>
          <p style={sectionSub}>This note explains failed-course payment calculation.</p>

          <Field label="Remedial Rule Note">
            <textarea
              style={textarea}
              value={settings.remedialRuleNote}
              onChange={(e) => update("remedialRuleNote", e.target.value)}
              rows={4}
            />
          </Field>
        </Card>

        <Card>
          <h2 style={sectionTitle}>Certificate Assets</h2>
          <p style={sectionSub}>
            Use image paths from public folder, for example /certificates/director-signature.png
          </p>

          <div style={formGrid}>
            <Field label="Secretary Signature URL">
              <TextInput
                value={settings.secretarySignatureUrl}
                onChange={(value) => update("secretarySignatureUrl", value)}
              />
              <PreviewImage src={settings.secretarySignatureUrl} />
            </Field>

            <Field label="Director / Coordinator Signature URL">
              <TextInput
                value={settings.directorSignatureUrl}
                onChange={(value) => update("directorSignatureUrl", value)}
              />
              <PreviewImage src={settings.directorSignatureUrl} />
            </Field>

            <Field label="Seal / Stamp URL">
              <TextInput
                value={settings.sealUrl}
                onChange={(value) => update("sealUrl", value)}
              />
              <PreviewImage src={settings.sealUrl} />
            </Field>
          </div>

          <Field label="Certificate Footer Note">
            <textarea
              style={textarea}
              value={settings.certificateFooterNote}
              onChange={(e) => update("certificateFooterNote", e.target.value)}
              rows={3}
            />
          </Field>
        </Card>
      </div>

      <div style={footer}>
        <Button onClick={refresh} disabled={busy}>
          Reload
        </Button>

        <Button onClick={save} disabled={busy}>
          Save Settings
        </Button>
      </div>
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      style={inputStyle}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: any;
}) {
  return (
    <label style={field}>
      <span style={labelStyle}>{label}</span>
      {children}
    </label>
  );
}

function PreviewImage({ src }: { src: string }) {
  if (!src) return null;

  return (
    <div style={previewWrap}>
      <img
        src={src}
        style={previewImage}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
    </div>
  );
}

const grid: CSSProperties = {
  display:"grid",
  gap:18,
};

const formGrid: CSSProperties = {
  display:"grid",
  gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",
  gap:14,
  marginTop:16,
};

const sectionTitle: CSSProperties = {
  margin:0,
  fontSize:21,
  fontWeight:900,
  color:C.text,
};

const sectionSub: CSSProperties = {
  margin:"6px 0 0",
  color:C.muted,
  fontSize:14,
  lineHeight:1.6,
};

const field: CSSProperties = {
  display:"flex",
  flexDirection:"column",
  gap:7,
};

const labelStyle: CSSProperties = {
  fontSize:13,
  fontWeight:900,
  color:C.text,
};

const inputStyle: CSSProperties = {
  width:"100%",
  border:"1px solid #e2e8f0",
  borderRadius:12,
  padding:"12px 14px",
  fontSize:14,
  outline:"none",
  background:"#fff",
  color:C.text,
};

const textarea: CSSProperties = {
  width:"100%",
  border:"1px solid #e2e8f0",
  borderRadius:12,
  padding:"12px 14px",
  fontSize:14,
  outline:"none",
  resize:"vertical",
  fontFamily:"inherit",
  background:"#fff",
  color:C.text,
};

const footer: CSSProperties = {
  marginTop:18,
  display:"flex",
  justifyContent:"flex-end",
  gap:10,
};

const previewWrap: CSSProperties = {
  marginTop:8,
  border:"1px dashed #cbd5e1",
  background:"#f8fafc",
  borderRadius:12,
  padding:10,
  minHeight:70,
  display:"flex",
  alignItems:"center",
  justifyContent:"center",
};

const previewImage: CSSProperties = {
  maxHeight:70,
  maxWidth:"100%",
  objectFit:"contain",
};

const blockedBox: CSSProperties = {
  padding:20,
  background:"#f8fafc",
  border:"1px dashed #cbd5e1",
  borderRadius:16,
};
