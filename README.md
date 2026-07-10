# @postoria/n8n-nodes-postoria

Official n8n community node for publishing, scheduling, and managing social media content with [Postoria](https://postoria.io/).

The package talks directly to the Postoria Public API and uses a Postoria API key. It has no runtime npm dependencies.

## Features

- Publish a post now, schedule it, or add it to a Postoria queue
- Upload n8n binary data through a Postoria pre-signed upload URL
- Import media from a public HTTPS URL
- Wait for media processing to reach `ready` before returning it
- List workspaces, social accounts, queues, and posts
- Cursor pagination for Post `Get Many`
- Workflow-timezone-aware date handling
- Structured Postoria API errors and n8n item linking
- Standard n8n `Continue On Fail` support

## Installation

### n8n self-hosted

In n8n, open **Settings → Community Nodes**, choose **Install**, and enter:

```text
@postoria/n8n-nodes-postoria
```

Restart n8n if your deployment requires it. In queue-mode deployments, make sure the same package version is available to every n8n worker that can execute the workflow.

### n8n Cloud

After the package is approved as a verified community node, install it from the node panel or Community Nodes settings.

## Credentials

1. Open [Postoria Settings](https://app.postoria.io/settings).
2. Create a Public API key.
3. In n8n, create a **Postoria API** credential.
4. Paste the API key and run the credential test.

The node sends the key as:

```http
Authorization: Bearer <API_KEY>
```

n8n stores the value in its credentials system. The node does not log or persist the API key.

## Operations

| Resource       | Operations                          |
| -------------- | ----------------------------------- |
| Post           | Create, Get, Get Many, Delete       |
| Media          | Upload Binary, Import From URL, Get |
| Workspace      | Get Many                            |
| Social Account | Get Many                            |
| Queue          | Get Many                            |

### Post: Create

`Create` supports three publish modes:

- **Publish Now**
- **Schedule**
- **Add to Queue**

The node supports caption, media IDs, link URL, first comment, comment delay, repost settings, YouTube options, and TikTok options. Content type is inferred by Postoria unless an override is configured.

### Media: Upload Binary

The operation reads an n8n binary field, defaulting to `data`, and performs the complete upload flow:

1. Create a Postoria media upload.
2. Upload the binary bytes to the returned pre-signed URL.
3. Complete the upload.
4. Poll the media status every five seconds.
5. Return only after the media status is `ready` and `file_id` is present.

Supported upload types:

- JPEG: `.jpg`, `.jpeg`
- PNG: `.png`
- WebP: `.webp`
- GIF: `.gif`
- MP4: `.mp4`
- QuickTime: `.mov`
- PDF: `.pdf`

The default processing timeout is 600 seconds and can be configured from 5 to 3600 seconds. A processing failure or timeout includes the created `media_id` in the structured error output.

Pre-signed storage URLs are never included in node error output. This prevents temporary storage credentials from being exposed in execution logs when an upload fails.

### Media: Import From URL

The URL must be public and use HTTPS. The node creates the import and waits for the media status to become `ready` using the same polling and timeout behavior as binary upload.

## Date and timezone behavior

Date-time values that already include `Z` or an explicit UTC offset preserve that instant. Local ISO values without an offset are interpreted in the n8n workflow timezone and then sent to Postoria as UTC.

Examples:

```text
2026-08-01T12:00:00+03:00 -> 2026-08-01T09:00:00.000Z
2026-08-01T12:00:00       -> interpreted in the workflow timezone
```

Local times that do not exist because of a daylight-saving time transition are rejected instead of being silently shifted.

## Output behavior

- Post `Get Many` emits one n8n item per post.
- `Return All` follows Postoria cursor pagination until all matching posts are returned.
- `Simplify` returns `id`, `status`, `date`, `queue_id`, and per-account `results`.
- Post `Delete` returns:

```json
{
	"deleted": true,
	"post_id": 123
}
```

When **Continue On Fail** is enabled, an unsuccessful input item returns a structured `error` object. It can contain `code`, `message`, `param`, `details`, `request_id`, `http_code`, and `media_id`.

## Example workflow

An importable scheduling example is available at [`examples/schedule-post.json`](examples/schedule-post.json). Replace the placeholder workspace and social account IDs, then select a Postoria credential.

## Development

Requirements:

- Node.js 22.22.0 or newer
- npm

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run dev
```

Useful scripts:

| Script              | Purpose                                                               |
| ------------------- | --------------------------------------------------------------------- |
| `npm run build`     | Compile TypeScript and copy static node assets                        |
| `npm run lint`      | Run the official n8n community-node lint rules                        |
| `npm run typecheck` | Run strict TypeScript checking without emitting files                 |
| `npm test`          | Build and run Node.js unit tests                                      |
| `npm run dev`       | Start the n8n node development environment                            |
| `npm run release`   | Prepare a release; tagged GitHub Actions runs publish with provenance |

## Publishing and verification

The repository includes:

- Continuous integration for formatting, linting, type checking, build, and tests
- A tag-triggered npm publish workflow
- npm provenance through GitHub Actions OIDC
- No runtime dependencies
- MIT license

Before the first publish, configure npm Trusted Publishing for the GitHub repository and the `publish.yml` workflow, or add a scoped `NPM_TOKEN` repository secret.

## API documentation

- [Postoria Public API reference](https://api.postoria.io/v1/docs/)
- [OpenAPI document](https://api.postoria.io/v1/openapi.json)
- [Postoria Public API help center](https://postoria.io/help-center/postoria-public-api)

## Security

Please report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
