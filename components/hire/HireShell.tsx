import ClientShell from "@/components/layout/ClientShell";
import HireSubNav from "./HireSubNav";

type HireShellProps = {
  children: React.ReactNode;
};

export default function HireShell({ children }: HireShellProps) {
  return (
    <ClientShell beforeMain={<HireSubNav />} wide>
      {children}
    </ClientShell>
  );
}
