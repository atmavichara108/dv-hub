# Backend Error Handling Standards

## Error Responses
- **Format**: `{ error: string, details?: any }`
- **Status Codes**:
  - `400`: Client errors (e.g., validation, invalid input).
  - `500`: Server errors (e.g., database failures).

## Logging
- **Context**: Include `[METHOD] /path - Error: message`.
- **Sensitive Data**: Omit stack traces in production.

## Legacy Support
- Maintain `{ ok: boolean }` for mobile clients (deprecate gradually).