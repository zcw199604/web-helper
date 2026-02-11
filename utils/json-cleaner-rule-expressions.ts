const ARRAY_INDEX_SEGMENT_RE = /\[(\d+)\]/g;
const SIMPLE_KEY_RE = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

export type JsonCleanExtractMode = 'generalized' | 'precise';

export function buildJsonCleanPropertyExpression(rawPropertyName: string): string {
  const propertyName = rawPropertyName.trim();
  if (!propertyName) {
    return '';
  }

  if (SIMPLE_KEY_RE.test(propertyName)) {
    return `$..${propertyName}`;
  }

  return `$..[${JSON.stringify(propertyName)}]`;
}

export function upsertJsonCleanExtractedProperty(
  currentExpressions: ReadonlyArray<string>,
  rawPropertyName: string,
): string[] {
  const propertyExpression = buildJsonCleanPropertyExpression(rawPropertyName);
  if (!propertyExpression) {
    return normalizeJsonCleanExpressions(currentExpressions);
  }

  return mergeJsonCleanExpressions(currentExpressions, [propertyExpression]);
}

export function normalizeJsonCleanPathForExtraction(path: string): string {
  const trimmedPath = path.trim();
  if (!trimmedPath) {
    return '';
  }

  return trimmedPath.replace(ARRAY_INDEX_SEGMENT_RE, '[*]');
}

export function upsertJsonCleanExtractedPath(
  currentExpressions: ReadonlyArray<string>,
  rawPath: string,
  mode: JsonCleanExtractMode = 'generalized',
): string[] {
  const precisePath = rawPath.trim();
  if (!precisePath) {
    return normalizeJsonCleanExpressions(currentExpressions);
  }

  const generalizedPath = normalizeJsonCleanPathForExtraction(precisePath);

  if (generalizedPath === precisePath) {
    return mergeJsonCleanExpressions(currentExpressions, [precisePath]);
  }

  const normalizedCurrent = normalizeJsonCleanExpressions(currentExpressions);
  const hasGeneralized = normalizedCurrent.includes(generalizedPath);
  const hasPrecise = normalizedCurrent.includes(precisePath);

  let effectiveMode = mode;
  if (mode === 'generalized') {
    if (hasGeneralized) {
      effectiveMode = 'precise';
    } else if (hasPrecise) {
      effectiveMode = 'generalized';
    }
  }

  const filteredCurrent = normalizedCurrent.filter(
    (expression) => expression !== precisePath && expression !== generalizedPath,
  );
  const targetExpression = effectiveMode === 'precise' ? precisePath : generalizedPath;
  return mergeJsonCleanExpressions(filteredCurrent, [targetExpression]);
}

export function normalizeJsonCleanExpressions(expressions: ReadonlyArray<string>): string[] {
  const deduplicatedExpressions: string[] = [];
  const seen = new Set<string>();

  for (const rawExpression of expressions) {
    if (typeof rawExpression !== 'string') {
      continue;
    }

    const expression = rawExpression.trim();
    if (!expression || seen.has(expression)) {
      continue;
    }

    seen.add(expression);
    deduplicatedExpressions.push(expression);
  }

  return deduplicatedExpressions;
}

export function parseJsonCleanExpressionsText(text: string): string[] {
  return normalizeJsonCleanExpressions(text.split(/\r?\n/));
}

export function mergeJsonCleanExpressions(
  currentExpressions: ReadonlyArray<string>,
  incomingExpressions: ReadonlyArray<string>,
): string[] {
  return normalizeJsonCleanExpressions([...currentExpressions, ...incomingExpressions]);
}

export function mergeJsonCleanExpressionsText(text: string, incomingExpressions: ReadonlyArray<string>): string {
  const merged = mergeJsonCleanExpressions(parseJsonCleanExpressionsText(text), incomingExpressions);
  return merged.join('\n');
}
