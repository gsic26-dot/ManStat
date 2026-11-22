import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/serverAuth';
import { EvaluationWorkspace } from '@/components/evaluation/EvaluationWorkspace';

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
  const fiscalYear = parseInt(sParams.year || '2570', 10);
  const roundNumber = parseInt(sParams.round || '1', 10);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#0f172a]">
      <EvaluationWorkspace
        staffId={staffId}
        fiscalYear={fiscalYear}
        roundNumber={roundNumber}
        currentUser={sessionUser}
      />
    </main>
  );
}
