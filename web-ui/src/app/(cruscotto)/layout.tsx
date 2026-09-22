import { BarraLaterale } from '@/components/cruscotto/BarraLaterale';

export default function CruscottoLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex flex-col min-[900px]:flex-row min-h-screen">
      <BarraLaterale />
      <main className="flex-1 min-w-0 p-6">{children}</main>
    </div>
  );
}
