# Interactive Release Mode — Design Spec

## Summary

Add `--interactive` (`-i`) flag to `packages/app/scripts/release.mjs` that lets the user manually select which git commits to include in the release changelog and choose the version bump type, instead of auto-generating from all commits.

## Usage

```bash
pnpm run release -- --interactive
pnpm run release -i              # shorthand
pnpm run release -i --dry-run    # preview only
```

## Interaction Flow (3 Phases)

### Phase 1: Commit Selection

After detecting the last git tag, all commits since that tag are displayed as a numbered list. The user types space-separated numbers (supports ranges like `3-7`) to select which commits form the changelog.

**Input rules:**
| Input | Meaning |
|-------|---------|
| `1 3 5` | Select commits #1, #3, #5 |
| `1-5 7 9-11` | Range expansion |
| `a` | Select all |
| (empty) | No commits selected → empty changelog |
| `q` | Abort |

After selection, a preview is shown grouped by conventional-commit category. User confirms (`Y`), edits (`e`), or aborts (`n`).

### Phase 2: Version Bump Selection

Numbered menu:
1. `patch` — 1.5.6 → 1.5.7
2. `minor` — 1.5.6 → 1.6.0
3. `major` — 1.5.6 → 2.0.0
4. Custom version (user types `x.y.z`)

### Phase 3: Execute Standard Release Flow

Passes the user-chosen changelog and version into the existing steps 3–9 of release.mjs: signing check → version sync → APK build → git commit+tag → push → GitHub Release.

## Implementation

**File:** `packages/app/scripts/release.mjs`

**New code:**
- `interactivePickCommits(commits)` — ~50 lines: displays list, reads stdin, parses input, shows preview
- `interactivePickVersion(currentVersion)` — ~30 lines: displays menu, reads stdin, returns bump type or version string

**Modified code:**
- CLI args: add `--interactive` / `-i` to the existing parser (~2 lines)
- Main flow steps 1–2: when `--interactive`, call the new functions instead of the auto-changelog and flag-based version logic (~15 lines)

**Dependencies:** None. Uses `process.stdin` with `readline` module (Node.js built-in).

## Risks

- `readline.createInterface` pauses for input, which may behave unexpectedly in non-TTY environments. Guard: check `process.stdin.isTTY` before entering interactive mode; fall back to error message if not a TTY.
- Large commit lists (50+) may be unwieldy. Acceptable for this project's typical release cadence (10–30 commits).
