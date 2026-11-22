import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/serverAuth';
import { EvaluationA4PrintDocument } from '@/components/evaluation/EvaluationA4PrintDocument';

export const dynamic = 'force-dynamic';

interface EvaluationPrintPageProps {
  params: Promise<{
    staffId: string;
  }>;
  searchParams: Promise<{
    year?: string;
    round?: string;
    auto?: string;
  }>;
}

export default async function EvaluationPrintPage({
  params,
  searchParams,
}: EvaluationPrintPageProps) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect('/login');
  }

  const { staffId } = await params;
  const sParams = await searchParams;
  const fiscalYear = parseInt(sParams.year || '2570', 10);
  const roundNumber = parseInt(sParams.round || '1', 10);
  const autoPrint = sParams.auto === 'true' || sParams.auto === '1';

  return (
    <main className="min-h-screen bg-slate-200 dark:bg-slate-900">
      <EvaluationA4PrintDocument
        staffId={staffId}
        fiscalYear={fiscalYear}
        roundNumber={roundNumber}
        autoPrint={autoPrint}
      />
    </main>
  );
}
