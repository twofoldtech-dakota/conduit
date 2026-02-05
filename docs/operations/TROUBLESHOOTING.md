# Troubleshooting

Common issues and how to resolve them.

## Authentication failures

- Contentful: verify `CONTENTFUL_ACCESS_TOKEN`
- Sanity: ensure `SANITY_TOKEN` has correct dataset access
- WordPress: application password must be active

## Rate limiting

- Enable middleware rate limiting to protect CMS APIs
- Increase window or lower concurrency for X-Ray

## Connectivity

- Check outbound firewall rules to CMS endpoints
- Verify TLS and proxy settings

## Performance

- Enable cache middleware
- Use X-Ray tiered scanning for large instances

## Adapter health

- Run `content_health` tool to confirm connectivity

## Logs

- Enable `audit` middleware with `level: debug` during investigation
