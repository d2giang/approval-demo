export type Role = "hro" | "accountant" | "chief_accountant" | "cfo" | "admin";

export type DocumentStatus =
  | "draft"
  | "pending_accountant"
  | "pending_chief_accountant"
  | "pending_cfo"
  | "approved"
  | "rejected"
  | "change_requested";

export type ApprovalAction = "created" | "submitted" | "approved" | "rejected" | "change_requested";

export type ApprovalLog = {
  id: string;
  action: ApprovalAction;
  actorRole: Role;
  actorName: string;
  note?: string;
  createdAt: string;
  fromStatus?: DocumentStatus;
  toStatus?: DocumentStatus;
};

export type DemoFile = {
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
  originalDataUrl?: string;
};

export type SignatureSlot = "submitter" | "accountant" | "chief_accountant" | "cfo";

export type ApprovalSignature = {
  id: string;
  actorRole: Role;
  actorName: string;
  displayName: string;
  slot?: SignatureSlot;
  pageNumber: number;
  createdAt: string;
};

export type ApprovalDocument = {
  id: string;
  code: string;
  title: string;
  type: "salary" | "fee" | "payment";
  period: string;
  amount: number;
  note?: string;
  status: DocumentStatus;
  currentStep: Role | null;
  createdBy: Role;
  createdAt: string;
  updatedAt: string;
  files: DemoFile[];
  signatures?: ApprovalSignature[];
  logs: ApprovalLog[];
};

export type DemoUser = {
  role: Role;
  name: string;
};
