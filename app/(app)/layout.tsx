import { BottomNav } from "@/components/layout/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (<><div className="mx-auto max-w-md px-5 pb-28 pt-8 md:max-w-2xl">{children}</div><BottomNav /></>);
}
