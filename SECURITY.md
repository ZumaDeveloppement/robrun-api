# Security policy

## Reporting a vulnerability

Please **do not open a public issue**. Report it privately through
[GitHub security advisories](https://github.com/ZumaDeveloppement/robrun-api/security/advisories/new).

Include the request that triggers the problem and what you expected. You will get an answer as soon as possible, and a fix
is released before the details are made public.

## Scope

In scope: anything that exposes private data, bypasses the rate limit or the token on `POST /v1/internal/community`,
crashes the server with a crafted request, or lets a request reach another host (SSRF).

Out of scope: the availability of Steam itself, and misconfiguration of your own deployment (for example publishing it
without HTTPS or leaving `TRUST_PROXY=1` without a proxy in front).

## Supported versions

Only the latest release receives security fixes.
