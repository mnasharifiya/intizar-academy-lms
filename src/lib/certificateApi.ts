import { supabase } from "./supabase";

export type CertificateRecord = {
  id: string;
  studentId: string;
  programId: string | null;
  groupId: string | null;
  certificateNo: string;
  verificationToken: string;
  regNo: string | null;
  studentName: string;
  programName: string;
  branch: string | null;
  zone: string | null;
  status: string;
  issuedBy: string | null;
  issuedAt: string;
  revokedBy: string | null;
  revokedAt: string | null;
  revokeReason: string | null;
  eligibilitySnapshot: any;
  createdAt: string;
};

function mapCertificate(row: any): CertificateRecord {
  return {
    id: row.id,
    studentId: row.student_id,
    programId: row.program_id ?? null,
    groupId: row.group_id ?? null,
    certificateNo: row.certificate_no,
    verificationToken: row.verification_token,
    regNo: row.reg_no ?? null,
    studentName: row.student_name,
    programName: row.program_name,
    branch: row.branch ?? null,
    zone: row.zone ?? null,
    status: row.status,
    issuedBy: row.issued_by ?? null,
    issuedAt: row.issued_at,
    revokedBy: row.revoked_by ?? null,
    revokedAt: row.revoked_at ?? null,
    revokeReason: row.revoke_reason ?? null,
    eligibilitySnapshot: row.eligibility_snapshot ?? {},
    createdAt: row.created_at,
  };
}

function safeCode(value: string) {
  return String(value || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 24);
}

function randomToken() {
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  const time = Date.now().toString(36).toUpperCase();
  return `VERIFY-${time}-${rand}`;
}

export function makeCertificateNo(input: {
  regNo?: string | null;
  programName?: string;
}) {
  const year = new Date().getFullYear();
  const reg = safeCode(input.regNo || "NO-REG");
  const program = safeCode(input.programName || "PROGRAM").slice(0, 4);

  // Certificate numbers must remain unique even if an old certificate was revoked.
  const timePart = Date.now().toString(36).slice(-5).toUpperCase();
  const randomPart = Math.random().toString(36).slice(2, 5).toUpperCase();

  return `INT-CERT-${year}-${reg}-${program}-${timePart}${randomPart}`;
}

export async function loadCertificates(): Promise<CertificateRecord[]> {
  const { data, error } = await supabase
    .from("certificates")
    .select("*")
    .order("issued_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map(mapCertificate);
}

export async function createCertificate(input: {
  studentId: string;
  programId: string | null;
  groupId: string | null;
  certificateNo: string;
  regNo: string | null;
  studentName: string;
  programName: string;
  branch: string | null;
  zone: string | null;
  issuedBy: string;
  eligibilitySnapshot: any;
}): Promise<CertificateRecord> {
  const { data, error } = await supabase
    .from("certificates")
    .insert({
      student_id: input.studentId,
      program_id: input.programId,
      group_id: input.groupId,
      certificate_no: input.certificateNo,
      verification_token: randomToken(),
      reg_no: input.regNo,
      student_name: input.studentName,
      program_name: input.programName,
      branch: input.branch,
      zone: input.zone,
      issued_by: input.issuedBy,
      eligibility_snapshot: input.eligibilitySnapshot,
      status: "valid",
    })
    .select()
    .single();

  if (error) throw error;

  return mapCertificate(data as any);
}

export async function revokeCertificate(input: {
  certificateId: string;
  revokedBy: string;
  reason: string;
}): Promise<void> {
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("certificates")
    .update({
      status: "revoked",
      revoked_by: input.revokedBy,
      revoked_at: now,
      revoke_reason: input.reason,
    })
    .eq("id", input.certificateId);

  if (error) throw error;
}

export async function verifyCertificate(input: {
  certificateNo: string;
  verificationToken: string;
}): Promise<CertificateRecord | null> {
  const { data, error } = await supabase
    .from("certificates")
    .select("*")
    .eq("certificate_no", input.certificateNo.trim())
    .eq("verification_token", input.verificationToken.trim())
    .eq("status", "valid")
    .maybeSingle();

  if (error) throw error;

  return data ? mapCertificate(data as any) : null;
}
