import { base44 } from "@/api/base44Client";

/**
 * Uploads a file and automatically creates a Document entry.
 * Returns { file_url }
 */
export async function uploadAndRegister(file, { module = "upload", projectId, projectName, taskId, docType = "other" } = {}) {
  const { file_url } = await base44.integrations.Core.UploadFile({ file });

  let user = null;
  try { user = await base44.auth.me(); } catch (_) {}

  await base44.entities.Document.create({
    name: file.name,
    type: docType,
    file_url,
    project_id: projectId || "",
    project_name: projectName || "",
    task_id: taskId || "",
    author: user?.full_name || user?.email || "System",
    description: `Auto-imported from ${module}`,
    version: "1.0",
  });

  return { file_url };
}