# Approval Demo FE-only

Stack:
- NextJS
- TypeScript
- Tailwind
- shadcn/ui-style components
- localStorage

Storage keys:
- `approval_demo_documents`
- `approval_demo_current_user`

## Run

```bash
npm install
npm run dev
```

Open: http://localhost:3000

## Demo flow

1. Login as `Nhân sự / HRO`
2. Create document
3. Switch role to `Kế toán viên` and approve
4. Switch role to `Kế toán trưởng` and approve
5. Switch role to `CFO` and approve final
