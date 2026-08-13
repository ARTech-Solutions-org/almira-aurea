import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import QRCode from "qrcode";

type AttendeeRow = {
  name: string;
  email?: string;
  ticketType: string;
  qrId: string;
};

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      values.push(value.trim());
      value = "";
    } else {
      value += char;
    }
  }
  values.push(value.trim());
  return values;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "attendee";
}

async function main() {
  const inputPath = process.argv[2];
  const outputDir = process.argv[3] ?? "qrcodes";
  if (!inputPath) {
    throw new Error("Usage: pnpm --filter @workspace/scripts generate-qrs <attendees.csv> [output-directory]");
  }
  const lines = (await readFile(inputPath, "utf8")).split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error("The CSV must include a header and at least one attendee.");
  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase().replace(/\s+/g, ""));
  const indexOf = (...names: string[]) => names.map((name) => headers.indexOf(name)).find((index) => index >= 0) ?? -1;
  const nameIndex = indexOf("name", "fullname");
  const emailIndex = indexOf("email", "emailaddress");
  const ticketIndex = indexOf("tickettype", "ticket");
  const qrIndex = indexOf("qrid", "ticketid", "id");
  if (nameIndex < 0) throw new Error("The CSV needs a name column.");
  await mkdir(outputDir, { recursive: true });
  const rows: AttendeeRow[] = [];
  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const name = cells[nameIndex]?.trim();
    if (!name) continue;
    const qrId = cells[qrIndex]?.trim() || `EVT-${randomUUID().slice(0, 8).toUpperCase()}`;
    const row = {
      name,
      email: emailIndex >= 0 ? cells[emailIndex]?.trim() || undefined : undefined,
      ticketType: ticketIndex >= 0 ? cells[ticketIndex]?.trim() || "General admission" : "General admission",
      qrId,
    };
    await QRCode.toFile(path.join(outputDir, `${slug(name)}-${slug(qrId)}.png`), qrId, {
      width: 900,
      margin: 3,
      errorCorrectionLevel: "M",
    });
    rows.push(row);
  }
  await writeFile(path.join(outputDir, "attendees-with-qr-ids.csv"), [
    "name,email,ticketType,qrId",
    ...rows.map((row) => [row.name, row.email ?? "", row.ticketType, row.qrId].map((value) => `"${value.replaceAll('"', '""')}"`).join(",")),
  ].join("\n"));
  console.log(`Generated ${rows.length} QR codes in ${outputDir}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});