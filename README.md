# JSON Sanitizer

Browser-only; no dependencies or stored input.

1. Paste JSON and select **Sanitize JSON**. Strings become `"string"`, numbers `0`, booleans `false`; null stays null.
2. Select values or whole branches, then **Keep selected**. Other branches are removed. Arrays compact and paths update.
3. Copy a value's JSONPath with **Copy path**, or copy/download the output.

Keys remain unchanged and may contain sensitive information.

## GitHub Pages

Push to `main`. In **Settings → Pages**, choose **GitHub Actions**, then run **Deploy GitHub Pages**. Change the workflow branch if needed.

## Local use

Run `python3 -m http.server 8000` and open http://localhost:8000.

Tests: `node --test sanitizer.test.mjs`.
