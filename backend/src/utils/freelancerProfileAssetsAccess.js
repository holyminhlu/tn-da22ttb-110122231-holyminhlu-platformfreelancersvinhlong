const CONTRACT_STATUSES_FOR_PROFILE_ASSETS = ["active", "completed", "disputed"];

async function clientHasFreelancerContract(db, clientId, freelancerId) {
  const result = await db.query(
    `SELECT 1
     FROM public.contracts
     WHERE client_id = $1
       AND freelancer_id = $2
       AND deleted_at IS NULL
       AND status = ANY($3::public.contract_status[])
     LIMIT 1`,
    [clientId, freelancerId, CONTRACT_STATUSES_FOR_PROFILE_ASSETS],
  );
  return result.rowCount > 0;
}

async function canViewFreelancerProfileAssets(db, viewer, freelancerId) {
  if (!viewer?.sub) return false;
  if (String(viewer.sub) === String(freelancerId)) return true;
  const role = String(viewer.role || "").toLowerCase();
  if (role !== "client") return false;
  return clientHasFreelancerContract(db, viewer.sub, freelancerId);
}

function exclusiveResourceDownloadPath(freelancerId, resourceId) {
  return `/api/freelancers/${freelancerId}/exclusive-resources/${resourceId}/download`;
}

function profileFileDownloadPath(freelancerId, fileId) {
  return `/api/freelancers/${freelancerId}/profile-files/${fileId}/download`;
}

function mapExclusiveResourceForViewer(row, freelancerId) {
  const resourceType = String(row.resource_type || "link").toLowerCase();
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    resource_type: resourceType,
    link_url: resourceType === "link" ? row.link_url : null,
    file_url:
      resourceType === "file" ? exclusiveResourceDownloadPath(freelancerId, row.id) : null,
    file_name: row.file_name,
    created_at: row.created_at,
  };
}

function mapProfileFileForViewer(row, freelancerId) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    file_url: profileFileDownloadPath(freelancerId, row.id),
    file_name: row.file_name,
    file_size: row.file_size,
    mime_type: row.mime_type,
    created_at: row.created_at,
  };
}

async function loadFreelancerProfileAssetsForViewer(db, freelancerId, viewer) {
  const allowed = await canViewFreelancerProfileAssets(db, viewer, freelancerId);
  if (!allowed) {
    return { exclusiveResources: [], profileFiles: [] };
  }

  return loadFreelancerProfileAssets(db, freelancerId);
}

async function loadFreelancerProfileAssets(db, freelancerId) {
  let exclusiveResources = [];
  let profileFiles = [];

  try {
    const resourcesResult = await db.query(
      `SELECT id, title, description, resource_type, link_url, file_url, file_name, created_at
       FROM public.freelancer_exclusive_resources
       WHERE freelancer_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT 50`,
      [freelancerId],
    );
    exclusiveResources = resourcesResult.rows.map((row) =>
      mapExclusiveResourceForViewer(row, freelancerId),
    );
  } catch (err) {
    if (err.code !== "42P01") throw err;
  }

  try {
    const filesResult = await db.query(
      `SELECT id, title, description, file_url, file_name, file_size, mime_type, created_at
       FROM public.freelancer_profile_files
       WHERE freelancer_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT 50`,
      [freelancerId],
    );
    profileFiles = filesResult.rows.map((row) => mapProfileFileForViewer(row, freelancerId));
  } catch (err) {
    if (err.code !== "42P01") throw err;
  }

  return { exclusiveResources, profileFiles };
}

function resolveUploadDiskPath(fileUrl) {
  const path = require("path");
  const normalized = String(fileUrl || "").trim();
  if (!normalized.startsWith("/uploads/")) return null;
  return path.join(__dirname, "..", "..", normalized.slice(1));
}

module.exports = {
  CONTRACT_STATUSES_FOR_PROFILE_ASSETS,
  clientHasFreelancerContract,
  canViewFreelancerProfileAssets,
  exclusiveResourceDownloadPath,
  profileFileDownloadPath,
  mapExclusiveResourceForViewer,
  mapProfileFileForViewer,
  loadFreelancerProfileAssetsForViewer,
  loadFreelancerProfileAssets,
  resolveUploadDiskPath,
};
