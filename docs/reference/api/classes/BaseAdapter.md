[**conduit-mcp**](../README.md)

---

[conduit-mcp](../globals.md) / BaseAdapter

# Abstract Class: BaseAdapter

Base class providing default implementations for optional operations.
Adapters can extend this to reduce boilerplate.

## Extended by

- [`ContentfulAdapter`](ContentfulAdapter.md)
- [`SanityAdapter`](SanityAdapter.md)
- [`WordPressAdapter`](WordPressAdapter.md)
- [`SitecoreAdapter`](SitecoreAdapter.md)
- [`SitecoreXPAdapter`](SitecoreXPAdapter.md)
- [`UmbracoAdapter`](UmbracoAdapter.md)
- [`OptimizelyAdapter`](OptimizelyAdapter.md)

## Implements

- [`ICMSAdapter`](../interfaces/ICMSAdapter.md)

## Constructors

### Constructor

> **new BaseAdapter**(): `BaseAdapter`

#### Returns

`BaseAdapter`

## Properties

### capabilities

> `abstract` `readonly` **capabilities**: [`AdapterCapabilities`](../interfaces/AdapterCapabilities.md)

What operations this adapter supports

#### Implementation of

[`ICMSAdapter`](../interfaces/ICMSAdapter.md).[`capabilities`](../interfaces/ICMSAdapter.md#capabilities)

---

### displayName

> `abstract` `readonly` **displayName**: `string`

Human-readable display name

#### Implementation of

[`ICMSAdapter`](../interfaces/ICMSAdapter.md).[`displayName`](../interfaces/ICMSAdapter.md#displayname)

---

### name

> `abstract` `readonly` **name**: `string`

Unique identifier for this adapter type

#### Implementation of

[`ICMSAdapter`](../interfaces/ICMSAdapter.md).[`name`](../interfaces/ICMSAdapter.md#name)

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

#### Implementation of

[`ICMSAdapter`](../interfaces/ICMSAdapter.md).[`createContent`](../interfaces/ICMSAdapter.md#createcontent)

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

#### Implementation of

[`ICMSAdapter`](../interfaces/ICMSAdapter.md).[`deleteContent`](../interfaces/ICMSAdapter.md#deletecontent)

---

### dispose()

> `abstract` **dispose**(): `Promise`\<`void`\>

Clean up resources when shutting down.

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`ICMSAdapter`](../interfaces/ICMSAdapter.md).[`dispose`](../interfaces/ICMSAdapter.md#dispose)

---

### getContent()

> `abstract` **getContent**(`id`, `locale?`): `Promise`\<[`Content`](../interfaces/Content.md) \| `null`\>

Get a single content item by ID.

#### Parameters

##### id

`string`

##### locale?

`string`

#### Returns

`Promise`\<[`Content`](../interfaces/Content.md) \| `null`\>

#### Implementation of

[`ICMSAdapter`](../interfaces/ICMSAdapter.md).[`getContent`](../interfaces/ICMSAdapter.md#getcontent)

---

### getContentType()

> `abstract` **getContentType**(`id`): `Promise`\<[`ContentType`](../interfaces/ContentType.md) \| `null`\>

Get a specific content type by ID.

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`ContentType`](../interfaces/ContentType.md) \| `null`\>

#### Implementation of

[`ICMSAdapter`](../interfaces/ICMSAdapter.md).[`getContentType`](../interfaces/ICMSAdapter.md#getcontenttype)

---

### getContentTypes()

> `abstract` **getContentTypes**(): `Promise`\<[`ContentType`](../interfaces/ContentType.md)[]\>

Get all content types/models defined in the CMS.

#### Returns

`Promise`\<[`ContentType`](../interfaces/ContentType.md)[]\>

#### Implementation of

[`ICMSAdapter`](../interfaces/ICMSAdapter.md).[`getContentTypes`](../interfaces/ICMSAdapter.md#getcontenttypes)

---

### getMedia()

> **getMedia**(`_id`): `Promise`\<[`Media`](../interfaces/Media.md) \| `null`\>

Get a single media item by ID.

#### Parameters

##### \_id

`string`

#### Returns

`Promise`\<[`Media`](../interfaces/Media.md) \| `null`\>

#### Throws

if capabilities.media is false

#### Implementation of

[`ICMSAdapter`](../interfaces/ICMSAdapter.md).[`getMedia`](../interfaces/ICMSAdapter.md#getmedia)

---

### healthCheck()

> `abstract` **healthCheck**(): `Promise`\<[`HealthCheckResult`](../interfaces/HealthCheckResult.md)\>

Check if the adapter can connect to the CMS.

#### Returns

`Promise`\<[`HealthCheckResult`](../interfaces/HealthCheckResult.md)\>

#### Implementation of

[`ICMSAdapter`](../interfaces/ICMSAdapter.md).[`healthCheck`](../interfaces/ICMSAdapter.md#healthcheck)

---

### initialize()

> `abstract` **initialize**(`config`): `Promise`\<`void`\>

Initialize the adapter with credentials.
Called once when the server starts.

#### Parameters

##### config

[`AdapterConfig`](../interfaces/AdapterConfig.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`ICMSAdapter`](../interfaces/ICMSAdapter.md).[`initialize`](../interfaces/ICMSAdapter.md#initialize)

---

### listContent()

> `abstract` **listContent**(`filter?`): `Promise`\<[`PaginatedResponse`](../interfaces/PaginatedResponse.md)\<[`Content`](../interfaces/Content.md)\>\>

List content with optional filters.

#### Parameters

##### filter?

[`ContentFilter`](../interfaces/ContentFilter.md)

#### Returns

`Promise`\<[`PaginatedResponse`](../interfaces/PaginatedResponse.md)\<[`Content`](../interfaces/Content.md)\>\>

#### Implementation of

[`ICMSAdapter`](../interfaces/ICMSAdapter.md).[`listContent`](../interfaces/ICMSAdapter.md#listcontent)

---

### listMedia()

> **listMedia**(`_filter?`): `Promise`\<[`PaginatedResponse`](../interfaces/PaginatedResponse.md)\<[`Media`](../interfaces/Media.md)\>\>

List media assets.

#### Parameters

##### \_filter?

###### limit?

`number`

###### skip?

`number`

#### Returns

`Promise`\<[`PaginatedResponse`](../interfaces/PaginatedResponse.md)\<[`Media`](../interfaces/Media.md)\>\>

#### Throws

if capabilities.media is false

#### Implementation of

[`ICMSAdapter`](../interfaces/ICMSAdapter.md).[`listMedia`](../interfaces/ICMSAdapter.md#listmedia)

---

### searchContent()

> **searchContent**(`_query`, `_filter?`): `Promise`\<[`PaginatedResponse`](../interfaces/PaginatedResponse.md)\<[`Content`](../interfaces/Content.md)\>\>

Search content by query string.

#### Parameters

##### \_query

`string`

##### \_filter?

[`ContentFilter`](../interfaces/ContentFilter.md)

#### Returns

`Promise`\<[`PaginatedResponse`](../interfaces/PaginatedResponse.md)\<[`Content`](../interfaces/Content.md)\>\>

#### Throws

if capabilities.search is false

#### Implementation of

[`ICMSAdapter`](../interfaces/ICMSAdapter.md).[`searchContent`](../interfaces/ICMSAdapter.md#searchcontent)

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

#### Implementation of

[`ICMSAdapter`](../interfaces/ICMSAdapter.md).[`updateContent`](../interfaces/ICMSAdapter.md#updatecontent)
