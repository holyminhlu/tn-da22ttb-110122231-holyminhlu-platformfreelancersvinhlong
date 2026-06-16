const BANK_BIN_BY_NAME = {
  vietcombank: "970436",
  vcb: "970436",
  bidv: "970418",
  "dau tu va phat trien": "970418",
  vietinbank: "970415",
  ctg: "970415",
  agribank: "970405",
  techcombank: "970407",
  "mb bank": "970422",
  mbbank: "970422",
  military: "970422",
  acb: "970416",
  vpbank: "970432",
  sacombank: "970403",
  tpbank: "970423",
  hdbank: "970437",
  vietabank: "970427",
  seabank: "970440",
  ocb: "970448",
  eximbank: "970431",
  shb: "970443",
  msb: "970426",
  vibbank: "970441",
  vib: "970441",
  namabank: "970428",
  bacabank: "970409",
  pvcombank: "970412",
  lienvietpostbank: "970449",
  lpbank: "970449",
  kiênlongbank: "970452",
  kienlongbank: "970452",
};

function resolveBankBin(bankName) {
  const label = String(bankName || "").toLowerCase().trim();
  for (const [bank, bin] of Object.entries(BANK_BIN_BY_NAME)) {
    if (label.includes(bank)) return bin;
  }
  return null;
}

module.exports = { resolveBankBin, BANK_BIN_BY_NAME };
