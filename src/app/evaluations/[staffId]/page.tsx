import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/serverAuth';
import { dbGetFiscalPeriods } from '@/lib/db/serverDb';
import { EvaluationWorkspace } from '@/components/evaluation/EvaluationWorkspace';
import type { EvaluationRoundStatus } from '@/lib/data/schoolData';

export const dynamic = 'force-dynamic';

interface EvaluationPageProps {
  params: Promise<{
    staffId: string;
  }>;
  searchParams: Promise<{
    year?: string;
    round?: string;
  }>;
}

export default async function EvaluationPage({
  params,
  searchParams,
}: EvaluationPageProps) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect('/login');
  }

  const { staffId } = await params;
  const sParams = await searchParams;

  const periods = await dbGetFiscalPeriods('30030099').catch(() => []);
  const activePeriod = periods.find((p) => p.isActive) || periods[0] || null;

  const fiscalYear = sParams.year
    ? parseInt(sParams.year, 10)
    : activePeriod?.fiscalYearTh || 2570;
  const roundNumber = sParams.round
    ? parseInt(sParams.round, 10)
    : activePeriod?.roundNo || 1;

  const selectedPeriod =
    periods.find((p) => p.fiscalYearTh === fiscalYear && p.roundNo === roundNumber) ||
    activePeriod;

  const roundStatus: EvaluationRoundStatus = selectedPeriod
    ? selectedPeriod.isLocked || selectedPeriod.evaluationStatus === 'locked'
      ? 'locked'
      : selectedPeriod.evaluationStatus === 'open'
      ? 'open'
      : 'auto'
    : 'auto';

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#0f172a]">
      <EvaluationWorkspace
        staffId={staffId}
        fiscalYear={fiscalYear}
        roundNumber={roundNumber}
        currentUser={sessionUser}
        roundStatus={roundStatus}
        selectedPeriod={selectedPeriod}
      />
    </main>
  );
}
