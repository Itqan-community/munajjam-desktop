import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container py-10 grid gap-4">
      <h1 className="text-2xl font-semibold">الصفحة غير موجودة</h1>
      <p className="text-muted-foreground">
        تأكد من الرابط أو عد إلى الصفحة الرئيسية.
      </p>
      <Link href="/" className="text-primary underline w-fit">
        العودة للرئيسية
      </Link>
    </main>
  );
}
