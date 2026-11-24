import { AuthGate } from "@/components/auth-gate";
import { Shell } from "@/components/shell";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <AuthGate>
      <Shell>{children}</Shell>
    </AuthGate>
  );
}
