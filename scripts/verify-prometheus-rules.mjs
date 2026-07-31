import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';

const rulesPath = new URL(
  '../deploy/observability/alerts.yml',
  import.meta.url,
);
const document = parse(await readFile(rulesPath, 'utf8'));
const errors = [];
const names = new Set();
const durationPattern = /^\d+(?:ms|s|m|h|d|w|y)$/;

if (!Array.isArray(document?.groups) || document.groups.length === 0) {
  errors.push('groups must be a non-empty array');
}

for (const [groupIndex, group] of (document?.groups ?? []).entries()) {
  const location = `groups[${groupIndex}]`;
  if (typeof group?.name !== 'string' || group.name.trim() === '') {
    errors.push(`${location}.name must be a non-empty string`);
  }
  if (!Array.isArray(group?.rules) || group.rules.length === 0) {
    errors.push(`${location}.rules must be a non-empty array`);
    continue;
  }

  for (const [ruleIndex, rule] of group.rules.entries()) {
    const ruleLocation = `${location}.rules[${ruleIndex}]`;
    if (typeof rule?.alert !== 'string' || rule.alert.trim() === '') {
      errors.push(`${ruleLocation}.alert must be a non-empty string`);
    } else if (names.has(rule.alert)) {
      errors.push(`${ruleLocation}.alert duplicates ${rule.alert}`);
    } else {
      names.add(rule.alert);
    }
    if (typeof rule?.expr !== 'string' || rule.expr.trim() === '') {
      errors.push(`${ruleLocation}.expr must be a non-empty string`);
    }
    if (typeof rule?.for !== 'string' || !durationPattern.test(rule.for)) {
      errors.push(`${ruleLocation}.for must be a Prometheus duration`);
    }
    if (!['warning', 'critical'].includes(rule?.labels?.severity)) {
      errors.push(
        `${ruleLocation}.labels.severity must be warning or critical`,
      );
    }
    for (const annotation of ['summary', 'description']) {
      if (
        typeof rule?.annotations?.[annotation] !== 'string' ||
        rule.annotations[annotation].trim() === ''
      ) {
        errors.push(`${ruleLocation}.annotations.${annotation} is required`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error('Prometheus alert rule validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Prometheus alert rules verified: ${names.size} alerts.`);
