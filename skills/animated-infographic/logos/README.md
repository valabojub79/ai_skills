# logos/

Drop real brand/tool **SVG** files here, named `<name>.svg` (lowercase). Reference them in a spec
item with `"logo": "<name>"`, e.g. `{ "logo": "github", "label": "GitHub" }`.

- A file here always wins. Get official marks from each brand's press/brand page or a set like
  simple-icons (https://simpleicons.org) — respect each brand's trademark guidelines.
- If no file exists for a name, the skill renders a clean **brand-colored monogram tile** instead
  (built-in colors for: claude, anthropic, openai, gemini, google, meta, llama, microsoft, phi,
  github, gitlab, docker, kubernetes, postgres, python, langchain, qwen, alibaba, huggingface, aws,
  mistral, cohere, nvidia, ollama, vercel, slack). Unknown names fall back to a 2-letter tile in the
  section's accent color.

SVGs should be square-ish and use their own colors (or `currentColor`); they're rendered in a rounded
white tile ~34px (≈18px inside chips).
