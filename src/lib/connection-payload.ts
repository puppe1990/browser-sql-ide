import { parseJsonObjectBody } from '@/lib/request-body';
import {
  parseConnectionPayloadObject,
  parseMultipartConnectionPayload,
  type ConnectionPayload,
  type ParsedConnectionPayload,
} from '@/lib/connection-payload-parser';

export type { ConnectionPayload, ParsedConnectionPayload };

type JsonRequest = {
  headers: { get: (name: string) => string | null };
  json: () => Promise<unknown>;
  formData: () => Promise<FormData>;
};

export async function readConnectionPayload(request: JsonRequest): Promise<ParsedConnectionPayload> {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    return parseMultipartConnectionPayload(form);
  }

  const parsedObject = await parseJsonObjectBody<Record<string, unknown>>(request);
  if (parsedObject.error) {
    return { error: parsedObject.error, status: parsedObject.status };
  }

  return parseConnectionPayloadObject(parsedObject.value as Record<string, unknown>);
}
