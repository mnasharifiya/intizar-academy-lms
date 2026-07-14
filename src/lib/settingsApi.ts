import { supabase } from "./supabase";

export type AppSettings = {
  organizationName: string;
  applicationFee: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  paymentInstructions: string;
  remedialRuleNote: string;
  secretarySignatureUrl: string;
  directorSignatureUrl: string;
  sealUrl: string;
  certificateFooterNote: string;
};

export const DEFAULT_SETTINGS: AppSettings = {
  organizationName: "INTIZAR Academy",
  applicationFee: "1500",
  bankName: "",
  accountName: "",
  accountNumber: "",
  paymentInstructions: "Pay the required fee into the official account and upload your payment proof.",
  remedialRuleNote: "1 failed course = ₦200. More than 1 failed course = ₦250 per failed course.",
  secretarySignatureUrl: "/certificates/secretary-signature.png",
  directorSignatureUrl: "/certificates/director-signature.png",
  sealUrl: "/certificates/intizar-seal.png",
  certificateFooterNote: "This certificate can be verified using the certificate number and verification token.",
};

const keyMap: Record<keyof AppSettings, string> = {
  organizationName: "organization_name",
  applicationFee: "application_fee",
  bankName: "bank_name",
  accountName: "account_name",
  accountNumber: "account_number",
  paymentInstructions: "payment_instructions",
  remedialRuleNote: "remedial_rule_note",
  secretarySignatureUrl: "secretary_signature_url",
  directorSignatureUrl: "director_signature_url",
  sealUrl: "seal_url",
  certificateFooterNote: "certificate_footer_note",
};

export async function loadAppSettings(): Promise<AppSettings> {
  const { data, error } = await supabase
    .from("system_settings")
    .select("key,value");

  if (error) throw error;

  const settings: AppSettings = { ...DEFAULT_SETTINGS };

  for (const row of data ?? []) {
    const appKey = Object.entries(keyMap).find(([, dbKey]) => dbKey === row.key)?.[0] as keyof AppSettings | undefined;

    if (appKey) {
      settings[appKey] = row.value ?? "";
    }
  }

  return settings;
}

export async function saveAppSettings(settings: AppSettings) {
  const rows = Object.entries(keyMap).map(([appKey, dbKey]) => ({
    key: dbKey,
    value: settings[appKey as keyof AppSettings] ?? "",
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("system_settings")
    .upsert(rows, { onConflict: "key" });

  if (error) throw error;

  return true;
}
