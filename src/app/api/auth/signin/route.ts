import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, verifyPassword, createSession, SESSION_COOKIE_NAME, SESSION_DURATION_MS } from '@/lib/auth';
import { parseJsonObjectBody } from '@/lib/request-body';
import { getErrorMessage } from '@/lib/utils';

type SigninPayload = {
  email?: string;
  password?: string;
};

export async function POST(request: NextRequest) {
  try {
    const parsedBody = await parseJsonObjectBody<SigninPayload>(request);
    if (parsedBody.error) {
      return NextResponse.json({ error: parsedBody.error }, { status: parsedBody.status ?? 400 });
    }
    const body = parsedBody.value as SigninPayload;
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const userRecord = user as { id: number; email: string; password_hash: string; name: string | null };
    const isValid = verifyPassword(password, userRecord.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const sessionId = await createSession(userRecord.id);

    const response = NextResponse.json({
      success: true,
      user: {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION_MS / 1000,
      path: '/',
    });

    return response;
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
