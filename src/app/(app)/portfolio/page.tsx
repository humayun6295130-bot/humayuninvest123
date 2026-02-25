import { AssetsTable } from "@/components/portfolio/assets-table";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Portfolio | AscendFolio',
  description: 'Manage your investment portfolio.',
};

export default function PortfolioPage() {
  return (
    <div className="space-y-6">
      <AssetsTable />
    </div>
  );
}
