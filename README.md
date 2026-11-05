# JSON Sanitizer

Browser-only; no dependencies or stored input.

1. Paste JSON and select **Sanitize JSON**. Strings become `"string"`, numbers `0`, booleans `false`; null stays null.
2. Search keys, paths, or sanitized values. Select values or whole branches, then **Keep selected**. Parent branches are included automatically; partial checks keep only selected children. Search does not clear selections. Other branches are removed. Arrays compact and paths update.
3. Copy a value's JSONPath with **Copy path**, or copy/download the output.

Keys remain unchanged and may contain sensitive information.

## Local use

Run `python3 -m http.server 8000` and open http://localhost:8000.

Tests: `node --test sanitizer.test.mjs`.
