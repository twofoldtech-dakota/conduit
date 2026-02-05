[**conduit-mcp**](../README.md)

---

[conduit-mcp](../globals.md) / loadConfig

# Function: loadConfig()

> **loadConfig**(`configPath`): `Promise`\<\{ `adapter?`: \{ `credentials`: `Record`\<`string`, `unknown`\>; `defaultLocale?`: `string`; `endpoint?`: `string`; `name?`: `string`; `preview`: `boolean`; `type`: `string`; \}; `adapters?`: `Record`\<`string`, \{ `credentials`: `Record`\<`string`, `unknown`\>; `defaultLocale?`: `string`; `endpoint?`: `string`; `name?`: `string`; `preview`: `boolean`; `type`: `string`; \}\>; `middleware?`: \{ `audit?`: \{ `enabled`: `boolean`; `level`: `string`; `logFile?`: `string`; \}; `cache?`: \{ `enabled`: `boolean`; `maxSize`: `number`; `ttlMs`: `number`; \}; `rateLimit?`: \{ `enabled`: `boolean`; `maxRequests`: `number`; `windowMs`: `number`; \}; \}; `server?`: \{ `name`: `string`; `version`: `string`; \}; \}\>

Load configuration from a YAML file.

## Parameters

### configPath

`string`

## Returns

`Promise`\<\{ `adapter?`: \{ `credentials`: `Record`\<`string`, `unknown`\>; `defaultLocale?`: `string`; `endpoint?`: `string`; `name?`: `string`; `preview`: `boolean`; `type`: `string`; \}; `adapters?`: `Record`\<`string`, \{ `credentials`: `Record`\<`string`, `unknown`\>; `defaultLocale?`: `string`; `endpoint?`: `string`; `name?`: `string`; `preview`: `boolean`; `type`: `string`; \}\>; `middleware?`: \{ `audit?`: \{ `enabled`: `boolean`; `level`: `string`; `logFile?`: `string`; \}; `cache?`: \{ `enabled`: `boolean`; `maxSize`: `number`; `ttlMs`: `number`; \}; `rateLimit?`: \{ `enabled`: `boolean`; `maxRequests`: `number`; `windowMs`: `number`; \}; \}; `server?`: \{ `name`: `string`; `version`: `string`; \}; \}\>
