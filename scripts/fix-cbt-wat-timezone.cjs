const fs = require("fs");

const apiPath = "src/lib/cbtApi.ts";
let api = fs.readFileSync(apiPath, "utf8");

// Add WAT date converter
if (!api.includes("function cbtWatDateTimeToIso")) {
  api = api.replace(
`export type CbtExamStatus = "draft" | "published" | "closed";`,
`export type CbtExamStatus = "draft" | "published" | "closed";

function cbtWatDateTimeToIso(value?: string | null) {
  if (!value) return null;

  // INTIZAR CBT time is handled as Nigeria/WAT time.
  // datetime-local gives "YYYY-MM-DDTHH:mm", so we attach +01:00.
  if (/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}$/.test(value)) {
    return new Date(value + ":00+01:00").toISOString();
  }

  if (/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}$/.test(value)) {
    return new Date(value + "+01:00").toISOString();
  }

  return new Date(value).toISOString();
}`
  );
}

// Make save use WAT converter
api = api.replaceAll(
  "start_at: input.startAt || null,",
  "start_at: cbtWatDateTimeToIso(input.startAt),"
);

api = api.replaceAll(
  "end_at: input.endAt || null,",
  "end_at: cbtWatDateTimeToIso(input.endAt),"
);

fs.writeFileSync(apiPath, api, "utf8");

// Patch student display to always show WAT
const pagePath = "src/pages/student/CbtExams.tsx";
let page = fs.readFileSync(pagePath, "utf8");

page = page.replace(
`return new Date(value).toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });`,
`return new Date(value).toLocaleString([], {
      timeZone: "Africa/Lagos",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });`
);

page = page.replace(
`return new Date(value).toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
    });`,
`return new Date(value).toLocaleDateString([], {
      timeZone: "Africa/Lagos",
      year: "numeric",
      month: "short",
      day: "numeric",
    });`
);

fs.writeFileSync(pagePath, page, "utf8");

console.log("CBT schedule now uses Nigeria/WAT time.");
