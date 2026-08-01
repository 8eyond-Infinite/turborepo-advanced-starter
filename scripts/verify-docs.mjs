import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const excludedDirectories = new Set([
  '.git',
  '.next',
  '.turbo',
  'coverage',
  'dist',
  'node_modules',
]);

const collectMarkdown = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) {
      return [];
    }

    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectMarkdown(absolutePath);
    }

    return entry.isFile() && entry.name.endsWith('.md') ? [absolutePath] : [];
  });

const orderedChapterFiles = [
  'README.md',
  'docs/getting-started-path.md',
  'docs/glossary.md',
  'docs/tech-stack.md',
  'docs/architecture.md',
  'apps/server/README.md',
  'apps/admin/README.md',
  'apps/client/README.md',
  'apps/server/src/contexts/iam/auth/README.md',
  'apps/server/src/contexts/iam/users/README.md',
  'apps/server/src/contexts/iam/roles/README.md',
  'apps/server/src/contexts/notifications/README.md',
  'apps/server/src/contexts/audit/README.md',
  'docs/development-and-deployment.md',
  'docs/provider-neutral-deployment.md',
  'docs/deployment-readiness.md',
  'docs/release-process.md',
  'docs/operations-runbook.md',
];
const appendixFiles = ['CONTRIBUTING.md', 'SECURITY.md'];
const chapterFiles = new Set([...orderedChapterFiles, ...appendixFiles]);

const handbook = readFileSync(
  path.join(repositoryRoot, 'docs', 'README.md'),
  'utf8',
);
const handbookDirectory = path.join(repositoryRoot, 'docs');
const discoverableChapters = new Set(
  [...handbook.matchAll(/\[[^\]]+\]\(([^)#]+)(?:#[^)]+)?\)/g)].map((match) =>
    path
      .relative(
        repositoryRoot,
        path.resolve(handbookDirectory, match[1].replace(/^<|>$/g, '')),
      )
      .split(path.sep)
      .join('/'),
  ),
);
const errors = [];
const markdownFiles = collectMarkdown(repositoryRoot);

for (const absoluteFile of markdownFiles) {
  const relativeFile = path
    .relative(repositoryRoot, absoluteFile)
    .split(path.sep)
    .join('/');
  const content = readFileSync(absoluteFile, 'utf8');

  if (!content.startsWith('# ')) {
    errors.push(`${relativeFile}: document must start with one H1 heading`);
  }

  if (
    chapterFiles.has(relativeFile) &&
    !/^> \*\*(Phần|Phụ lục)/m.test(content)
  ) {
    errors.push(`${relativeFile}: missing handbook chapter marker`);
  }

  const chapterNumber = orderedChapterFiles.indexOf(relativeFile) + 1;
  if (
    chapterNumber > 0 &&
    !new RegExp(`^> \\*\\*Phần [IVX]+ · Chương ${chapterNumber} —`, 'm').test(
      content,
    )
  ) {
    errors.push(
      `${relativeFile}: chapter marker must identify chapter ${chapterNumber}`,
    );
  }

  if (chapterNumber > 0) {
    const navigationBlock = content.split('\n').slice(0, 7).join('\n');
    const navigationTargets = new Set(
      [...navigationBlock.matchAll(/\[[^\]]+\]\(([^)#]+)(?:#[^)]+)?\)/g)].map(
        (match) =>
          path
            .relative(
              repositoryRoot,
              path.resolve(
                path.dirname(absoluteFile),
                match[1].replace(/^<|>$/g, ''),
              ),
            )
            .split(path.sep)
            .join('/'),
      ),
    );
    const expectedNeighbors = [
      orderedChapterFiles[chapterNumber - 2],
      orderedChapterFiles[chapterNumber],
    ].filter(Boolean);

    for (const expectedNeighbor of expectedNeighbors) {
      if (!navigationTargets.has(expectedNeighbor)) {
        errors.push(
          `${relativeFile}: navigation must link to adjacent chapter ${expectedNeighbor}`,
        );
      }
    }
  }

  if (
    chapterFiles.has(relativeFile) &&
    relativeFile !== 'README.md' &&
    !discoverableChapters.has(relativeFile)
  ) {
    errors.push(`${relativeFile}: not discoverable from docs/README.md`);
  }

  for (const match of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, '');
    if (/^(https?:\/\/|mailto:|#)/.test(rawTarget)) {
      continue;
    }

    const fileTarget = rawTarget.split('#')[0];
    if (!fileTarget) {
      continue;
    }

    const resolvedTarget = path.resolve(path.dirname(absoluteFile), fileTarget);
    if (!existsSync(resolvedTarget)) {
      errors.push(`${relativeFile}: broken link "${rawTarget}"`);
    }
  }
}

for (const chapterFile of chapterFiles) {
  if (!existsSync(path.join(repositoryRoot, chapterFile))) {
    errors.push(`${chapterFile}: expected handbook chapter is missing`);
  }
}

if (errors.length > 0) {
  console.error(`Documentation verification failed:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}

console.log(
  `Documentation verified: ${markdownFiles.length} files, ${orderedChapterFiles.length} ordered chapters, ${appendixFiles.length} appendices, no broken local links.`,
);
