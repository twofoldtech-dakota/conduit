[**conduit-mcp**](../README.md)

---

[conduit-mcp](../globals.md) / UmbracoAdapter

# Class: UmbracoAdapter

Base class providing default implementations for optional operations.
Adapters can extend this to reduce boilerplate.

## Extends

- [`BaseAdapter`](BaseAdapter.md)

## Constructors

### Constructor

> **new UmbracoAdapter**(): `UmbracoAdapter`

#### Returns

`UmbracoAdapter`

#### Inherited from

[`BaseAdapter`](BaseAdapter.md).[`constructor`](BaseAdapter.md#constructor)

## Properties

### capabilities

> `readonly` **capabilities**: [`AdapterCapabilities`](../interfaces/AdapterCapabilities.md)

What operations this adapter supports

#### Overrides

[`BaseAdapter`](BaseAdapter.md).[`capabilities`](BaseAdapter.md#capabilities)

---

### displayName

> `readonly` **displayName**: `"Umbraco"` = `'Umbraco'`

Human-readable display name

#### Overrides

[`BaseAdapter`](BaseAdapter.md).[`displayName`](BaseAdapter.md#displayname)

---

### name

> `readonly` **name**: `"umbraco"` = `'umbraco'`

Unique identifier for this adapter type

#### Overrides

[`BaseAdapter`](BaseAdapter.md).[`name`](BaseAdapter.md#name)

## Methods

### createContent()

> **createContent**(`_input`): `Promise`\<[`Content`](../interfaces/Content.md)\>

Create new content.

#### Parameters

##### \_input

[`ContentCreateInput`](../interfaces/ContentCreateInput.md)

#### Returns

`Promise`\<[`Content`](../interfaces/Content.md)\>

#### Throws

if capabilities.create is false

#### Overrides

[`BaseAdapter`](BaseAdapter.md).[`createContent`](BaseAdapter.md#createcontent)

---

### deleteContent()

> **deleteContent**(`_id`): `Promise`\<`void`\>

Delete content.

#### Parameters

##### \_id

`string`

#### Returns

`Promise`\<`void`\>

#### Throws

if capabilities.delete is false

#### Overrides

[`BaseAdapter`](BaseAdapter.md).[`deleteContent`](BaseAdapter.md#deletecontent)

---

### dispose()

> **dispose**(): `Promise`\<`void`\>

Clean up resources when shutting down.

#### Returns

`Promise`\<`void`\>

#### Overrides

[`BaseAdapter`](BaseAdapter.md).[`dispose`](BaseAdapter.md#dispose)

---

### getContent()

> **getContent**(`id`, `locale?`): `Promise`\<[`Content`](../interfaces/Content.md) \| `null`\>

Get a single content item by ID.

#### Parameters

##### id

`string`

##### locale?

`string`

#### Returns

`Promise`\<[`Content`](../interfaces/Content.md) \| `null`\>

#### Overrides

[`BaseAdapter`](BaseAdapter.md).[`getContent`](BaseAdapter.md#getcontent)

---

### getContentType()

> **getContentType**(`id`): `Promise`\<[`ContentType`](../interfaces/ContentType.md) \| `null`\>

Get a specific content type by ID.

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`ContentType`](../interfaces/ContentType.md) \| `null`\>

#### Overrides

[`BaseAdapter`](BaseAdapter.md).[`getContentType`](BaseAdapter.md#getcontenttype)

---

### getContentTypes()

> **getContentTypes**(): `Promise`\<[`ContentType`](../interfaces/ContentType.md)[]\>

Get all content types/models defined in the CMS.

#### Returns

`Promise`\<[`ContentType`](../interfaces/ContentType.md)[]\>

#### Overrides

[`BaseAdapter`](BaseAdapter.md).[`getContentTypes`](BaseAdapter.md#getcontenttypes)

---

### getMedia()

> **getMedia**(`id`): `Promise`\<[`Media`](../interfaces/Media.md) \| `null`\>

Get a single media item by ID.

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`Media`](../interfaces/Media.md) \| `null`\>

#### Throws

if capabilities.media is false

#### Overrides

[`BaseAdapter`](BaseAdapter.md).[`getMedia`](BaseAdapter.md#getmedia)

---

### healthCheck()

> **healthCheck**(): `Promise`\<[`HealthCheckResult`](../interfaces/HealthCheckResult.md)\>

Check if the adapter can connect to the CMS.

#### Returns

`Promise`\<[`HealthCheckResult`](../interfaces/HealthCheckResult.md)\>

#### Overrides

[`BaseAdapter`](BaseAdapter.md).[`healthCheck`](BaseAdapter.md#healthcheck)

---

### initialize()

> **initialize**(`config`): `Promise`\<`void`\>

Initialize the adapter with credentials.
Called once when the server starts.

#### Parameters

##### config

[`AdapterConfig`](../interfaces/AdapterConfig.md)

#### Returns

`Promise`\<`void`\>

#### Overrides

[`BaseAdapter`](BaseAdapter.md).[`initialize`](BaseAdapter.md#initialize)

---

### listContent()

> **listContent**(`filter?`): `Promise`\<[`PaginatedResponse`](../interfaces/PaginatedResponse.md)\<[`Content`](../interfaces/Content.md)\>\>

List content with optional filters.

#### Parameters

##### filter?

[`ContentFilter`](../interfaces/ContentFilter.md)

#### Returns

`Promise`\<[`PaginatedResponse`](../interfaces/PaginatedResponse.md)\<[`Content`](../interfaces/Content.md)\>\>

#### Overrides

[`BaseAdapter`](BaseAdapter.md).[`listContent`](BaseAdapter.md#listcontent)

---

### listMedia()

> **listMedia**(`filter?`): `Promise`\<[`PaginatedResponse`](../interfaces/PaginatedResponse.md)\<[`Media`](../interfaces/Media.md)\>\>

List media assets.

#### Parameters

##### filter?

###### limit?

`number`

###### skip?

`number`

#### Returns

`Promise`\<[`PaginatedResponse`](../interfaces/PaginatedResponse.md)\<[`Media`](../interfaces/Media.md)\>\>

#### Throws

if capabilities.media is false

#### Overrides

[`BaseAdapter`](BaseAdapter.md).[`listMedia`](BaseAdapter.md#listmedia)

---

### searchContent()

> **searchContent**(`query`, `filter?`): `Promise`\<[`PaginatedResponse`](../interfaces/PaginatedResponse.md)\<[`Content`](../interfaces/Content.md)\>\>

Search content by query string.

#### Parameters

##### query

`string`

##### filter?

[`ContentFilter`](../interfaces/ContentFilter.md)

#### Returns

`Promise`\<[`PaginatedResponse`](../interfaces/PaginatedResponse.md)\<[`Content`](../interfaces/Content.md)\>\>

#### Throws

if capabilities.search is false

#### Overrides

[`BaseAdapter`](BaseAdapter.md).[`searchContent`](BaseAdapter.md#searchcontent)

---

### updateContent()

> **updateContent**(`_id`, `_input`): `Promise`\<[`Content`](../interfaces/Content.md)\>

Update existing content.

#### Parameters

##### \_id

`string`

##### \_input

[`ContentUpdateInput`](../interfaces/ContentUpdateInput.md)

#### Returns

`Promise`\<[`Content`](../interfaces/Content.md)\>

#### Throws

if capabilities.update is false

#### Overrides

[`BaseAdapter`](BaseAdapter.md).[`updateContent`](BaseAdapter.md#updatecontent)
