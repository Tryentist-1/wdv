# Cursor Project Rules

This directory contains project-specific rules that guide AI assistant behavior when working on this codebase.

## Rules Overview

### 1. `mobile-first-principles.mdc`
**Scope:** HTML, JS, CSS  
**Purpose:** Ensures all design decisions prioritize mobile experience (99% of users are on phones)

### 2. `tech-stack-constraints.mdc`
**Scope:** JS, HTML, CSS, PHP  
**Purpose:** Enforces technology stack - Vanilla JS only, Tailwind CSS exclusively, no frameworks

### 3. `architecture-patterns.mdc`
**Scope:** JS, PHP, SQL  
**Purpose:** Core architectural principles - database as source of truth, verification workflow, UUIDs, coach gatekeeper

### 4. `coding-standards.mdc`
**Scope:** JS, PHP  
**Purpose:** Code quality standards - JSDoc/PHPDoc requirements, naming conventions, error handling

### 5. `tailwind-styling.mdc`
**Scope:** HTML, JS  
**Purpose:** Tailwind CSS usage rules - no custom CSS, reference style guide, dark mode support

### 6. `database-migrations.mdc`
**Scope:** SQL, PHP  
**Purpose:** Database migration standards - MySQL 5.7+ compatibility, idempotent migrations, UUID usage

### 7. `testing-requirements.mdc`
**Scope:** JS, PHP, HTML  
**Purpose:** Testing requirements - test before deployment, mobile testing, edge cases

### 8. `git-workflow.mdc`
**Scope:** All files  
**Purpose:** Git workflow practices - branch naming, commit messages, safe development

### 9. `project-structure.mdc`
**Scope:** All files  
**Purpose:** Project organization patterns - directory structure, file naming, module integration

## How Rules Work

- Rules automatically apply based on file patterns (`appliesTo` field)
- Each rule includes references to relevant documentation
- Rules are version-controlled and shared with the team
- AI assistants in Cursor will consider these rules when making suggestions

## Adding New Rules

1. Create a new `.mdc` file in this directory
2. Include frontmatter with `description` and `appliesTo` fields
3. Use clear headings and structured content
4. Reference relevant documentation files
5. Test that the rule applies correctly




