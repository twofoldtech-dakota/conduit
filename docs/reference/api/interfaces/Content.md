[**conduit-mcp**](../README.md)

---

[conduit-mcp](../globals.md) / Content

# Interface: Content

Core content types used across all CMS adapters.
These provide a unified interface regardless of the underlying CMS.

## Properties

### \_raw?

> `optional` **\_raw**: `unknown`

Raw response from CMS (for debugging/advanced use)

---

### author?

> `optional` **author**: [`Author`](Author.md)

Author information

---

### createdAt

> **createdAt**: `string`

ISO 8601 creation timestamp

---

### fields

> **fields**: `Record`\<`string`, `unknown`\>

The actual content fields (CMS-specific structure)

---

### id

> **id**: `string`

Unique identifier within the CMS

---

### locale?

> `optional` **locale**: `string`

Locale/language code

---

### publishedAt?

> `optional` **publishedAt**: `string`

ISO 8601 publication timestamp (if published)

---

### slug?

> `optional` **slug**: `string`

URL-friendly identifier

---

### status

> **status**: [`ContentStatus`](../type-aliases/ContentStatus.md)

Publication status

---

### title

> **title**: `string`

Human-readable title or name

---

### type

> **type**: `string`

Content type/model name

---

### updatedAt

> **updatedAt**: `string`

ISO 8601 last update timestamp
