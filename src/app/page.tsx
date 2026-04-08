import { getDashboardData } from "@/lib/data";
import { MainAppClient } from "@/components/MainAppClient";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const data = await getDashboardData();
  
  return (
    <main className="flex-1 flex overflow-hidden">
      <MainAppClient initialData={data} />
    </main>
  );
}
