# Security Policy

## Supported versions

Security fixes are provided for the latest published version of `@postoria/n8n-nodes-postoria`.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Send a report to
`contact@postoria.io` with:

- A description of the issue and its impact
- Reproduction steps or a proof of concept
- The affected package version and n8n version
- Any suggested mitigation

Postoria will acknowledge the report, investigate it, and coordinate disclosure where appropriate.

## Credential and upload safety

The node uses n8n credentials for API-key storage and never writes the key to node output. Temporary
pre-signed media upload URLs are intentionally excluded from errors and execution data.
