import { useEffect, useState, type CSSProperties } from "react";
import { Button, Card, Input } from "../../components/common/ui";
import { APP_NAME, C } from "../../lib/theme";
import { verifyCertificate, type CertificateRecord } from "../../lib/certificateApi";

export default function CertificateVerify({
  onBackToLogin,
}: {
  onBackToLogin: () => void;
}) {
  const [certificateNo, setCertificateNo] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [result, setResult] = useState<CertificateRecord | null>(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);

  // Auto verify certificate from QR code link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const no = params.get("certificateNo") || "";
    const token = params.get("token") || params.get("verificationToken") || "";

    if (!no || !token) return;

    setCertificateNo(no.toUpperCase());
    setVerificationToken(token.toUpperCase());
    setBusy(true);
    setChecked(false);
    setResult(null);

    verifyCertificate({
      certificateNo: no,
      verificationToken: token,
    })
      .then(cert => {
        setResult(cert);
        setChecked(true);
      })
      .catch(err => {
        console.error(err);
        alert(err?.message || "Could not verify certificate.");
      })
      .finally(() => setBusy(false));
  }, []);

  async function verify(e: React.FormEvent) {
    e.preventDefault();

    if (!certificateNo.trim() || !verificationToken.trim()) {
      alert("Certificate No and Verification Token are required.");
      return;
    }

    try {
      setBusy(true);
      setChecked(false);
      setResult(null);

      const cert = await verifyCertificate({
        certificateNo,
        verificationToken,
      });

      setResult(cert);
      setChecked(true);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Could not verify certificate.");
    } finally {
      setBusy(false);
    }
  }

  function printResult() {
    window.print();
  }

  return (
    <div style={page}>
      <div style={hero}>
        <img src="/intizar-logo.jpg" alt="INTIZAR" style={logo} />
        <h1 style={title}>Certificate Verification</h1>
        <p style={sub}>
          Verify official certificates issued by {APP_NAME}. Enter the Certificate No and Verification Token printed on the certificate.
        </p>

        <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:18}}>
          <Button variant="secondary" onClick={onBackToLogin}>
            Back to Login
          </Button>
        </div>
      </div>

      <div style={content}>
        <Card>
          <h2 style={sectionTitle}>Verify Certificate</h2>
          <p style={sectionSub}>
            This page confirms whether a certificate exists and is currently valid.
          </p>

          <form onSubmit={verify} style={formGrid}>
            <Input
              value={certificateNo}
              onChange={v => setCertificateNo(v.toUpperCase())}
              placeholder="Certificate No e.g. INT-CERT-2026-KA001AR-ARIF"
            />

            <Input
              value={verificationToken}
              onChange={v => setVerificationToken(v.toUpperCase())}
              placeholder="Verification Token e.g. VERIFY-XXXX-XXXX"
            />

            <Button type="submit" disabled={busy}>
              {busy ? "Verifying..." : "Verify Certificate"}
            </Button>
          </form>
        </Card>

        {checked && result && (
          <Card>
            <div style={validBox}>
              <h2 style={{margin:"0 0 6px",color:"#166534"}}>Certificate Valid</h2>
              <p style={{margin:0,color:"#166534"}}>
                This certificate was issued by INTIZAR Academy and is currently valid.
              </p>
            </div>

            <div style={certHeader}>
              <img src="/intizar-logo.jpg" alt="INTIZAR" style={certLogo} />
              <div>
                <h2 style={{margin:"0 0 4px",color:C.text}}>{result.studentName}</h2>
                <div style={meta}>Program: {result.programName}</div>
                <div style={meta}>Reg No: {result.regNo || "-"}</div>
              </div>
            </div>

            <div style={grid}>
              <Info label="Certificate No" value={result.certificateNo} />
              <Info label="Verification Token" value={result.verificationToken} />
              <Info label="Issued Date" value={new Date(result.issuedAt).toLocaleDateString()} />
              <Info label="Status" value={result.status.toUpperCase()} />
              <Info label="Branch" value={result.branch || "-"} />
              <Info label="Zone" value={result.zone || "-"} />
            </div>

            <div style={{marginTop:16}}>
              <Button onClick={printResult}>Print Verification Result</Button>
            </div>
          </Card>
        )}

        {checked && !result && (
          <Card>
            <div style={invalidBox}>
              <h2 style={{margin:"0 0 6px",color:"#991b1b"}}>Certificate Not Valid</h2>
              <p style={{margin:0,color:"#991b1b",lineHeight:1.7}}>
                No valid certificate was found with the provided Certificate No and Verification Token.
                Please check the details carefully. The certificate may be fake, revoked, or typed incorrectly.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoCard}>
      <div style={{fontSize:12,color:C.muted,fontWeight:900}}>{label}</div>
      <div style={{fontSize:15,color:C.text,fontWeight:900,marginTop:5,wordBreak:"break-word"}}>{value}</div>
    </div>
  );
}

const page: CSSProperties = {
  minHeight:"100vh",
  background:"#f8fafc",
};

const hero: CSSProperties = {
  background:"linear-gradient(135deg,#052e16,#166534)",
  color:"#fff",
  padding:32,
};

const logo: CSSProperties = {
  width:72,
  height:72,
  borderRadius:18,
  background:"#fff",
  padding:6,
  objectFit:"contain",
};

const title: CSSProperties = {
  margin:"18px 0 8px",
  fontSize:34,
  fontWeight:900,
};

const sub: CSSProperties = {
  margin:0,
  maxWidth:780,
  color:"rgba(255,255,255,.8)",
  lineHeight:1.7,
};

const content: CSSProperties = {
  maxWidth:900,
  margin:"-18px auto 40px",
  padding:"0 20px",
};

const sectionTitle: CSSProperties = {
  margin:0,
  fontSize:22,
  color:C.text,
  fontWeight:900,
};

const sectionSub: CSSProperties = {
  margin:"6px 0 18px",
  color:C.muted,
  fontSize:14,
};

const formGrid: CSSProperties = {
  display:"grid",
  gap:12,
};

const validBox: CSSProperties = {
  border:"1px solid #bbf7d0",
  background:"#f0fdf4",
  borderRadius:16,
  padding:16,
  marginBottom:18,
};

const invalidBox: CSSProperties = {
  border:"1px solid #fecaca",
  background:"#fef2f2",
  borderRadius:16,
  padding:16,
};

const certHeader: CSSProperties = {
  display:"flex",
  alignItems:"center",
  gap:14,
  marginBottom:16,
  flexWrap:"wrap",
};

const certLogo: CSSProperties = {
  width:70,
  height:70,
  borderRadius:16,
  objectFit:"contain",
  border:"1px solid "+C.border,
  background:"#fff",
  padding:6,
};

const meta: CSSProperties = {
  fontSize:13,
  color:C.muted,
  marginTop:4,
};

const grid: CSSProperties = {
  display:"grid",
  gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",
  gap:12,
};

const infoCard: CSSProperties = {
  border:"1px solid "+C.border,
  borderRadius:14,
  padding:14,
  background:"#f8fafc",
};

