"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDocuments } from "@/lib/storage";
import { ApprovalDocument } from "@/lib/types";
import { statusBadgeClass, statusLabels } from "@/lib/workflow";

export default function DocumentsPage() {
  const [docs, setDocs] = useState<ApprovalDocument[]>([]);

  useEffect(() => {
    void getDocuments().then(setDocs);
  }, []);

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Danh sách hồ sơ</h1>
        <Link href="/documents/new"><Button>Tạo hồ sơ</Button></Link>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-3">Mã</th>
              <th className="p-3">Tiêu đề</th>
              <th className="p-3">Kỳ</th>
              <th className="p-3">Số tiền</th>
              <th className="p-3">Trạng thái</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {docs.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-slate-500">Chưa có hồ sơ.</td></tr>
            ) : docs.map((doc) => (
              <tr key={doc.id} className="border-t">
                <td className="p-3 font-medium">{doc.code}</td>
                <td className="p-3">{doc.title}</td>
                <td className="p-3">{doc.period}</td>
                <td className="p-3">{doc.amount.toLocaleString("vi-VN")} VNĐ</td>
                <td className="p-3"><Badge className={statusBadgeClass[doc.status]}>{statusLabels[doc.status]}</Badge></td>
                <td className="p-3 text-right"><Link href={`/documents/detail?id=${encodeURIComponent(doc.id)}`} className="font-medium text-blue-600">Xem</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
