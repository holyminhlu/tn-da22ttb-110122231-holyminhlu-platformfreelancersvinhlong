import ClientShell from "@/components/layout/ClientShell";
import ManageSubNav from "./ManageSubNav";

type ManageShellProps = {
  children: React.ReactNode;
};

export default function ManageShell({ children }: ManageShellProps) {
  return (
    <ClientShell beforeMain={<ManageSubNav />} wide>
      {children}
    </ClientShell>
  );
}
