const fs = require("fs");

const path = "src/pages/public/ApplicationForm.tsx";
let text = fs.readFileSync(path, "utf8");

// Add fixed zone/branch data
if (!text.includes("const BRANCHES_BY_ZONE")) {
  text = text.replace(
    "const emptyProof = {",
`const BRANCHES_BY_ZONE: Record<string, string[]> = {
  "Sokoto Zone": ["Sokoto", "Mafara", "Illela", "Yabo", "Yaure", "Zuru"],
  "Zaria Zone": ["Danja", "Dutsen Wai", "Kudan", "Soba", "Zaria"],
  "Kaduna Zone": ["Jaji", "M/Jos", "Kaduna"],
  "Abuja Zone": ["Keffi", "Maraba", "Minna", "Suleja", "Lafia/Doma"],
  "Kano Zone": ["Kano", "Kazaure", "Potiskum", "Gashua", "Maiduguri", "Nafada", "Damaturu"],
  "Bauchi Zone": ["Gombe", "Jos", "Azare"],
  "Malumfashi Zone": ["Bakori", "Malumfashi", "Katsina"],
  "Nijar Zone": ["Niyame", "Maradi", "Qum"],
};

const ZONES = Object.keys(BRANCHES_BY_ZONE);

const emptyProof = {`
  );
}

// Force replace Zone + Branch JSX block
const zoneStart = text.indexOf('<Field label="Zone">');
const workStart = text.indexOf('<Field label="Work in Branch">', zoneStart);

if (zoneStart === -1 || workStart === -1) {
  console.error("Could not find Zone/Branch block.");
  process.exit(1);
}

const newBlock = `<Field label="Zone">
                <select
                  style={selectStyle}
                  value={form.zone}
                  onChange={(e: any) => {
                    updateForm("zone", e.target.value);
                    updateForm("branch", "");
                  }}
                >
                  <option value="">Select zone</option>
                  {ZONES.map(zone => (
                    <option key={zone} value={zone}>{zone}</option>
                  ))}
                </select>
              </Field>

              <Field label="Branch">
                <select
                  style={selectStyle}
                  value={form.branch}
                  disabled={!form.zone}
                  onChange={(e: any) => updateForm("branch", e.target.value)}
                >
                  <option value="">{form.zone ? "Select branch" : "Select zone first"}</option>
                  {(BRANCHES_BY_ZONE[form.zone] ?? []).map(branch => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
              </Field>

              `;

text = text.slice(0, zoneStart) + newBlock + text.slice(workStart);

// Add select style
if (!text.includes("const selectStyle")) {
  const marker = "function TextInput";
  if (text.includes(marker)) {
    text = text.replace(
      marker,
`const selectStyle = {
  width: "100%",
  border: "1px solid #dbe3ef",
  borderRadius: 12,
  padding: "11px 12px",
  fontWeight: 700,
  boxSizing: "border-box" as const,
  background: "#ffffff",
};

${marker}`
    );
  } else {
    text += `

const selectStyle = {
  width: "100%",
  border: "1px solid #dbe3ef",
  borderRadius: 12,
  padding: "11px 12px",
  fontWeight: 700,
  boxSizing: "border-box" as const,
  background: "#ffffff",
};
`;
  }
}

fs.writeFileSync(path, text, "utf8");

console.log("Zone and Branch force changed to dropdowns.");
