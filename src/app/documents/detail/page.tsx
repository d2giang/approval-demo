"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Download, ExternalLink, FileSignature } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { SignaturePad } from "@/components/signature-pad";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ApprovalDocument, SignatureSlot } from "@/lib/types";
import { stampPdf } from "@/lib/pdf";
import { getCurrentUser, getDocument, saveDocument } from "@/lib/storage";
import { canApprove, getCurrentApprover, getNextStatus, roleLabels, statusBadgeClass, statusLabels } from "@/lib/workflow";

function DocumentDetailContent() {
  const searchParams = useSearchParams();
  const documentId = searchParams.get("id");
  const [doc, setDoc] = useState<ApprovalDocument | null>(null);
  const [loadingDocument, setLoadingDocument] = useState(true);
  const [note, setNote] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [signatureImage, setSignatureImage] = useState<string>();
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!documentId) {
      setLoadingDocument(false);
      return;
    }

    void getDocument(documentId)
      .then((document) => setDoc(document || null))
      .finally(() => setLoadingDocument(false));
  }, [documentId]);

  const action = async (type: "approve" | "reject" | "change_requested") => {
    if (!doc) return;
    const user = getCurrentUser();
    const now = new Date().toISOString();
    const fromStatus = doc.status;
    const toStatus = type === "approve" ? getNextStatus(doc.status) : type === "reject" ? "rejected" : "change_requested";
    let files = doc.files;

    setError("");
    if (type === "approve") {
      if (!signatureImage) {
        setError("Vui lòng ký cá nhân trực tiếp hoặc tải ảnh chữ ký trước khi duyệt.");
        return;
      }

      const pdfFiles = doc.files.filter((file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
      if (pdfFiles.length === 0) {
        setError("Hồ sơ không có file PDF để ký.");
        return;
      }

      try {
        setSigning(true);
        const slot = getCurrentApprover(fromStatus) as SignatureSlot;
        files = await Promise.all(doc.files.map((file) => (
          pdfFiles.includes(file)
            ? stampPdf(file, {
                displayName: displayName.trim() || user.name,
                signedAt: now,
                slot,
                signatureImage,
              })
            : file
        )));
      } catch (stampError) {
        setError(stampError instanceof Error ? stampError.message : "Không thể ký file PDF.");
        setSigning(false);
        return;
      }
    }

    const updated: ApprovalDocument = {
      ...doc,
      files,
      status: toStatus,
      currentStep: getCurrentApprover(toStatus),
      updatedAt: now,
      signatures: type === "approve" ? [
        ...(doc.signatures || []),
        {
          id: crypto.randomUUID(),
          actorRole: user.role,
          actorName: user.name,
          displayName: displayName.trim() || user.name,
          slot: getCurrentApprover(fromStatus) as SignatureSlot,
          pageNumber: doc.files.length > 0 ? -1 : 0,
          createdAt: now,
        },
      ] : doc.signatures,
      logs: [
        {
          id: crypto.randomUUID(),
          action: type === "approve" ? "approved" : type === "reject" ? "rejected" : "change_requested",
          actorRole: user.role,
          actorName: user.name,
          note,
          createdAt: now,
          fromStatus,
          toStatus,
        },
        ...doc.logs,
      ],
    };

    try {
      await saveDocument(updated);
      setDoc(updated);
      setNote("");
      setSignatureImage(undefined);
    } catch {
      setError("Không thể lưu PDF đã ký vào IndexedDB. Hãy kiểm tra dung lượng trình duyệt hoặc dùng PDF nhỏ hơn.");
    } finally {
      setSigning(false);
    }
  };

  const readSignature = (file?: File) => {
    if (!file) return setSignatureImage(undefined);
    const reader = new FileReader();
    reader.onload = () => setSignatureImage(String(reader.result));
    reader.readAsDataURL(file);
  };

  if (loadingDocument) {
    return (
      <AppShell>
        <Card><CardContent>Đang tải hồ sơ và file PDF...</CardContent></Card>
      </AppShell>
    );
  }

  if (!doc) {
    return (
      <AppShell>
        <Card><CardContent>Không tìm thấy hồ sơ. <Link className="text-blue-600" href="/documents">Quay lại</Link></CardContent></Card>
      </AppShell>
    );
  }

  const user = getCurrentUser();
  const allowApprove = canApprove(user.role, doc.status);

  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between">
        <Link href="/documents" className="text-sm text-blue-600">← Quay lại danh sách</Link>
        <Badge className={statusBadgeClass[doc.status]}>{statusLabels[doc.status]}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{doc.code} - {doc.title}</CardTitle>
              <p className="text-sm text-slate-500">Bước hiện tại: {doc.currentStep ? roleLabels[doc.currentStep] : "Không có"}</p>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><b>Kỳ:</b> {doc.period}</div>
                <div><b>Số tiền:</b> {doc.amount.toLocaleString("vi-VN")} VNĐ</div>
                <div><b>Loại:</b> {doc.type}</div>
                <div><b>Ngày tạo:</b> {new Date(doc.createdAt).toLocaleString("vi-VN")}</div>
              </div>
              <div><b>Ghi chú:</b><p className="mt-1 rounded-lg bg-slate-50 p-3">{doc.note || "Không có"}</p></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>File đính kèm</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {doc.files.length === 0 ? <p className="text-sm text-slate-500">Chưa upload file.</p> : doc.files.map((file) => {
                const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
                return (
                  <div key={file.name} className="space-y-3 rounded-lg border p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{file.name}</span>
                      <div className="flex gap-3">
                        {file.originalDataUrl && <a className="text-slate-600" href={file.originalDataUrl} target="_blank">PDF gốc</a>}
                        {file.dataUrl && <a className="inline-flex items-center gap-1 text-blue-600" href={file.dataUrl} target="_blank"><ExternalLink size={14} /> Mở</a>}
                        {file.dataUrl && <a className="inline-flex items-center gap-1 text-blue-600" href={file.dataUrl} download={file.name}><Download size={14} /> Tải</a>}
                      </div>
                    </div>
                    {isPdf && file.dataUrl && (
                      <iframe title={file.name} src={file.dataUrl} className="h-[620px] w-full rounded-md border bg-slate-100" />
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Thao tác duyệt</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {allowApprove ? (
                <>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <div className="mb-3 flex items-center gap-2 font-medium text-emerald-800"><FileSignature size={18} /> Chữ ký trên PDF</div>
                    <label className="mb-1 block text-xs font-medium">Tên hiển thị</label>
                    <input className="mb-3 h-9 w-full rounded-md border bg-white px-3 text-sm" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder={user.name} />
                    <label className="mb-1 block text-xs font-medium">Ký cá nhân trực tiếp</label>
                    <SignaturePad onChange={setSignatureImage} />
                    <div className="my-3 flex items-center gap-2 text-xs text-slate-400">
                      <span className="h-px flex-1 bg-slate-200" />
                      hoặc tải ảnh chữ ký
                      <span className="h-px flex-1 bg-slate-200" />
                    </div>
                    <input className="mb-3 block w-full text-xs" type="file" accept="image/png,image/jpeg" onChange={(event) => readSignature(event.target.files?.[0])} />
                    <p className="mt-2 text-xs text-slate-500">
                      Chữ ký sẽ được chèn vào đúng ô {roleLabels[getCurrentApprover(doc.status) || user.role]} đã bố trí trên trang cuối.
                    </p>
                  </div>
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú duyệt/từ chối..." />
                  {error && <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>}
                  <Button disabled={signing || !signatureImage} onClick={() => action("approve")} className="w-full">{signing ? "Đang ký PDF..." : "Ký và duyệt thanh toán"}</Button>
                  <Button disabled={signing} onClick={() => action("change_requested")} variant="outline" className="w-full">Yêu cầu sửa</Button>
                  <Button disabled={signing} onClick={() => action("reject")} variant="destructive" className="w-full">Từ chối</Button>
                </>
              ) : (
                <p className="text-sm text-slate-500">Role hiện tại không phải người duyệt ở bước này.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Chữ ký đã ghi nhận</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(doc.signatures || []).length === 0 ? <p className="text-sm text-slate-500">Chưa có chữ ký.</p> : doc.signatures?.map((signature) => (
                <div key={signature.id} className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
                  <div className="font-semibold text-emerald-800">{signature.displayName}</div>
                  <div>{roleLabels[signature.actorRole]}</div>
                  <div className="text-xs text-slate-500">{new Date(signature.createdAt).toLocaleString("vi-VN")}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Audit log</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {doc.logs.map((log) => (
                <div key={log.id} className="border-l-2 border-slate-200 pl-3 text-sm">
                  <div className="font-medium">{log.actorName} - {roleLabels[log.actorRole]}</div>
                  <div className="text-slate-500">{log.action} • {new Date(log.createdAt).toLocaleString("vi-VN")}</div>
                  {log.note && <div className="mt-1 rounded bg-slate-50 p-2">{log.note}</div>}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

export default function DocumentDetailPage() {
  return (
    <Suspense fallback={<AppShell><Card><CardContent>Đang tải hồ sơ và file PDF...</CardContent></Card></AppShell>}>
      <DocumentDetailContent />
    </Suspense>
  );
}
