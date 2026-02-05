# Conduit - Project Instructions for Claude Code

## Bug Tracking Policy

When you encounter a bug, unexpected behavior, or compatibility issue in Conduit during
any task (testing, development, integration, review), you MUST:

1. **Create a GitHub Issue** using `gh issue create` in this repository with:
   - A clear, specific title (e.g., "Sitecore adapter: health check queries nonexistent field `name` on `SiteData`")
   - Label: `bug`
   - Body containing:
     - **Error**: The exact error message or unexpected behavior
     - **Root Cause**: What in the code causes it
     - **File(s)**: Which source files are affected
     - **Reproduction**: Steps or config to trigger the bug
     - **Fix**: The code change that resolves it (as a diff if possible)

2. **Do this immediately** when the bug is encountered, before moving on to workarounds.

3. **Reference the issue** in any code changes you make to fix it.

## Example Issue Body Format

```
## Error
\`\`\`
SyntaxError: Named export 'createClient' not found. The requested module 'contentful'
is a CommonJS module.
\`\`\`

## Root Cause
The `contentful` npm package exports as CommonJS but the adapter uses ESM named imports.
All adapters are eagerly imported in `src/adapters/index.ts`, so this crashes the entire
server even when using a different adapter.

## File(s)
- `src/adapters/contentful.ts`

## Reproduction
1. Configure conduit.yaml with any adapter (e.g., sitecore)
2. Run `node dist/index.js`
3. Server crashes before initialization

## Fix
\`\`\`diff
- import { createClient, type ContentfulClientApi } from 'contentful';
+ import contentful from 'contentful';
+ const { createClient } = contentful;
+ import type { ContentfulClientApi } from 'contentful';
\`\`\`
```
