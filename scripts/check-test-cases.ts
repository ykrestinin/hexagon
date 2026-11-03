/**
 * Cross-checks the test-case registry (test-cases/*.feature) against the specs (src/tests/**).
 * Whether a TC is automated is derived from specs, never written down by hand.
 *
 *   node scripts/check-test-cases.ts            report; fails on broken references
 *   node scripts/check-test-cases.ts --strict   also fails when a registered TC is not automated
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const REGISTRY_DIR = join(ROOT, 'test-cases');
const SPECS_DIR = join(ROOT, 'src', 'tests');
const TC_ID = /TC-[A-Z]+-\d{3}/g;

interface TestCase {
  id: string;
  title: string;
  location: string;
}

function walk(dir: string, suffix: string): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(suffix))
    .map((entry) => join(entry.parentPath, entry.name))
    .sort();
}

function readRegistry(errors: string[]): Map<string, TestCase> {
  const cases = new Map<string, TestCase>();
  for (const file of walk(REGISTRY_DIR, '.feature')) {
    let pendingIds: string[] = [];
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, index) => {
        const text = line.trim();
        const location = `${relative(ROOT, file)}:${index + 1}`;
        if (text.startsWith('@')) {
          pendingIds.push(...(text.match(TC_ID) ?? []));
          return;
        }
        const scenario = text.match(/^Scenario(?: Outline)?:\s*(.+)$/);
        if (!scenario) return;
        if (pendingIds.length !== 1) errors.push(`${location}: scenario needs exactly one @TC-ID tag`);
        for (const id of pendingIds) {
          const existing = cases.get(id);
          if (existing) errors.push(`${location}: ${id} is already used at ${existing.location}`);
          else cases.set(id, { id, title: scenario[1], location });
        }
        pendingIds = [];
      });
  }
  return cases;
}

function readSpecReferences(): Map<string, Set<string>> {
  const references = new Map<string, Set<string>>();
  for (const file of walk(SPECS_DIR, '.spec.ts')) {
    for (const [id] of readFileSync(file, 'utf8').matchAll(TC_ID)) {
      references.set(id, (references.get(id) ?? new Set()).add(relative(ROOT, file)));
    }
  }
  return references;
}

const strict = process.argv.includes('--strict');
const errors: string[] = [];
const registry = readRegistry(errors);
const references = readSpecReferences();

for (const [id, files] of references) {
  if (!registry.has(id)) errors.push(`${[...files].join(', ')}: ${id} is not in the test-case registry`);
}

const notAutomated = [...registry.values()].filter((tc) => !references.has(tc.id));
for (const tc of registry.values()) {
  const mark = references.has(tc.id) ? '✓' : '✗';
  console.log(`${mark} ${tc.id}  ${tc.title}`);
}
console.log(`\n${registry.size - notAutomated.length}/${registry.size} test cases automated.`);

if (strict) {
  for (const tc of notAutomated) errors.push(`${tc.location}: ${tc.id} is not automated`);
}
if (errors.length > 0) {
  console.error(`\n${errors.join('\n')}`);
  process.exit(1);
}
