const fs = require("fs");

const path = "src/lib/cbtApi.ts";
let text = fs.readFileSync(path, "utf8");

if (!text.includes("sync_cbt_attempt_to_grade")) {
  const marker = `  if (updateError) throw updateError;

  return updatedAttempt;`;

  if (!text.includes(marker)) {
    console.error("Could not find submitCbtAttempt return marker.");
    process.exit(1);
  }

  text = text.replace(
    marker,
`  if (updateError) throw updateError;

  // Sync submitted CBT score into the main Student Grades system.
  // If sync fails, do not block the student submission.
  const { error: syncError } = await (supabase as any).rpc("sync_cbt_attempt_to_grade", {
    p_attempt_id: attemptId,
  });

  if (syncError) {
    console.warn("CBT grade sync failed:", syncError.message);
  }

  return updatedAttempt;`
  );
}

fs.writeFileSync(path, text, "utf8");

console.log("CBT submission now syncs to Student Grades.");
