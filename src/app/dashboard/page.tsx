"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser, getDocuments } from "@/lib/storage";
import { ApprovalDocument } from "@/lib/types";
import { canApprove, statusLabels } from "@/lib/workflow";

export default function DashboardPage() {
  const [docs, setDocs] = useState<ApprovalDocument[]>([]);
  const [pending, setPending] = useState<ApprovalDocument[]>([]);

  useEffect(() => {
    const load = async () => {
      const user = getCurrentUser();
      const data = await getDocuments();
      setDocs(data);
      setPending(data.filter((doc) => canApprove(user.role, doc.status)));
    };
    void load();
  }, []);

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard ký duyệt</h1>
          <p className="text-slate-500">Demo FE-only: hồ sơ và PDF lưu trong IndexedDB của trình duyệt.</p>
        </div>
        <Link href="/documents/new"><Button>Tạo hồ sơ mới</Button></Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Tổng hồ sơ</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{docs.length}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Chờ tôi duyệt</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold text-red-600">{pending.length}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Đã hoàn tất</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{docs.filter(d => d.status === "approved").length}</CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle>Hồ sơ chờ tôi duyệt</CardTitle></CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-sm text-slate-500">Không có hồ sơ nào đang chờ bạn duyệt.</p>
          ) : (
            <div className="space-y-3">
              {pending.map((doc) => (
                <Link key={doc.id} href={`/documents/detail?id=${encodeURIComponent(doc.id)}`} className="block rounded-lg border p-4 hover:bg-slate-50">
                  <div className="font-medium">{doc.code} - {doc.title}</div>
                  <div className="text-sm text-slate-500">{statusLabels[doc.status]} • {doc.amount.toLocaleString("vi-VN")} VNĐ</div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
