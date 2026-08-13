import { Router, type IRouter } from "express";
import { PDFDocument } from "pdf-lib";
import QRCode from "qrcode";
import { ZipArchive } from "archiver";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { db, attendeesTable } from "@workspace/db";
import { GenerateInvitationsBody } from "@workspace/api-zod";
import { requireOrganizer } from "./event-helpers.js";

const router: IRouter = Router();
router.use("/invitations", requireOrganizer);

const QR_BOX = {
  x: 364,
  y: 468.9,
  size: 180,
} as const;

const TEMPLATE_PATHS = {
  vip: path.resolve(process.cwd(), "artifacts/api-server/templates/vip-template.pdf"),
  regular: path.resolve(process.cwd(), "artifacts/api-server/templates/regular-template.pdf"),
} as const;

type InvitationType = keyof typeof TEMPLATE_PATHS;

async function buildInvitationPdf(type: InvitationType, qrId: string): Promise<Buffer> {
  const templateBytes = await readFile(TEMPLATE_PATHS[type]);
  const pdf = await PDFDocument.load(templateBytes);
  const qrPng = await QRCode.toBuffer(qrId, {
    type: "png",
    margin: 0,
    width: 600,
    errorCorrectionLevel: "M",
  });
  const qrImage = await pdf.embedPng(qrPng);
  const page = pdf.getPages()[0];

  page.drawImage(qrImage, {
    x: QR_BOX.x,
    y: QR_BOX.y,
    width: QR_BOX.size,
    height: QR_BOX.size,
  });

  return Buffer.from(await pdf.save());
}

router.post("/invitations/generate", async (req, res): Promise<void> => {
  const parsed = GenerateInvitationsBody.safeParse(req.body);
  if (
    !parsed.success ||
    !Number.isInteger(parsed.data?.vipCount) ||
    !Number.isInteger(parsed.data?.regularCount) ||
    (parsed.data?.vipCount ?? 0) < 0 ||
    (parsed.data?.regularCount ?? 0) < 0 ||
    (parsed.data?.vipCount ?? 0) + (parsed.data?.regularCount ?? 0) === 0
  ) {
    res.status(400).json({ error: "Request at least one VIP or Regular invitation." });
    return;
  }

  const { vipCount, regularCount } = parsed.data;
  const requested = [
    ...Array.from({ length: vipCount }, () => "vip" as const),
    ...Array.from({ length: regularCount }, () => "regular" as const),
  ];
  const records = requested.map((type) => ({
    qrId: `INV-${randomUUID()}`,
    name: `${type === "vip" ? "VIP" : "Regular"} Invitation`,
    ticketType: type === "vip" ? "VIP" : "Regular",
  }));

  const invitationPdfs = await Promise.all(
    records.map(async (record, index) => ({
      record,
      index,
      pdf: await buildInvitationPdf(
        record.ticketType === "VIP" ? "vip" : "regular",
        record.qrId,
      ),
    })),
  );

  await db.insert(attendeesTable).values(records);

  res.status(200);
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", 'attachment; filename="gatepass-invitations.zip"');
  const archive = new ZipArchive({ zlib: { level: 9 } });
  archive.on("error", (error: Error) => {
    req.log.error({ err: error }, "Failed to stream invitation archive");
    if (!res.headersSent) res.status(500).json({ error: "Could not create invitation archive." });
    else res.destroy(error);
  });
  archive.pipe(res);

  for (const { record, index, pdf } of invitationPdfs) {
    const sequence = String(index + 1).padStart(3, "0");
    const folder = record.ticketType === "VIP" ? "VIP" : "Regular";
    archive.append(pdf, {
      name: `${folder}/${sequence}-${record.qrId}.pdf`,
    });
  }

  await archive.finalize();
});

export default router;