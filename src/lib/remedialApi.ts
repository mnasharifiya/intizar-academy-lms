import { supabase } from "./supabase";

export type RemedialPayment = {
  id: string;
  studentId: string;
  programId: string | null;
  groupId: string | null;
  paymentReference: string;
  paymentCategory: string;
  failedCourseCount: number;
  failedCourses: any[];
  amount: number;
  status: string;
  payerName: string | null;
  bankName: string | null;
  transactionReference: string | null;
  paymentProof: string | null;
  adminNote: string | null;
  createdBy: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  createdAt: string;
};

export function remedialAmount(failedCourseCount: number) {
  if (failedCourseCount <= 0) return 0;
  if (failedCourseCount === 1) return 200;
  return failedCourseCount * 250;
}

function mapRemedialPayment(row: any): RemedialPayment {
  return {
    id: row.id,
    studentId: row.student_id,
    programId: row.program_id ?? null,
    groupId: row.group_id ?? null,
    paymentReference: row.payment_reference,
    paymentCategory: row.payment_category || "Remedial Course Payment",
    failedCourseCount: Number(row.failed_course_count || 0),
    failedCourses: Array.isArray(row.failed_courses) ? row.failed_courses : [],
    amount: Number(row.amount || 0),
    status: row.status,
    payerName: row.payer_name ?? null,
    bankName: row.bank_name ?? null,
    transactionReference: row.transaction_reference ?? null,
    paymentProof: row.payment_proof ?? null,
    adminNote: row.admin_note ?? null,
    createdBy: row.created_by ?? null,
    verifiedBy: row.verified_by ?? null,
    verifiedAt: row.verified_at ?? null,
    createdAt: row.created_at,
  };
}

function makePaymentReference() {
  const year = new Date().getFullYear();
  const stamp = Date.now().toString().slice(-8);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INT-REM-${year}-${stamp}-${rand}`;
}

export async function loadRemedialPayments(): Promise<RemedialPayment[]> {
  const { data, error } = await supabase
    .from("remedial_payments")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map(mapRemedialPayment);
}

export async function createRemedialPayment(input: {
  studentId: string;
  programId: string | null;
  groupId: string | null;
  failedCourses: any[];
  createdBy: string;
}): Promise<RemedialPayment> {
  const failedCourseCount = input.failedCourses.length;
  const amount = remedialAmount(failedCourseCount);

  const { data, error } = await supabase
    .from("remedial_payments")
    .insert({
      student_id: input.studentId,
      program_id: input.programId,
      group_id: input.groupId,
      payment_reference: makePaymentReference(),
      payment_category: "Remedial Course Payment",
      failed_course_count: failedCourseCount,
      failed_courses: input.failedCourses,
      amount,
      status: "pending",
      created_by: input.createdBy,
    })
    .select()
    .single();

  if (error) throw error;

  return mapRemedialPayment(data as any);
}

export async function verifyRemedialPayment(input: {
  paymentId: string;
  verifiedBy: string;
  note: string;
}): Promise<void> {
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("remedial_payments")
    .update({
      status: "verified",
      verified_by: input.verifiedBy,
      verified_at: now,
      admin_note: input.note,
      updated_at: now,
    })
    .eq("id", input.paymentId);

  if (error) throw error;
}

export async function rejectRemedialPayment(input: {
  paymentId: string;
  verifiedBy: string;
  note: string;
}): Promise<void> {
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("remedial_payments")
    .update({
      status: "rejected",
      verified_by: input.verifiedBy,
      verified_at: now,
      admin_note: input.note,
      updated_at: now,
    })
    .eq("id", input.paymentId);

  if (error) throw error;
}
