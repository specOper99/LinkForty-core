import { auth } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { Providers } from "@/components/providers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <Providers>
      <AppShell operatorName={session?.user?.name}>{children}</AppShell>
    </Providers>
  );
}
