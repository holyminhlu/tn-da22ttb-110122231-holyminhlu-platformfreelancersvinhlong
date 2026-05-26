import AccountSettingsLayout from "@/components/account/AccountSettingsLayout";

export default function AccountSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AccountSettingsLayout>{children}</AccountSettingsLayout>;
}
