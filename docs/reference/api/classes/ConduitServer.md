[**conduit-mcp**](../README.md)

---

[conduit-mcp](../globals.md) / ConduitServer

# Class: ConduitServer

## Constructors

### Constructor

> **new ConduitServer**(`config`): `ConduitServer`

#### Parameters

##### config

###### adapter?

\{ `credentials`: `Record`\<`string`, `unknown`\>; `defaultLocale?`: `string`; `endpoint?`: `string`; `name?`: `string`; `preview`: `boolean`; `type`: `string`; \} = `...`

###### adapter.credentials

`Record`\<`string`, `unknown`\> = `...`

###### adapter.defaultLocale?

`string` = `...`

###### adapter.endpoint?

`string` = `...`

###### adapter.name?

`string` = `...`

###### adapter.preview

`boolean` = `...`

###### adapter.type

`string` = `...`

###### adapters?

`Record`\<`string`, \{ `credentials`: `Record`\<`string`, `unknown`\>; `defaultLocale?`: `string`; `endpoint?`: `string`; `name?`: `string`; `preview`: `boolean`; `type`: `string`; \}\> = `...`

###### middleware?

\{ `audit?`: \{ `enabled`: `boolean`; `level`: `string`; `logFile?`: `string`; \}; `cache?`: \{ `enabled`: `boolean`; `maxSize`: `number`; `ttlMs`: `number`; \}; `rateLimit?`: \{ `enabled`: `boolean`; `maxRequests`: `number`; `windowMs`: `number`; \}; \} = `MiddlewareConfigSchema`

###### middleware.audit?

\{ `enabled`: `boolean`; `level`: `string`; `logFile?`: `string`; \} = `...`

###### middleware.audit.enabled

`boolean` = `...`

###### middleware.audit.level

`string` = `...`

###### middleware.audit.logFile?

`string` = `...`

###### middleware.cache?

\{ `enabled`: `boolean`; `maxSize`: `number`; `ttlMs`: `number`; \} = `...`

###### middleware.cache.enabled

`boolean` = `...`

###### middleware.cache.maxSize

`number` = `...`

###### middleware.cache.ttlMs

`number` = `...`

###### middleware.rateLimit?

\{ `enabled`: `boolean`; `maxRequests`: `number`; `windowMs`: `number`; \} = `...`

###### middleware.rateLimit.enabled

`boolean` = `...`

###### middleware.rateLimit.maxRequests

`number` = `...`

###### middleware.rateLimit.windowMs

`number` = `...`

###### server?

\{ `name`: `string`; `version`: `string`; \} = `...`

###### server.name

`string` = `...`

###### server.version

`string` = `...`

#### Returns

`ConduitServer`

## Methods

### initialize()

> **initialize**(): `Promise`\<`void`\>

Initialize adapters based on config.

#### Returns

`Promise`\<`void`\>

---

### start()

> **start**(): `Promise`\<`void`\>

Start the MCP server.

#### Returns

`Promise`\<`void`\>

---

### stop()

> **stop**(): `Promise`\<`void`\>

Stop the server gracefully.

#### Returns

`Promise`\<`void`\>
