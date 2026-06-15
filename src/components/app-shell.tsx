"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getCurrentUser, getDocuments, setCurrentUser } from "@/lib/storage";
import { canApprove, roleLabels } from "@/lib/workflow";
import { DemoUser, Role } from "@/lib/types";

const roles: Role[] = ["hro", "accountant", "chief_accountant", "cfo", "admin"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const refresh = async () => {
    const current = getCurrentUser();
    setUser(current);
    const documents = await getDocuments();
    setPendingCount(documents.filter((doc) => canApprove(current.role, doc.status)).length);
  };

  useEffect(() => {
    refresh();
    const handleStorageUpdate = () => void refresh();
    window.addEventListener("approval-storage-updated", handleStorageUpdate);
    return () => window.removeEventListener("approval-storage-updated", handleStorageUpdate);
  }, []);

  const changeRole = (role: Role) => {
    setCurrentUser(role);
    void refresh();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/dashboard" className="font-bold">Approval Demo</Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/dashboard" className="rounded-md px-3 py-2 hover:bg-slate-100">Dashboard</Link>
            <Link href="/documents" className="rounded-md px-3 py-2 hover:bg-slate-100">
              Hồ sơ
              {pendingCount > 0 && <span className="ml-2 rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">{pendingCount}</span>}
            </Link>
            <Link href="/documents/new" className="rounded-md px-3 py-2 hover:bg-slate-100">Tạo hồ sơ</Link>
          </nav>
          <div className="flex items-center gap-2">
            <select
              className="h-10 rounded-md border bg-white px-3 text-sm"
              value={user?.role || "hro"}
              onChange={(e) => changeRole(e.target.value as Role)}
            >
              {roles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
            </select>
            <Link href="/login"><Button variant="outline">Đổi login</Button></Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
