const BANK_BIN_BY_NAME = {
  vietcombank: "970436",
  bidv: "970418",
  vietinbank: "970415",
  agribank: "970405",
  techcombank: "970407",
  "mb bank": "970422",
  acb: "970416",
  vpbank: "970432",
  sacombank: "970403",
  tpbank: "970423",
};

function resolveBankBin(bankName) {
  const label = String(bankName || "").toLowerCase().trim();
  for (const [bank, bin] of Object.entries(BANK_BIN_BY_NAME)) {
    if (label.includes(bank)) return bin;
  }
  return null;
}

module.exports = { resolveBankBin, BANK_BIN_BY_NAME };
