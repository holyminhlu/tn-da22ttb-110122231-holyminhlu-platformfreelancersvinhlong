const MS_PER_UNIT = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

function parseExpiryToMs(input, fallbackMs) {
  if (!input) return fallbackMs;

  const match = String(input).trim().match(/^(\d+)([smhd])$/i);
  if (!match) return fallbackMs;

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const unitMs = MS_PER_UNIT[unit];

  if (!Number.isFinite(amount) || !unitMs) return fallbackMs;
  return amount * unitMs;
}

module.exports = { parseExpiryToMs };
