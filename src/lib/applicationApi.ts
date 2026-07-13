import { supabase } from "./supabase";

export type ApplicationProgram = {
  id: string;
  name: string;
};

export type ApplicationRecord = {
  id: string;
  applicationNo: string;
  paymentReference: string;
  fullName: string;
  email: string;
  phoneNo: string;
  photo: string;
  zone: string;
  branch: string;
  workInBranch: string;
  programId: string;
  finalProgramId: string | null;
  applicationFee: number;
  paymentStatus: string;
  paymentProof: string | null;
  paymentNote: string | null;
  applicationStatus: string;
  suggestedRegNo: string | null;
  finalRegNo: string | null;
  paymentVerifiedAt: string | null;
  mainAdminApprovedAt: string | null;
  createdStudentId: string | null;
  createdAt: string;
};

export type ApplicationPayment = {
  id: string;
  applicationId: string;
  paymentReference: string;
  amount: number;
  status: string;
  payerName: string | null;
  bankName: string | null;
  transactionReference: string | null;
  paymentProof: string | null;
  adminNote: string | null;
  verifiedAt: string | null;
  createdAt: string;
};

function mapApplication(row: any): ApplicationRecord {
  return {
    id: row.id,
    applicationNo: row.application_no,
    paymentReference: row.payment_reference,
    fullName: row.full_name,
    email: row.email,
    phoneNo: row.phone_no,
    photo: row.photo,
    zone: row.zone,
    branch: row.branch,
    workInBranch: row.work_in_branch,
    programId: row.program_id,
    finalProgramId: row.final_program_id ?? row.program_id ?? null,
    applicationFee: Number(row.application_fee || 1500),
    paymentStatus: row.payment_status,
    paymentProof: row.payment_proof ?? null,
    paymentNote: row.payment_note ?? null,
    applicationStatus: row.application_status,
    suggestedRegNo: row.suggested_reg_no ?? null,
    finalRegNo: row.final_reg_no ?? null,
    paymentVerifiedAt: row.payment_verified_at ?? null,
    mainAdminApprovedAt: row.main_admin_approved_at ?? null,
    createdStudentId: row.created_student_id ?? null,
    createdAt: row.created_at,
  };
}

function mapPayment(row: any): ApplicationPayment {
  return {
    id: row.id,
    applicationId: row.application_id,
    paymentReference: row.payment_reference,
    amount: Number(row.amount || 1500),
    status: row.status,
    payerName: row.payer_name ?? null,
    bankName: row.bank_name ?? null,
    transactionReference: row.transaction_reference ?? null,
    paymentProof: row.payment_proof ?? null,
    adminNote: row.admin_note ?? null,
    verifiedAt: row.verified_at ?? null,
    createdAt: row.created_at,
  };
}

function cleanCode(value: string, fallback: string) {
  const cleaned = String(value || "")
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 2)
    .toUpperCase();

  return cleaned || fallback;
}

function makeApplicationNo() {
  const stamp = Date.now().toString().slice(-8);
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `INT-APP-${stamp}-${rand}`;
}

