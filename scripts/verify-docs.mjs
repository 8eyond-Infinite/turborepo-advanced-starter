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

const chapterFiles = new Set([
  'README.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'apps/admin/README.md',
  'apps/client/README.md',
  'apps/server/README.md',
  'apps/server/src/contexts/audit/README.md',
  'apps/server/src/contexts/iam/auth/README.md',
  'apps/server/src/contexts/iam/roles/README.md',
  'apps/server/src/contexts/iam/users/README.md',
  'apps/server/src/contexts/notifications/README.md',
  'docs/architecture.md',
  'docs/development-and-deployment.md',
  'docs/getting-started-path.md',
  'docs/glossary.md',
  'docs/operations-runbook.md',
  'docs/provider-neutral-deployment.md',
  'docs/release-process.md',
  'docs/render-deployment.md',
  'docs/tech-stack.md',
]);

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
  `Documentation verified: ${markdownFiles.length} files, ${chapterFiles.size} chapters/appendices, no broken local links.`,
);
