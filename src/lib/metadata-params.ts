export type MetadataCategory =
  | 'databases'
  | 'schemas'
  | 'schema_objects'
  | 'event_triggers'
  | 'extensions'
  | 'storage'
  | 'system_info'
  | 'roles';

const ALLOWED_CATEGORIES = new Set<MetadataCategory>([
  'databases',
  'schemas',
  'schema_objects',
  'event_triggers',
  'extensions',
  'storage',
  'system_info',
  'roles',
]);

type ParsedMetadataCategory =
  | {
      value: MetadataCategory;
      error?: undefined;
    }
  | {
      value?: undefined;
      error: string;
    };

type ParsedRequiredStringParam =
  | {
      value: string;
      error?: undefined;
    }
  | {
      value?: undefined;
      error: string;
    };

export function parseMetadataCategoryParam(value: unknown): ParsedMetadataCategory {
  if (typeof value !== 'string') {
    return { error: 'Missing or invalid category' };
  }

  const trimmed = value.trim();
  if (!trimmed || !ALLOWED_CATEGORIES.has(trimmed as MetadataCategory)) {
    return { error: 'Missing or invalid category' };
  }

  return { value: trimmed as MetadataCategory };
}

export function parseRequiredStringParam(value: unknown, paramName: string): ParsedRequiredStringParam {
  if (typeof value !== 'string' || !value.trim()) {
    return { error: `Missing ${paramName} parameter` };
  }

  return { value: value.trim() };
}
