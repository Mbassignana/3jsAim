# RALPH Loop: 3jsAim Improvement Implementation

## Project Overview
3jsAim is an FPS aim training game with:
- **Canvas 2D Version**: Self-contained raycasting engine in `index.html`
- **Three.js 3D Version**: Modular architecture in `js/` folder
- **No tests**: Comprehensive test suite needed
- **No build tools**: Modern tooling required

## Your Mission
Implement improvements from `TODO.md` systematically. Each loop iteration should:
1. Select the next unchecked item from TODO.md
2. Implement it completely with tests
3. Mark it as complete in TODO.md
4. Verify all existing tests still pass
5. Commit the changes

## Implementation Guidelines

### Testing Requirements
Every feature MUST have corresponding tests:
- **Unit tests**: Test individual functions/methods in isolation
- **Integration tests**: Test component interactions
- **E2E tests**: Test full user flows (use Playwright)

Test file naming: `tests/[component].test.js` or `tests/[component].test.ts`

### Code Standards
- Use ES6+ syntax (const/let, arrow functions, destructuring)
- Follow existing code style unless refactoring is the task
- Add JSDoc comments for public APIs
- No console.log in production code (use debug flag)

### File Structure After Setup
```
3jsAim/
├── src/                    # Source files (after modularization)
│   ├── game/              # Game logic
│   ├── physics/           # Physics systems
│   ├── ui/                # UI components
│   └── utils/             # Utilities
├── tests/                  # Test files
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── e2e/               # End-to-end tests
├── dist/                   # Built files
├── index.html             # Entry point
├── package.json           # Dependencies
├── vite.config.js         # Build config
├── jest.config.js         # Test config
├── TODO.md                # Progress tracking
└── PROMPT.md              # This file
```

## Iteration Protocol

### Step 1: Read Current State
```bash
# Check TODO.md for next item
cat TODO.md | grep -n "\- \[ \]" | head -5
```

### Step 2: Implement Feature
1. Create/modify necessary files
2. Write tests FIRST (TDD approach)
3. Implement the feature
4. Ensure tests pass

### Step 3: Verify Tests
```bash
npm test                    # Run all tests
npm run test:unit          # Unit tests only
npm run test:e2e           # E2E tests only
```

### Step 4: Update TODO.md
Change `- [ ]` to `- [x]` for completed item
Update progress counter at bottom

### Step 5: Commit Changes
```bash
git add .
git commit -m "feat: [description of implemented feature]"
```

## Priority Order
1. **Items 11-15** (Build tools) - MUST be done first to enable testing
2. **Items 1-10** (Testing) - Foundation for all other work
3. **Items 16-25** (Architecture) - Code quality improvements
4. **Items 26-30** (Performance) - Optimization
5. **Items 31-50** (Features) - New functionality

## Special Instructions

### For Testing Infrastructure (Items 1-10)
When setting up Jest:
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: ['src/**/*.{js,ts}'],
  coverageThreshold: {
    global: { branches: 70, functions: 70, lines: 70 }
  }
};
```

### For Build Setup (Item 11-12)
```json
// package.json scripts
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "jest",
    "test:unit": "jest tests/unit",
    "test:e2e": "playwright test",
    "lint": "eslint src tests",
    "format": "prettier --write ."
  }
}
```

### For TypeScript Conversion (Item 16)
- Convert one file at a time, starting with utilities
- Add `tsconfig.json` with strict mode
- Create type definitions for Three.js and Cannon.js

### For Audio (Items 41-42)
- Use Web Audio API
- Preload sounds during game initialization
- Add fallback for browsers without audio support

## Verification Checklist
Before marking any item complete:
- [ ] Feature works as expected
- [ ] Tests exist and pass
- [ ] No regression in existing tests
- [ ] Code follows project standards
- [ ] TODO.md updated with completion status

## Error Handling
If tests fail:
1. Do NOT skip the failing tests
2. Debug and fix the issue
3. Only proceed when ALL tests pass

If implementation is blocked:
1. Document the blocker in TODO.md
2. Move to next unblocked item
3. Return to blocked item later

## Progress Tracking
After each iteration, update TODO.md:
```markdown
**Progress:** X/50 completed
**Last Updated:** YYYY-MM-DD HH:MM
**Current Focus:** [Item number and description]
**Blockers:** [Any blocking issues]
```

## Commands Reference
```bash
# Start dev server
npm run dev

# Run tests
npm test

# Run specific test file
npm test -- tests/unit/circle.test.js

# Check test coverage
npm test -- --coverage

# Lint code
npm run lint

# Format code
npm run format

# Build for production
npm run build
```

---

**START THE LOOP**: Begin with Item 11 (package.json setup) as all other work depends on having proper tooling in place.
