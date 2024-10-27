# LocalHighlightRegistry

A scoped registry for custom highlights, using the [CSS Custom Highlight
API](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API)
under the hood.

The
[LocalHighlightRegistry](https://jsr.io/@nic/local-highlight-registry/doc/~/LocalHighlightRegistry)
class is a wrapper around the global
[`CSS.highlights`](https://developer.mozilla.org/en-US/docs/Web/API/CSS/highlights_static)
API, allowing multiple independent registries to coexist in the same document
without risking conflicts.

See [the documentation](https://jsr.io/@nic/local-highlight-registry/doc) for more info on how
to use and install this package.
