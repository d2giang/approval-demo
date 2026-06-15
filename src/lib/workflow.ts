import { DocumentStatus, Role } from "./types";

export const roleLabels: Record<Role, string> = {
  hro: "Nhân sự / HRO",
  accountant: "Kế toán viên",
  chief_accountant: "Kế toán trưởng",
  cfo: "Giám đốc tài chính",
  admin: "Admin",
};

export const statusLabels: Record<DocumentStatus, string> = {
  draft: "Bản nháp",
  pending_accountant: "Chờ kế toán viên duyệt",
  pending_chief_accountant: "Chờ kế toán trưởng duyệt",
  pending_cfo: "Chờ CFO duyệt",
  approved: "Đã duyệt hoàn tất",
  rejected: "Đã từ chối",
  change_requested: "Yêu cầu sửa",
};

export const statusBadgeClass: Record<DocumentStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  pending_accountant: "bg-blue-100 text-blue-700",
  pending_chief_accountant: "bg-indigo-100 text-indigo-700",
  pending_cfo: "bg-purple-100 text-purple-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  change_requested: "bg-amber-100 text-amber-700",
};

export function getCurrentApprover(status: DocumentStatus): Role | null {
  if (status === "pending_accountant") return "accountant";
  if (status === "pending_chief_accountant") return "chief_accountant";
  if (status === "pending_cfo") return "cfo";
  return null;
}

export function getNextStatus(status: DocumentStatus): DocumentStatus {
  if (status === "draft") return "pending_accountant";
  if (status === "pending_accountant") return "pending_chief_accountant";
  if (status === "pending_chief_accountant") return "pending_cfo";
  if (status === "pending_cfo") return "approved";
  return status;
}

export function canApprove(role: Role, status: DocumentStatus) {
  if (role === "admin") return ["pending_accountant", "pending_chief_accountant", "pending_cfo"].includes(status);
  return getCurrentApprover(status) === role;
}

export function canCreate(role: Role) {
  return role === "hro" || role === "admin";
}
