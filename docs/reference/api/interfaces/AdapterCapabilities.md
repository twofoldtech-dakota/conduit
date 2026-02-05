[**conduit-mcp**](../README.md)

---

[conduit-mcp](../globals.md) / AdapterCapabilities

# Interface: AdapterCapabilities

Capabilities that an adapter may or may not support.
Tools check these before attempting operations.

## Properties

### create

> **create**: `boolean`

Can create new content

---

### delete

> **delete**: `boolean`

Can delete content

---

### localization

> **localization**: `boolean`

Supports multiple locales

---

### media

> **media**: `boolean`

Can manage media/assets

---

### preview

> **preview**: `boolean`

Supports draft/preview mode

---

### search

> **search**: `boolean`

Can perform full-text search

---

### update

> **update**: `boolean`

Can update existing content

---

### versioning

> **versioning**: `boolean`

Supports content versioning

---

### webhooks

> **webhooks**: `boolean`

Supports webhooks for real-time updates
