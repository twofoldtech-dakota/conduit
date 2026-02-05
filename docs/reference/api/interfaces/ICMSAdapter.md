[**conduit-mcp**](../README.md)

---

[conduit-mcp](../globals.md) / ICMSAdapter

# Interface: ICMSAdapter

The main adapter interface. All CMS adapters must implement this.

## Properties

### capabilities

> `readonly` **capabilities**: [`AdapterCapabilities`](AdapterCapabilities.md)

What operations this adapter supports

---

### displayName

> `readonly` **displayName**: `string`

Human-readable display name

---

### name

> `readonly` **name**: `string`

Unique identifier for this adapter type

## Methods

### createContent()

> **createContent**(`input`): `Promise`\<[`Content`](Content.md)\>

Create new content.

#### Parameters

##### input

[`ContentCreateInput`](ContentCreateInput.md)

#### Returns

`Promise`\<[`Content`](Content.md)\>

#### Throws

if capabilities.create is false

---

### deleteContent()

> **deleteContent**(`id`): `Promise`\<`void`\>

Delete content.

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`void`\>

#### Throws

if capabilities.delete is false

---

### dispose()

> **dispose**(): `Promise`\<`void`\>

Clean up resources when shutting down.

#### Returns

`Promise`\<`void`\>

---

### getContent()

> **getContent**(`id`, `locale?`): `Promise`\<[`Content`](Content.md) \| `null`\>

Get a single content item by ID.

#### Parameters

##### id

`string`

##### locale?

`string`

#### Returns

`Promise`\<[`Content`](Content.md) \| `null`\>

---

### getContentType()

> **getContentType**(`id`): `Promise`\<[`ContentType`](ContentType.md) \| `null`\>

Get a specific content type by ID.

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`ContentType`](ContentType.md) \| `null`\>

---

### getContentTypes()

> **getContentTypes**(): `Promise`\<[`ContentType`](ContentType.md)[]\>

Get all content types/models defined in the CMS.

#### Returns

`Promise`\<[`ContentType`](ContentType.md)[]\>

---

### getMedia()

> **getMedia**(`id`): `Promise`\<[`Media`](Media.md) \| `null`\>

Get a single media item by ID.

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`Media`](Media.md) \| `null`\>

#### Throws

if capabilities.media is false

---

### healthCheck()

> **healthCheck**(): `Promise`\<[`HealthCheckResult`](HealthCheckResult.md)\>

Check if the adapter can connect to the CMS.

#### Returns

`Promise`\<[`HealthCheckResult`](HealthCheckResult.md)\>

---

### initialize()

> **initialize**(`config`): `Promise`\<`void`\>

Initialize the adapter with credentials.
Called once when the server starts.

#### Parameters

##### config

[`AdapterConfig`](AdapterConfig.md)

#### Returns

`Promise`\<`void`\>

---

### listContent()

> **listContent**(`filter?`): `Promise`\<[`PaginatedResponse`](PaginatedResponse.md)\<[`Content`](Content.md)\>\>

List content with optional filters.

#### Parameters

##### filter?

[`ContentFilter`](ContentFilter.md)

#### Returns

`Promise`\<[`PaginatedResponse`](PaginatedResponse.md)\<[`Content`](Content.md)\>\>

---

### listMedia()

> **listMedia**(`filter?`): `Promise`\<[`PaginatedResponse`](PaginatedResponse.md)\<[`Media`](Media.md)\>\>

List media assets.

#### Parameters

##### filter?

###### limit?

`number`

###### skip?

`number`

#### Returns

`Promise`\<[`PaginatedResponse`](PaginatedResponse.md)\<[`Media`](Media.md)\>\>

#### Throws

if capabilities.media is false

---

### searchContent()

> **searchContent**(`query`, `filter?`): `Promise`\<[`PaginatedResponse`](PaginatedResponse.md)\<[`Content`](Content.md)\>\>

Search content by query string.

#### Parameters

##### query

`string`

##### filter?

[`ContentFilter`](ContentFilter.md)

#### Returns

`Promise`\<[`PaginatedResponse`](PaginatedResponse.md)\<[`Content`](Content.md)\>\>

#### Throws

if capabilities.search is false

---

### updateContent()

> **updateContent**(`id`, `input`): `Promise`\<[`Content`](Content.md)\>

Update existing content.

#### Parameters

##### id

`string`

##### input

[`ContentUpdateInput`](ContentUpdateInput.md)

#### Returns

`Promise`\<[`Content`](Content.md)\>

#### Throws

if capabilities.update is false
