#!/usr/bin/env node
"use strict";

// Simple SPEC artifact validator
// Usage: node spec/validator/validator.js <path-to-json-artifact> [<path-to-another-artifact> ...]

const fs = require('fs');
const path = require('path');

function isJsonFile(p) {
  return typeof p === 'string' && p.toLowerCase().endsWith('.json');
}

function collectJsonFilesFromArg(arg) {
  if (!arg) return [];
  const p = path.resolve(arg);
  if (!fs.existsSync(p)) {
    console.error(`Path not found: ${p}`);
    return [];
  }
  const stat = fs.statSync(p);
  let files = [];
  if (stat.isFile() && isJsonFile(p)) {
    files.push(p);
  } else if (stat.isDirectory()) {
    // Recursively collect all .json files
    const walk = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const child = path.join(dir, e.name);
        if (e.isDirectory()) walk(child);
        else if (e.isFile() && isJsonFile(child)) files.push(child);
      }
    };
    walk(p);
  }
  return files;
}

function validateContent(data) {
  const errors = [];
  if (!data || typeof data !== 'object') {
    errors.push('Root must be a JSON object');
    return errors;
  }
  if (!('spec_version' in data)) {
    errors.push('Missing spec_version');
  } else if (typeof data.spec_version !== 'string') {
    errors.push('spec_version must be a string');
  }
  if (!('spec_id' in data)) {
    errors.push('Missing spec_id');
  } else if (typeof data.spec_id !== 'string') {
    errors.push('spec_id must be a string');
  }
  if (!('alignment_score' in data)) {
    errors.push('Missing alignment_score');
  } else if (typeof data.alignment_score !== 'number') {
    errors.push('alignment_score must be a number');
  } else if (data.alignment_score < 0 || data.alignment_score > 1) {
    errors.push('alignment_score must be between 0 and 1');
  }
  if (!('files_changed' in data)) {
    errors.push('Missing files_changed');
  } else if (!Array.isArray(data.files_changed)) {
    errors.push('files_changed must be an array of file paths');
  }
  if (!('notes' in data)) {
    errors.push('Missing notes');
  } else if (!Array.isArray(data.notes)) {
    errors.push('notes must be an array of strings');
  }
  return errors;
}

function main() {
  const argv = process.argv.slice(2);
  let jsonFiles = [];

  if (argv.length > 0) {
    for (const a of argv) {
      jsonFiles = jsonFiles.concat(collectJsonFilesFromArg(a));
    }
  } else {
    // Default: scan spec/ for any .json artifacts
    jsonFiles = collectJsonFilesFromArg(path.join(process.cwd(), 'spec'));
  }

  // Deduplicate
  jsonFiles = Array.from(new Set(jsonFiles));
  if (jsonFiles.length === 0) {
    console.log('SPEC Validator: no JSON artifacts found to validate.');
    process.exit(0);
  }

  let hadError = false;
  for (const f of jsonFiles) {
    let raw;
    try {
      raw = fs.readFileSync(f, 'utf8');
    } catch (e) {
      console.error(`ERROR reading ${f}: ${e.message}`);
      hadError = true;
      continue;
    }
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      console.error(`ERROR parsing JSON in ${f}: ${e.message}`);
      hadError = true;
      continue;
    }
    const errs = validateContent(data);
    if (errs.length > 0) {
      hadError = true;
      console.error(`Validation FAILED for ${f}:`);
      for (const e of errs) console.error(`  - ${e}`);
    } else {
      console.log(`Validation OK for ${f}`);
    }
  }

  if (hadError) {
    process.exit(1);
  } else {
    console.log('SPEC validation completed successfully for all artifacts.');
    process.exit(0);
  }
}

main();
