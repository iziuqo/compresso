# Security Policy

## Overview

Compresso runs entirely in the browser. It does not make network requests, does not transmit data, and does not store anything outside the page. Images are processed locally using the Canvas API and never leave the user's device.

## Reporting a Vulnerability

If you discover a security vulnerability, please report it privately via email:

**iz.iuqo@gmail.com**

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will respond within 48 hours and work to issue a fix promptly.

## Scope

Since Compresso is a client-side library with no server component, the attack surface is limited. However, we take the following seriously:

- XSS vectors through image processing
- Prototype pollution
- Denial of service through malformed images
- Supply chain security of the npm package
