import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const sourceRoot = join(__dirname, '..');

const collectTypeScriptFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const absolutePath = join(directory, entry);
    return statSync(absolutePath).isDirectory()
      ? collectTypeScriptFiles(absolutePath)
      : absolutePath.endsWith('.ts') && !absolutePath.endsWith('.spec.ts')
        ? [absolutePath]
        : [];
  });

describe('architecture dependency rules', () => {
  it('keeps bounded-context domain code independent from outer layers', () => {
    const domainFiles = collectTypeScriptFiles(
      join(sourceRoot, 'contexts'),
    ).filter((file) => file.includes(`${join('', 'domain')}`));
    const violations = domainFiles.flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      const forbiddenImport =
        /from ['"][^'"]*(application|infrastructure|presentation)[^'"]*['"]/g;
      return [...source.matchAll(forbiddenImport)].map(
        (match) => `${file}: ${match[0]}`,
      );
    });

    expect(violations).toEqual([]);
  });

  it('keeps shared domain free of delivery technology contracts', () => {
    const sharedDomain = collectTypeScriptFiles(
      join(sourceRoot, 'shared', 'domain'),
    )
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');

    expect(sharedDomain).not.toMatch(/BullMQ|Redis|Socket|WebSocket|Prisma/);
  });
});
