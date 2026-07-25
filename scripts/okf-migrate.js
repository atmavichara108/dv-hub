#!/usr/bin/env node

/**
 * OKF Migration Script — DV Project
 *
 * Adds YAML frontmatter (Open Knowledge Format v0.1) to all .md files
 * in context/DV/ that don't already have it.
 *
 * Usage: node scripts/okf-migrate.js
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, basename, extname } from 'node:path';

const ROOT = new URL('../context/DV', import.meta.url).pathname;
const TODAY = new Date().toISOString().slice(0, 10); // 2026-06-27

// Directories to skip entirely
const SKIP_DIRS = new Set(['temp', 'Templates']);

// Stub files (by relative path from DV/) — too small, skip
const STUB_FILES = new Set([
  'Operations/Metrics.md',
  'Operations/Monetization.md',
  'Operations/Risks and Blockers.md',
]);

// Files that already have frontmatter (known) — will be detected automatically
// but we also skip index.md and log.md
const SKIP_NAMES = new Set(['index.md', 'log.md']);

/**
 * Type map: relative path → OKF type
 */
const TYPE_MAP = {
  // Movement
  'Movement/DV Foundation.md': 'Movement Foundation',

  // Structure
  'Structure/S3 Integration.md': 'Structure Pattern',
  'Structure/Consent.md': 'Protocol',
  'Structure/Lifecycle.md': 'Lifecycle Phase',
  'Structure/Onboarding Scenario.md': 'Protocol',
  'Structure/Cell Anatomy.md': 'Structure Pattern',
  'Structure/Cells Network.md': 'Cell Map',
  'Structure/Cells Map.md': 'Cell Map',
  'Structure/Roles.md': 'Role Definition',
  'Structure/Roles Matrix — Template.md': 'Template',
  'Structure/Cell Passport — Template.md': 'Template',
  'Structure/Agreement Template.md': 'Template',
  'Structure/Driver Template.md': 'Template',
  'Structure/S3 Glossary.md': 'Glossary',
  'Structure/Decision Protocol.md': 'Protocol',
  'Structure/Feedback Protocol.md': 'Protocol',
  'Structure/Proposal Protocol.md': 'Protocol',
  'Structure/Rotation.md': 'Protocol',
  'Structure/Logbook.md': 'Structure Pattern',

  // Community
  'Community/Communications.md': 'Community Process',
  'Community/Events.md': 'Community Process',
  'Community/Members.md': 'Community Process',
  'Community/Onboarding.md': 'Community Process',

  // Content
  'Content/Content Plan.md': 'Content Pipeline',
  'Content/Formats.md': 'Content Pipeline',
  'Content/Media Tools.md': 'Content Pipeline',
  'Content/Publishing Funnel.md': 'Content Pipeline',
  'Content/Topics in Progress.md': 'Content Pipeline',

  // Operations
  'Operations/map_var.md': 'Reference',

  // Research
  'Research/Research Workflow.md': 'Research Workflow',

  // Research / Current Research
  'Research/Current Research/AI and Future.md': 'Research Topic',
  'Research/Current Research/Ecology.md': 'Research Topic',
  'Research/Current Research/Masculine and Feminine.md': 'Research Topic',

  // Site
  'Site/Site Architecture.md': 'Site Architecture',
  'Site/Feature Backlog.md': 'Feature Backlog',
  'Site/UX Notes.md': 'UX Note',
  'Site/Deploy and Infra.md': 'Playbook',
  'Site/S3 Integration.md': 'Structure Pattern',
};

/**
 * Extract title from first # heading, or fall back to filename
 */
function extractTitle(content, fileName) {
  const match = content.match(/^#\s+(.+)$/m);
  if (match) {
    return match[1].trim();
  }
  // Fallback: filename without extension
  return fileName.replace(/\.md$/, '');
}

/**
 * Check if content already has YAML frontmatter (starts with ---)
 */
function hasFrontmatter(content) {
  return content.startsWith('---');
}

/**
 * Check if a file is a stub (too small, just a title)
 */
function isStubFile(relPath) {
  return STUB_FILES.has(relPath);
}

/**
 * Walk directory recursively, yield relative paths of .md files
 */
function* walk(dir, baseDir = ROOT) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relPath = relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walk(fullPath, baseDir);
    } else if (entry.isFile()) {
      // Only .md files
      if (extname(entry.name) !== '.md') continue;
      // Skip index.md and log.md
      if (SKIP_NAMES.has(entry.name)) continue;
      yield relPath;
    }
  }
}

/**
 * Main migration logic
 */
function migrate() {
  let processed = 0;
  let skipped = 0;
  let errors = [];

  for (const relPath of walk(ROOT)) {
    const fullPath = join(ROOT, relPath);

    // Skip stub files
    if (isStubFile(relPath)) {
      console.log(`  SKIP (stub):  ${relPath}`);
      skipped++;
      continue;
    }

    const content = readFileSync(fullPath, 'utf-8');

    // Skip files that already have frontmatter
    if (hasFrontmatter(content)) {
      console.log(`  SKIP (has FM): ${relPath}`);
      skipped++;
      continue;
    }

    // Determine type
    const type = TYPE_MAP[relPath] || 'Task';

    // Extract title
    const fileName = basename(relPath);
    const title = extractTitle(content, fileName);

    // Build frontmatter
    const frontmatter = [
      '---',
      `type: ${type}`,
      `title: ${title}`,
      'description: ""',
      'tags: []',
      `timestamp: ${TODAY}`,
      '---',
    ].join('\n');

    // Prepend frontmatter to content
    const newContent = frontmatter + '\n' + content;

    writeFileSync(fullPath, newContent, 'utf-8');
    console.log(`  OK:    ${relPath} → type: ${type}, title: ${title}`);
    processed++;
  }

  console.log('\n=== Migration Summary ===');
  console.log(`  Processed: ${processed}`);
  console.log(`  Skipped:   ${skipped}`);
  if (errors.length > 0) {
    console.log(`  Errors:    ${errors.length}`);
    for (const err of errors) {
      console.log(`    - ${err}`);
    }
  }
  console.log('========================\n');
}

migrate();