function makePaymentReference() {
  const stamp = Date.now().toString().slice(-8);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INT-PAY-${stamp}-${rand}`;
}

export function suggestRegNo(branch: string, programName: string, serial = 1) {
  const branchCode = cleanCode(branch, "BR");
  const programCode = cleanCode(programName, "PR");
  const serialCode = String(serial).padStart(3, "0");
  return `${branchCode}${serialCode}${programCode}`;
}

export async function listApplicationPrograms(): Promise<ApplicationProgram[]> {
  const { data, error } = await supabase
    .from("levels")
    .select("id,name")
    .order("name");

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
  }));
}

export async function getApplicationFee(): Promise<number> {
  const { data, error } = await supabase
    .from("fee_settings")
    .select("amount")
    .eq("key", "application_fee")
    .maybeSingle();

  if (error) return 1500;
  return Number(data?.amount || 1500);
}

export async function submitApplication(input: {
  fullName: string;
  email: string;
  phoneNo: string;
  photo: string;
  zone: string;
  branch: string;
  workInBranch: string;
  programId: string;
  programName: string;
}): Promise<ApplicationRecord> {
  const fee = await getApplicationFee();
  const applicationNo = makeApplicationNo();
  const paymentReference = makePaymentReference();
  const suggestedRegNo = suggestRegNo(input.branch, input.programName, 1);

  const { data, error } = await supabase
    .from("applications")
    .insert({
      application_no: applicationNo,
      payment_reference: paymentReference,
      full_name: input.fullName,
      email: input.email,
      phone_no: input.phoneNo,
      photo: input.photo,
      zone: input.zone,
      branch: input.branch,
      work_in_branch: input.workInBranch,
      program_id: input.programId,
      final_program_id: input.programId,
      application_fee: fee,
      payment_status: "pending",
      application_status: "payment_pending",
      suggested_reg_no: suggestedRegNo,
    })
    .select()
    .single();

  if (error) throw error;

  await supabase.from("application_payments").insert({
    application_id: (data as any).id,
    payment_reference: paymentReference,
    amount: fee,
    status: "pending",
  });

  return mapApplication(data as any);
}

export async function submitPaymentProof(input: {
  applicationNo: string;
  email: string;
  payerName: string;
  bankName: string;
  transactionReference: string;
  paymentProof: string;
}): Promise<void> {
  const { data: app, error: appErr } = await supabase
    .from("applications")
    .select("*")
    .eq("application_no", input.applicationNo)
    .eq("email", input.email)
    .maybeSingle();

  if (appErr) throw appErr;
  if (!app) throw new Error("Application not found. Check application number and email.");

  const { error } = await supabase.from("application_payments").insert({
    application_id: (app as any).id,
    payment_reference: (app as any).payment_reference,
    amount: (app as any).application_fee,
    status: "submitted",
    payer_name: input.payerName,
    bank_name: input.bankName,
    transaction_reference: input.transactionReference,
    payment_proof: input.paymentProof,
  });

  if (error) throw error;
}

export async function loadApplications(): Promise<{
  applications: ApplicationRecord[];
  payments: ApplicationPayment[];
}> {
  const [appsRes, paymentsRes] = await Promise.all([
    supabase.from("applications").select("*").order("created_at", { ascending: false }),
    supabase.from("application_payments").select("*").order("created_at", { ascending: false }),
  ]);

  if (appsRes.error) throw appsRes.error;
  if (paymentsRes.error) throw paymentsRes.error;

  return {
    applications: (appsRes.data ?? []).map(mapApplication),
    payments: (paymentsRes.data ?? []).map(mapPayment),
  };
}

export async function verifyApplicationPayment(
  applicationId: string,
  paymentId: string | null,
  adminId: string,
  note: string
): Promise<void> {
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("applications")
    .update({
      payment_status: "paid",
      application_status: "paid",
      payment_verified_by: adminId,
      payment_verified_at: now,
      payment_note: note,
      updated_at: now,
    })
    .eq("id", applicationId);

  if (error) throw error;

  if (paymentId) {
    const { error: payErr } = await supabase
      .from("application_payments")
      .update({
        status: "verified",
        verified_by: adminId,
        verified_at: now,
        admin_note: note,
        updated_at: now,
      })
      .eq("id", paymentId);

    if (payErr) throw payErr;
  }
}

export async function rejectApplicationPayment(
  applicationId: string,
  paymentId: string | null,
  adminId: string,
  note: string
): Promise<void> {
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("applications")
    .update({
      payment_status: "rejected",
      application_status: "payment_pending",
      payment_verified_by: adminId,
      payment_verified_at: now,
      payment_note: note,
      updated_at: now,
    })
    .eq("id", applicationId);

  if (error) throw error;

  if (paymentId) {
    const { error: payErr } = await supabase
      .from("application_payments")
      .update({
        status: "rejected",
        verified_by: adminId,
        verified_at: now,
        admin_note: note,
        updated_at: now,
      })
      .eq("id", paymentId);

    if (payErr) throw payErr;
  }
}

export async function approveApplication(
  applicationId: string,
  adminId: string,
  finalRegNo: string,
  finalProgramId: string
): Promise<void> {
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("applications")
    .update({
      application_status: "approved",
      main_admin_approved_by: adminId,
      main_admin_approved_at: now,
      final_reg_no: finalRegNo,
      final_program_id: finalProgramId,
      updated_at: now,
    })
    .eq("id", applicationId);

  if (error) throw error;
}





