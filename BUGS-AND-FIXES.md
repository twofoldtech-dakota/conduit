# Conduit - Bug Report & Fixes from Local SitecoreAI Testing

Tested against: SitecoreAI (XM Cloud) local Docker development environment using the
`xmcloud-starter-js` starter kit with the local CM Edge GraphQL endpoint at
`https://xmcloudcm.localhost/sitecore/api/graph/edge`.

---

## Bug 1: Contentful adapter crashes on startup due to ESM/CJS import incompatibility

**Severity:** Critical (prevents server from starting, even when not using Contentful)

**Error:**

```
SyntaxError: Named export 'createClient' not found. The requested module 'contentful'
is a CommonJS module, which may not support all module.exports as named exports.
```

**Root Cause:** The `contentful` npm package exports as CommonJS, but the adapter uses
ESM named imports. Since all adapters are eagerly imported in `src/adapters/index.ts`,
this crashes the entire server even when only using a different adapter (e.g., sitecore).

**File:** `src/adapters/contentful.ts`

**Fix:**

```diff
- import { createClient, type ContentfulClientApi, type Entry, type Asset, type ContentType as CFContentType } from 'contentful';
+ import contentful from 'contentful';
+ const { createClient } = contentful;
+ import type { ContentfulClientApi, Entry, Asset, ContentType as CFContentType } from 'contentful';
```

**Recommendation:** Either apply this fix, or consider lazy-loading adapters via dynamic
`import()` in `createAdapter()` so unused adapters don't need to resolve their
dependencies at startup.

---

## Bug 2: Health check query uses a field that doesn't exist on the Edge schema

**Severity:** Medium (health check always reports unhealthy)

**Error:**

```json
{
  "healthy": false,
  "message": "GraphQL error: Cannot query field \"name\" on type \"SiteData\"."
}
```

**Root Cause:** The health check queries `site { name }`, but the Edge GraphQL schema
(both local CM and cloud Experience Edge) exposes `site { siteInfoCollection { name } }`,
not `site { name }` directly.

**File:** `src/adapters/sitecore.ts`, `healthCheck()` method

**Fix:**

```diff
- await this.graphql<{ site: { name: string } }>(`
-   query {
-     site {
-       name
-     }
-   }
- `);
+ await this.graphql<{ site: { siteInfoCollection: Array<{ name: string }> } }>(`
+   query {
+     site {
+       siteInfoCollection {
+         name
+       }
+     }
+   }
+ `);
```

---

## Bug 3: Search queries use `_fulltext` which is not available on local CM Edge

**Severity:** High (search is completely broken on local environments)

**Error:**

```json
{"error": "GraphQL error: The field '_fulltext' is not supported. The list of available
predefined fields: '_name', '_path', '_parent', '_templates', '_hasLayout' and '_language'."}
```

**Root Cause:** The `searchContent()` method uses `_fulltext` as the search field, which
is only available on the cloud Experience Edge endpoint. The local CM Edge endpoint only
supports: `_name`, `_path`, `_parent`, `_templates`, `_hasLayout`, `_language`.

**File:** `src/adapters/sitecore.ts`, `searchContent()` method

**Fix:** Detect whether the endpoint is local or cloud and use the appropriate search field:

```ts
// Add to class properties:
private isLocalEndpoint: boolean = false;

// In initialize():
this.isLocalEndpoint = this.endpoint.includes('localhost') ||
  this.endpoint.includes('.local');

// In searchContent():
const searchField = this.isLocalEndpoint ? '_name' : '_fulltext';
// Then use searchField in the query's where clause
```

**Note:** Using `_name` with `operator: CONTAINS` provides partial name matching, which
is the closest equivalent to fulltext search on the local endpoint. This is a narrower
search than `_fulltext` but is the best available option.

---

## Bug 4: Search queries pass `language` argument which doesn't exist on local CM Edge

**Severity:** High (all search/list queries fail on local environments)

**Error:**

```json
{
  "error": "GraphQL error: Unknown argument \"language\" on field \"search\" of type \"Query\"."
}
```

**Root Cause:** The `listContent()` and `searchContent()` methods pass a `language`
variable to the `search()` GraphQL query. The local CM Edge endpoint does not accept
a `language` argument on the `search` query type.

**File:** `src/adapters/sitecore.ts`, `listContent()` and `searchContent()` methods

**Fix:** Remove the `language` argument from search queries. Language filtering on local
endpoints should be done via the `_language` predefined field in the `where` clause if
needed:

```diff
  search(
    where: { ... }
    first: $first
    after: $after
-   language: $language
-   orderBy: { name: "_updated", direction: DESC }
  )
```

---

## Bug 5: Item queries reference `created`, `updated`, `language` fields that don't exist on local CM Edge

