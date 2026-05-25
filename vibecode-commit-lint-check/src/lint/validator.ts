export const CONVENTIONAL_TYPES = [
  'feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test',
  'build', 'ci', 'chore', 'revert'
] as const;
export type ConventionalType = typeof CONVENTIONAL_TYPES[number];

export interface ValidateOptions {
  headerMaxLength?: number;
  allowedTypes?: readonly string[];
  allowedScopes?: readonly string[];
  requireScope?: boolean;
}

export interface ValidationIssue {
  rule: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  parsed?: { type: string; scope?: string; subject: string; breaking: boolean };
  issues: ValidationIssue[];
}

const HEADER_PATTERN = /^(?<type>[a-zA-Z]+)(?:\((?<scope>[^)]+)\))?(?<breaking>!)?:\s(?<subject>.+)$/;

export function validateCommitMessage(raw: string, options: ValidateOptions = {}): ValidationResult {
  const headerMax = options.headerMaxLength ?? 100;
  const allowedTypes = options.allowedTypes ?? CONVENTIONAL_TYPES;
  const issues: ValidationIssue[] = [];

  const message = raw.replace(/\r\n/g, '\n');
  const lines = message.split('\n');
  const header = lines[0] ?? '';

  if (header.length === 0) {
    issues.push({ rule: 'header-empty', severity: 'error', message: 'commit header is empty' });
    return { ok: false, issues };
  }

  if (header.length > headerMax) {
    issues.push({
      rule: 'header-max-length',
      severity: 'error',
      message: `header longer than ${headerMax} chars (${header.length})`
    });
  }

  const match = header.match(HEADER_PATTERN);
  if (!match || !match.groups) {
    issues.push({
      rule: 'header-format',
      severity: 'error',
      message: 'header must follow `type(scope?): subject` (Conventional Commits)'
    });
    return { ok: false, issues };
  }

  const { type, scope, subject } = match.groups;
  const breaking = Boolean(match.groups.breaking);

  if (!allowedTypes.includes(type as ConventionalType)) {
    issues.push({
      rule: 'type-enum',
      severity: 'error',
      message: `type "${type}" not in [${allowedTypes.join(', ')}]`
    });
  }

  if (options.requireScope && !scope) {
    issues.push({ rule: 'scope-empty', severity: 'error', message: 'scope is required' });
  }

  if (scope && options.allowedScopes && !options.allowedScopes.includes(scope)) {
    issues.push({
      rule: 'scope-enum',
      severity: 'error',
      message: `scope "${scope}" not in allowed list`
    });
  }

  if (subject.trim().length === 0) {
    issues.push({ rule: 'subject-empty', severity: 'error', message: 'subject is empty' });
  }

  if (lines.length >= 2 && lines[1].trim().length > 0) {
    issues.push({
      rule: 'body-leading-blank',
      severity: 'error',
      message: 'line 2 of the commit message must be blank (separating header and body)'
    });
  }

  const errors = issues.filter(i => i.severity === 'error').length;
  return { ok: errors === 0, parsed: { type, scope, subject, breaking }, issues };
}

export function formatValidationResult(header: string, result: ValidationResult): string {
  const head = `header: ${header}`;
  if (result.issues.length === 0) {
    return `${head}\n  ok all checks passed`;
  }
  const lines = [head];
  for (const issue of result.issues) {
    const mark = issue.severity === 'error' ? '[X]' : '[!]';
    lines.push(`  ${mark} [${issue.rule}] ${issue.message}`);
  }
  return lines.join('\n');
}
