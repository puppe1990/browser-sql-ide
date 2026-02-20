import { NextResponse } from 'next/server';
import { getSessionUser, SESSION_COOKIE_NAME } from '@/lib/auth';

type UserRow = {
  id: number;
  email: string;
  name: string | null;
};

export async function GET(request: Request) {
  const sessionId = request.headers
    .get('cookie')
    ?.split('; ')
    .find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.split('=')[1];

  const user = await getSessionUser(sessionId);

  if (!user) {
    return NextResponse.json({ user: null });
  }

  const userRecord = user as unknown as UserRow;
  return NextResponse.json({
    user: {
      id: userRecord.id,
      email: userRecord.email,
      name: userRecord.name,
    },
  });
}
