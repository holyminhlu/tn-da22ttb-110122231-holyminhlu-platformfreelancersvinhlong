export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div id="main-content" className="flex w-full flex-1 flex-col">
        {children}
      </div>
    </div>
  );
}
