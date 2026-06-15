"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SignaturePad } from "@/components/signature-pad";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getCurrentUser, saveDocument } from "@/lib/storage";
import { ApprovalDocument, DemoFile } from "@/lib/types";
import { stampPdf } from "@/lib/pdf";
import { getCurrentApprover } from "@/lib/workflow";

function readFiles(files: FileList | null): Promise<DemoFile[]> {
  if (!files) return Promise.resolve([]);
  const list = Array.from(files);
  const invalidFile = list.find((file) => file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf"));
  if (invalidFile) return Promise.reject(new Error(`${invalidFile.name} không phải file PDF.`));
  const oversizedFile = list.find((file) => file.size > 15_000_000);
  if (oversizedFile) return Promise.reject(new Error(`${oversizedFile.name} vượt quá 15 MB của bản demo.`));
  return Promise.all(list.map((file) => new Promise<DemoFile>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, size: file.size, type: file.type, dataUrl: String(reader.result) });
    reader.readAsDataURL(file);
  })));
}

export default function NewDocumentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [signatureImage, setSignatureImage] = useState<string>();

  const readSignature = (file?: File) => {
    if (!file) return setSignatureImage(undefined);
    const reader = new FileReader();
    reader.onload = () => setSignatureImage(String(reader.result));
    reader.readAsDataURL(file);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const form = new FormData(event.currentTarget);
      const now = new Date().toISOString();
      const user = getCurrentUser();
      const id = crypto.randomUUID();
      if (!signatureImage) throw new Error("Vui lòng thêm chữ ký Người trình trước khi gửi duyệt.");

      const uploadedFiles = await readFiles(event.currentTarget.demoFiles.files);
      const files = await Promise.all(uploadedFiles.map((file) => stampPdf(file, {
        displayName: String(form.get("submitterName") || "").trim() || user.name,
        signedAt: now,
        slot: "submitter",
        signatureImage,
      })));

      const doc: ApprovalDocument = {
        id,
        code: `PAY-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000 + 10000)}`,
        title: String(form.get("title") || ""),
        type: form.get("type") as ApprovalDocument["type"],
        period: String(form.get("period") || ""),
        amount: Number(form.get("amount") || 0),
        note: String(form.get("note") || ""),
        status: "pending_accountant",
        currentStep: getCurrentApprover("pending_accountant"),
        createdBy: user.role,
        createdAt: now,
        updatedAt: now,
        files,
        signatures: [{
          id: crypto.randomUUID(),
          actorRole: user.role,
          actorName: user.name,
          displayName: String(form.get("submitterName") || "").trim() || user.name,
          slot: "submitter",
          pageNumber: -1,
          createdAt: now,
        }],
        logs: [
          {
            id: crypto.randomUUID(),
            action: "created",
            actorRole: user.role,
            actorName: user.name,
            note: "Tạo hồ sơ và gửi duyệt",
            createdAt: now,
            toStatus: "pending_accountant",
          },
        ],
      };

      await saveDocument(doc);
      router.push(`/documents/detail?id=${encodeURIComponent(id)}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Không thể tạo hồ sơ.");
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <Card>
        <CardHeader>
          <CardTitle>Tạo hồ sơ ký duyệt</CardTitle>
          <p className="text-sm text-slate-500">Hồ sơ sẽ được gửi tới Kế toán viên trước.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Tiêu đề hồ sơ</label>
              <Input name="title" required placeholder="VD: Bảng lương tháng 06/2026" />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Loại hồ sơ</label>
                <select name="type" className="h-10 w-full rounded-md border px-3 text-sm">
                  <option value="salary">Bảng lương</option>
                  <option value="fee">Bảng phí</option>
                  <option value="payment">Đề nghị thanh toán</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Kỳ/Tháng</label>
                <Input name="period" required placeholder="06/2026" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Số tiền</label>
                <Input name="amount" required type="number" placeholder="250000000" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">File PDF cần ký</label>
              <Input name="demoFiles" type="file" accept="application/pdf,.pdf" multiple required />
              <p className="mt-1 text-xs text-slate-500">Mỗi cấp duyệt sẽ chèn chữ ký vào trang cuối. Bản demo giới hạn 15 MB/file.</p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <label className="mb-1 block text-sm font-medium">Họ tên Người trình</label>
              <Input name="submitterName" className="mb-3 bg-white" placeholder={getCurrentUser().name} />
              <label className="mb-1 block text-sm font-medium">Chữ ký Người trình</label>
              <SignaturePad onChange={setSignatureImage} />
              <div className="my-3 flex items-center gap-2 text-xs text-slate-400">
                <span className="h-px flex-1 bg-emerald-200" />
                hoặc tải ảnh chữ ký
                <span className="h-px flex-1 bg-emerald-200" />
              </div>
              <input className="block w-full text-xs" type="file" accept="image/png,image/jpeg" onChange={(event) => readSignature(event.target.files?.[0])} />
              <p className="mt-2 text-xs text-slate-500">Chữ ký sẽ được chèn vào cột Người trình trên trang cuối.</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Ghi chú</label>
              <Textarea name="note" placeholder="Nội dung trình duyệt..." />
            </div>
            {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <Button disabled={loading || !signatureImage}>{loading ? "Đang ký và lưu..." : "Ký và gửi duyệt"}</Button>
          </form>
        </CardContent>
      </Card>
    </AppShell>
  );
}
