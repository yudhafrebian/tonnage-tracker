import { LoginForm } from "@/features/auth";
import LoginBrandPanel from "@/features/auth/components/login-brand-panel";

// Layar lebar: panel brand di kiri, form di kanan. HP: hanya form (dengan logo di atasnya).
export default function Home() {
  return (
    <div className="grid min-h-screen flex-1 lg:grid-cols-2">
      <LoginBrandPanel />
      <div className="flex items-center justify-center p-6">
        <LoginForm />
      </div>
    </div>
  );
}
