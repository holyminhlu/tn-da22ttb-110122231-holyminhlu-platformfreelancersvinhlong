#!/usr/bin/env node
/**
 * Resolve dispute: node backend/scripts/resolve-dispute.js <disputeId> <full_refund|release|dismiss> [adminNote]
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

const { pool } = require("../src/db/pool");
const {
  refundEscrowToClient,
  releasePaymentToFreelancer,
  logWorkflowEvent,
} = require("../src/utils/workflowSla");

async function main() {
  const disputeId = process.argv[2];
  const resolution = process.argv[3];
  const adminNote = process.argv.slice(4).join(" ") || null;

  if (!disputeId || !["full_refund", "release", "dismiss"].includes(resolution)) {
    console.error("Usage: resolve-dispute.js <disputeId> <full_refund|release|dismiss> [note]");
    process.exit(1);
  }

  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const dRes = await db.query(
      `SELECT d.*, c.*
       FROM public.contract_disputes d
       INNER JOIN public.contracts c ON c.id = d.contract_id
       WHERE d.id = $1 AND d.status = 'open'
       LIMIT 1`,
      [disputeId],
    );
    if (!dRes.rows[0]) {
      throw new Error("Không tìm thấy tranh chấp đang mở.");
    }
    const row = dRes.rows[0];

    if (resolution === "full_refund") {
      await refundEscrowToClient(db, row, adminNote || "Admin: hoàn tiền tranh chấp", null);
    } else if (resolution === "release") {
      await releasePaymentToFreelancer(db, row, null, false);
      await db.query(
        `UPDATE public.contracts SET status = 'completed', workflow_stage = 'completion', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [row.contract_id],
      );
    }

    await db.query(
      `UPDATE public.contract_disputes
       SET status = 'resolved', resolution = $1, admin_notes = $2, resolved_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [resolution, adminNote, disputeId],
    );
    await logWorkflowEvent(db, row.contract_id, "dispute_resolved", { resolution, adminNote });
    await db.query("COMMIT");
    console.log("Resolved dispute", disputeId, resolution);
  } catch (err) {
    await db.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    db.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
