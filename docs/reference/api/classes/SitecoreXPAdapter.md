[**conduit-mcp**](../README.md)

---

[conduit-mcp](../globals.md) / SitecoreXPAdapter

# Class: SitecoreXPAdapter

Base class providing default implementations for optional operations.
Adapters can extend this to reduce boilerplate.

## Extends

- [`BaseAdapter`](BaseAdapter.md)

## Constructors

### Constructor

> **new SitecoreXPAdapter**(): `SitecoreXPAdapter`

#### Returns

`SitecoreXPAdapter`

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

> `readonly` **displayName**: `"Sitecore XP"` = `'Sitecore XP'`

Human-readable display name

#### Overrides

[`BaseAdapter`](BaseAdapter.md).[`displayName`](BaseAdapter.md#displayname)

---

### name

> `readonly` **name**: `"sitecore-xp"` = `'sitecore-xp'`

Unique identifier for this adapter type

#### Overrides

[`BaseAdapter`](BaseAdapter.md).[`name`](BaseAdapter.md#name)

## Methods

### addRendering()

> **addRendering**(`input`): `Promise`\<`RenderingDefinition`\>

Add a rendering to a page placeholder.

#### Parameters

##### input

`AddRenderingInput`

#### Returns

`Promise`\<`RenderingDefinition`\>

---

### createContent()

> **createContent**(`input`): `Promise`\<[`Content`](../interfaces/Content.md)\>

Create new content.

#### Parameters

##### input

[`ContentCreateInput`](../interfaces/ContentCreateInput.md)

#### Returns

`Promise`\<[`Content`](../interfaces/Content.md)\>

#### Throws

if capabilities.create is false

#### Overrides

[`BaseAdapter`](BaseAdapter.md).[`createContent`](BaseAdapter.md#createcontent)

---

### createDataSource()

> **createDataSource**(`renderingId`, `pageId`, `fields`, `language?`): `Promise`\<[`Content`](../interfaces/Content.md)\>

Create a data source item for a rendering.

#### Parameters

##### renderingId

`string`

##### pageId

`string`

##### fields

`Record`\<`string`, `unknown`\>

##### language?

`string`

#### Returns

`Promise`\<[`Content`](../interfaces/Content.md)\>

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

### getAvailableRenderings()

> **getAvailableRenderings**(): `Promise`\<`object`[]\>

Get available renderings (components) that can be added to pages.

#### Returns

`Promise`\<`object`[]\>

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

### getPageLayout()

> **getPageLayout**(`pageId`, `language?`): `Promise`\<`LayoutData`\>

Get the layout/renderings for a page.

#### Parameters

##### pageId

`string`

##### language?

`string`

#### Returns

`Promise`\<`LayoutData`\>

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

### listRenderings()

> **listRenderings**(`pageId`, `language?`): `Promise`\<`RenderingDefinition`[]\>

List all renderings on a page.

#### Parameters

##### pageId

`string`

##### language?

`string`

#### Returns

`Promise`\<`RenderingDefinition`[]\>

---

### moveRendering()

> **moveRendering**(`pageId`, `renderingUid`, `targetPlaceholder`, `position?`, `language?`): `Promise`\<`void`\>

Move a rendering to a different placeholder or position.

#### Parameters

##### pageId

`string`

##### renderingUid

`string`

##### targetPlaceholder

`string`

##### position?

`number`

##### language?

`string`

#### Returns

`Promise`\<`void`\>

---

### removeRendering()

> **removeRendering**(`pageId`, `renderingUid`, `language?`): `Promise`\<`void`\>

Remove a rendering from a page by its UID.

#### Parameters

##### pageId

`string`

##### renderingUid

`string`

##### language?

`string`

#### Returns

`Promise`\<`void`\>

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

> **updateContent**(`id`, `input`): `Promise`\<[`Content`](../interfaces/Content.md)\>

Update existing content.

#### Parameters

##### id

`string`

##### input

[`ContentUpdateInput`](../interfaces/ContentUpdateInput.md)

#### Returns

`Promise`\<[`Content`](../interfaces/Content.md)\>

#### Throws

if capabilities.update is false

#### Overrides

[`BaseAdapter`](BaseAdapter.md).[`updateContent`](BaseAdapter.md#updatecontent)

---

### updateRendering()

> **updateRendering**(`pageId`, `renderingUid`, `updates`, `language?`): `Promise`\<`RenderingDefinition` \| `null`\>

Update rendering parameters or data source.

#### Parameters

##### pageId

`string`

##### renderingUid

`string`

##### updates

###### dataSource?

`string`

###### parameters?

`Record`\<`string`, `string`\>

##### language?

`string`

#### Returns

`Promise`\<`RenderingDefinition` \| `null`\>
