import Link from "next/link";
import { signIn } from "@/lib/auth/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="auth-shell">
      <form className="auth-card" action={signIn}>
        <div className="brand">
          <div className="brand-mark">PL</div>
          <div>
            <strong>ProfitLens</strong>
            <span>กำไรจริงและเงินสดจริง</span>
          </div>
        </div>
        <h1>เข้าสู่ระบบ</h1>
        {error && <p className="auth-error">{error}</p>}
        <label>
          อีเมล
          <input type="email" name="email" required autoFocus />
        </label>
        <label>
          รหัสผ่าน
          <input type="password" name="password" required minLength={8} />
        </label>
        <button className="primary-button full" type="submit">
          เข้าสู่ระบบ
        </button>
        <p className="auth-switch">
          ยังไม่มีบัญชี? <Link href="/signup">สมัครสมาชิก</Link>
        </p>
      </form>
    </main>
  );
}
