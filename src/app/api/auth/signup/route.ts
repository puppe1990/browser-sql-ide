import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail } from '@/lib/auth';
import { parseJsonObjectBody } from '@/lib/request-body';
import { getErrorMessage } from '@/lib/utils';

type SignupPayload = {
  email?: string;
  password?: string;
  name?: string;
};

export async function POST(request: NextRequest) {
  try {
    const parsedBody = await parseJsonObjectBody<SignupPayload>(request);
    if (parsedBody.error) {
      return NextResponse.json({ error: parsedBody.error }, { status: parsedBody.status ?? 400 });
    }
    const body = parsedBody.value as SignupPayload;
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    const userId = await createUser(email, password, name);
    return NextResponse.json({ success: true, userId }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
