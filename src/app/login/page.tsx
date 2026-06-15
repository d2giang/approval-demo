"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { setCurrentUser } from "@/lib/storage";
import { Role } from "@/lib/types";
import { roleLabels } from "@/lib/workflow";

const roles: Role[] = ["hro", "accountant", "chief_accountant", "cfo", "admin"];

export default function LoginPage() {
  const router = useRouter();

  const login = (role: Role) => {
    setCurrentUser(role);
    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Login giả lập theo vai trò</CardTitle>
          <p className="text-sm text-slate-500">Chọn role để demo quy trình duyệt không cần backend.</p>
        </CardHeader>
        <CardContent className="grid gap-3">
          {roles.map((role) => (
            <Button key={role} onClick={() => login(role)} className="justify-start">
              Đăng nhập: {roleLabels[role]}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
