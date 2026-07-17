const fs = require("fs");

const path = "src/pages/public/ApplicationForm.tsx";
let text = fs.readFileSync(path, "utf8");

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

text = text.replace(
  /<Field label="Zone">\s*<TextInput value=\{form\.zone\} onChange=\{\(e: any\) => updateForm\("zone", e\.target\.value\)\} \/>\s*<\/Field>/,
`<Field label="Zone">
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
              </Field>`
);

text = text.replace(
  /<Field label="Branch">\s*<TextInput value=\{form\.branch\} onChange=\{\(e: any\) => updateForm\("branch", e\.target\.value\)\} \/>\s*<\/Field>/,
`<Field label="Branch">
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
              </Field>`
);

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

console.log("Application zone and branch dropdowns added.");
