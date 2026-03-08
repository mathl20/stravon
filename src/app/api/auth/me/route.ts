import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  return NextResponse.json({
    data: {
      id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName,
      role: user.role, company: { id: user.company.id, name: user.company.name },
    },
  });
}
