import { StatsCards } from '@/components/dashboard/stats-cards';
import { PortfolioChart } from '@/components/dashboard/portfolio-chart';
import { TopHoldings } from '@/components/dashboard/top-holdings';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard | AscendFolio',
  description: 'Your portfolio at a glance.',
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <StatsCards />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PortfolioChart />
        </div>
        <div className="lg:col-span-1">
          <TopHoldings />
        </div>
      </div>
    </div>
  );
}