**Severity:** High (content retrieval fails on local environments)

**Error:**

```json
{ "error": "GraphQL error: Cannot query field \"created\" on type \"Item\"." }
```

**Root Cause:** The `Item` type on the local CM Edge GraphQL schema does not have
`created`, `updated`, or `language { name }` fields. These are available on the cloud
Experience Edge but not on the local CM's `/sitecore/api/graph/edge` endpoint.

Created/updated timestamps are available as standard Sitecore fields (`__Created`,
`__Updated`) in the `fields` collection.

**File:** `src/adapters/sitecore.ts`, multiple methods

**Fix:** Remove these fields from all GraphQL queries:

```diff
  results {
    id
    name
    path
    url { path }
    template { id name }
-   created
-   updated
-   language { name }
    fields {
      name
      value
      jsonValue
    }
  }
```

Update the `SitecoreItem` and `SitecoreMediaItem` interfaces to make these optional:

```ts
interface SitecoreItem {
  // ...
  created?: string; // was: created: string
  updated?: string; // was: updated: string
}
```

Update `transformItem()` and `transformMedia()` to provide fallbacks:

```ts
createdAt: item.created || new Date().toISOString(),
updatedAt: item.updated || new Date().toISOString(),
```

---

## Bug 6: Path-based search uses string paths but local CM Edge requires GUIDs

**Severity:** High (content_list, media_list, and schema_list all fail on local environments)

**Error:**

```json
{
  "error": "GraphQL error: The search pattern '/sitecore/content/website' is not a valid GUID"
}
```

**Root Cause:** The `_path` predefined field on the local CM Edge endpoint expects a
Sitecore item GUID (e.g., `0DE95AE441AB4D019EB067441B7C2450`), not a content path
string (e.g., `/sitecore/content`). The cloud Experience Edge accepts path strings.

**File:** `src/adapters/sitecore.ts`, `listContent()`, `listMedia()`, `getContentTypes()`

**Fix:** Add a helper method that resolves a path to its GUID, then use the GUID in
search queries:

```ts
private async resolvePathToId(path: string): Promise<string | null> {
  const data = await this.graphql<SitecoreItemResult>(`
    query ResolvePath($path: String!, $language: String!) {
      item(path: $path, language: $language) {
        id
      }
    }
  `, { path, language: this.defaultLanguage });
  return data.item?.id || null;
}
```

Then in each method that uses `_path` search:

```ts
const rootId = await this.resolvePathToId(rootPath);
if (!rootId) {
  return { items: [], total: 0, skip: 0, limit: first, hasMore: false };
}
// Use rootId instead of rootPath in the search where clause
```

---

## Not a Bug: Sitecore XP adapter (SSC) doesn't work on XM Cloud local instances

**Severity:** N/A (expected behavior, but worth documenting)

**Error:**

```
Error: Sitecore XP authentication failed: 403
```

**Context:** The Sitecore XP adapter authenticates via SSC (Sitecore Services Client) at
`/sitecore/api/ssc/auth/login`. This endpoint returns 403 on XM Cloud CM instances
because XM Cloud uses Auth0/FedAuth for authentication, not the traditional SSC
username/password login.

**Recommendation:** Document in the adapter selection guide that for local XM Cloud /
SitecoreAI development environments, users should use the `sitecore` (XM Cloud) adapter
with a custom `endpoint` pointing to the local CM Edge GraphQL endpoint, not the
`sitecore-xp` adapter:

```yaml
adapter:
  type: sitecore
  credentials:
    apiKey: <your-api-key-from-env-file>
    endpoint: https://xmcloudcm.localhost/sitecore/api/graph/edge
```

---

## Summary

| #   | Bug                                              | Severity | Scope                    |
| --- | ------------------------------------------------ | -------- | ------------------------ |
| 1   | Contentful CJS import crashes all adapters       | Critical | All users on Node.js ESM |
| 2   | Health check queries nonexistent field           | Medium   | All Sitecore users       |
| 3   | `_fulltext` not available on local CM Edge       | High     | Local dev users          |
| 4   | `language` arg not supported on local search     | High     | Local dev users          |
| 5   | `created`/`updated` fields missing on local      | High     | Local dev users          |
| 6   | String paths instead of GUIDs for `_path` search | High     | Local dev users          |

Bugs 3-6 all stem from the same root issue: the local CM Edge GraphQL endpoint
(`/sitecore/api/graph/edge`) has a different schema from the cloud Experience Edge
endpoint (`https://edge.sitecorecloud.io/api/graphql/v1`). A robust fix would be to
detect the endpoint type at initialization (via a probe query or URL heuristic) and
branch the query construction accordingly.
