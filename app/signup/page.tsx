import Link from "next/link";
import { signUp } from "@/lib/auth/actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="auth-shell">
      <form className="auth-card" action={signUp}>
        <div className="brand">
          <div className="brand-mark">PL</div>
          <div>
            <strong>ProfitLens</strong>
            <span>กำไรจริงและเงินสดจริง</span>
          </div>
        </div>
        <h1>สมัครสมาชิก</h1>
        {error && <p className="auth-error">{error}</p>}
        <label>
          อีเมล
          <input type="email" name="email" required autoFocus />
        </label>
        <label>
          รหัสผ่าน
          <input type="password" name="password" required minLength={8} />
        </label>
        <label>
          ยืนยันรหัสผ่าน
          <input type="password" name="confirmPassword" required minLength={8} />
        </label>
        <button className="primary-button full" type="submit">
          สมัครสมาชิก
        </button>
        <p className="auth-switch">
          มีบัญชีอยู่แล้ว? <Link href="/login">เข้าสู่ระบบ</Link>
        </p>
      </form>
    </main>
  );
}
