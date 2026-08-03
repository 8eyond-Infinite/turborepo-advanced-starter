import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

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

  it('keeps application code independent from infrastructure and presentation', () => {
    const applicationFiles = collectTypeScriptFiles(
      join(sourceRoot, 'contexts'),
    ).filter((file) => file.includes(`${join('', 'application')}`));
    const violations = applicationFiles.flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      const forbiddenImport =
        /from ['"][^'"]*(infrastructure|presentation)[^'"]*['"]/g;
      return [...source.matchAll(forbiddenImport)].map(
        (match) => `${file}: ${match[0]}`,
      );
    });

    expect(violations).toEqual([]);
  });

  it('uses one unambiguous placement and suffix for outbound ports', () => {
    const contextFiles = collectTypeScriptFiles(join(sourceRoot, 'contexts'));
    const invalidDomainPorts = contextFiles
      .filter((file) => file.includes(join('domain', 'ports')))
      .filter((file) => !basename(file).endsWith('.repository.ts'));
    const invalidApplicationPorts = contextFiles
      .filter((file) => file.includes(join('application', 'ports')))
      .filter((file) => !basename(file).endsWith('.port.ts'));

    expect(invalidDomainPorts).toEqual([]);
    expect(invalidApplicationPorts).toEqual([]);
  });

  it('keeps shared domain abstractions on one canonical import path', () => {
    const sharedDomainFiles = collectTypeScriptFiles(
      join(sourceRoot, 'shared', 'domain'),
    );

    expect(
      sharedDomainFiles.filter((file) => file.includes(join('domain', 'base'))),
    ).toEqual([]);
  });

  it('names each bounded-context composition root after its directory', () => {
    const moduleFiles = collectTypeScriptFiles(
      join(sourceRoot, 'contexts'),
    ).filter((file) => file.endsWith('.module.ts'));
    const violations = moduleFiles.filter((file) => {
      const contextName = basename(dirname(file));
      return basename(file) !== `${contextName}.module.ts`;
    });

    expect(violations).toEqual([]);
  });
});
