import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/server-auth';

import { DashboardContent } from './dashboard-content';
import type { DashboardUser } from './types';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const dashboardUser: DashboardUser = {
    id: user.id,
    name: user.name ?? null,
    email: user.email ?? null,
    image: user.image ?? null,
  };

  return <DashboardContent user={dashboardUser} />;
}
