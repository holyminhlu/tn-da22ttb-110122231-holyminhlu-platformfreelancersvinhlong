/** Hợp đồng từ job do client đăng — không giới hạn lượt chỉnh sửa cho đến khi hoàn thành. */
export function isJobBasedContract(contract: {
  job_id?: string | null;
  service_id?: string | null;
}): boolean {
  return Boolean(contract.job_id) && !contract.service_id;
}

export function contractHasUnlimitedRevisions(contract: {
  job_id?: string | null;
  service_id?: string | null;
  revisions_limit?: number | null;
}): boolean {
  return isJobBasedContract(contract) || Number(contract.revisions_limit) === 0;
}

export function revisionAllowance(contract: {
  job_id?: string | null;
  service_id?: string | null;
  revisions_limit?: number | null;
  revisions_used?: number | null;
}): {
  unlimited: boolean;
  limit: number;
  used: number;
  left: number;
  canRequest: boolean;
} {
  const unlimited = contractHasUnlimitedRevisions(contract);
  const used = Number(contract.revisions_used) || 0;
  const limit = unlimited ? 0 : Number(contract.revisions_limit) || 2;
  const left = unlimited ? Infinity : Math.max(0, limit - used);
  return {
    unlimited,
    limit,
    used,
    left: unlimited ? used : left,
    canRequest: unlimited || left > 0,
  };
}
