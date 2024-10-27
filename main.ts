/**
 * A registry for custom highlights, using the [CSS Custom Highlight
 * API](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API)
 * under the hood.
 *
 * The {@linkcode LocalHighlightRegistry} class is a wrapper around the global
 * [`CSS.highlights`](https://developer.mozilla.org/en-US/docs/Web/API/CSS/highlights_static)
 * API, allowing multiple independent registries to coexist in the same document
 * without risking conflicts.
 *
 * @example Showing some text with a given color
 * ```typescript
 * const registry = new LocalHighlightRegistry();
 *
 * const range = new Range();
 * range.setStart(node1, offset1);
 * range.setEnd(node2, offset2);
 *
 * registry.add("hello-world", range);
 * ```
 * ```css
 * ::highlight(hello-world) {
 *   color: red;
 * }
 * ```
 *
 * @example Two registries registering highlights with the same name.
 *
 * The following example will highlight `Hello` in the first `<div>` in red, and
 * `world` in the second `<div>` in yellow.
 *
 * ```html
 * <div id="node1">Hello, world!</div>
 * <div id="node2">Hello, world!</div>
 * ```
 * ```css
 * #node1 ::highlight(hello-world) {
 *   background: red;
 * }
 * #node2 ::highlight(hello-world) {
 *   background: yellow;
 * }
 * ```
 * ```typescript
 * {
 *  const registry1 = new LocalHighlightRegistry();
 *
 *  const range = new Range();
 *  range.setStart(node1, 0);
 *  range.setEnd(node1, 5);
 *
 *  registry.add("hello-world", range);
 * }
 * {
 *  const registry2 = new LocalHighlightRegistry();
 *
 *  const range = new Range();
 *  range.setStart(node2, 7);
 *  range.setEnd(node2, 12);
 *
 *  registry2.add("hello-world", range);
 * }
 * ```
 *
 * If later the code using `registry2` decides to remove all its highlights
 * marked as `hello-world`, the highlights registered by `registry1` will not
 * be affected. i.e. when running the following code:
 * ```typescript
 * registry2.deleteAll("hello-world");
 * ```
 *
 * will result in the `<div>` still containing `Hello` highlighted in red,
 * while the second `<div>` will contain no highlights.
 *
 * @module
 */

/**
 * A scoped registry for custom highlights.
 */
export class LocalHighlightRegistry {
  #ranges: Map<string, Set<Range>> = new Map();

  /**
   * Mark a {@linkcode Range} object, describing a range of text in the document,
   * with a given `Highlight` name. The range can then be styled using the CSS
   * [`::highlight(<name>)`](https://developer.mozilla.org/en-US/docs/Web/CSS/::highlight)
   * pseudo-element.
   *
   * @param name The name of the highlight.
   * @param range The {@linkcode Range} to highlight.
   * @param priority An optional priority for the highlight. See
   *                 [`Highlight#priority`](https://developer.mozilla.org/en-US/docs/Web/API/Highlight/priority)
   *                 for more info. If the global
   *                 [`CSS.highlights`](https://developer.mozilla.org/en-US/docs/Web/API/CSS/highlights_static)
   *                 registry already contains a highlight with the same name and different
   *                 priority, this parameter will be ignored.
   * @returns `true` if the highlight was successfully added, `false` if it was already present in
   *          this registry.
   *
   * @throws {Error} If the {@linkcode Range} object has already been registered as an highlight
   *                 elsewhere, either by a separate {@linkcode LocalHighlightRegistry} or by direct
   *                 usage of the
   *                 [`CSS.highlights`](https://developer.mozilla.org/en-US/docs/Web/API/CSS/highlights_static)
   *                 API.
   *                 To prevent the error, you can use
   *                 [`range.cloneRange()`](https://developer.mozilla.org/en-US/docs/Web/API/Range/cloneRange)
   *                 to get a new {@linkcode Range} object representing the same range.
   */
  add(name: string, range: Range, priority: number = 0): boolean {
    let set = this.#ranges.get(name);
    if (set == null) {
      this.#ranges.set(name, set = new Set());
    } else if (set.has(range)) {
      return false;
    }

    let globalHighlight = CSS.highlights.get(name);
    if (globalHighlight == null) {
      CSS.highlights.set(name, globalHighlight = new Highlight());
      globalHighlight.priority = priority;
    } else {
      if (globalHighlight.has(range)) {
        throw new Error(
          "This range has been already registered as an highlight elsewhere.",
        );
      }
      if (globalHighlight.priority !== priority) {
        console.warn(
          `The label ${name} has already been registered elsewhere with priority ` +
            `${globalHighlight.priority}, but is being used with priority ${priority} here.`,
        );
      }
    }

    set.add(range);
    globalHighlight.add(range);

    return true;
  }

  /**
   * Check if a given {@linkcode Range} object is already registered as a highlight
   * with the given name, in this registry.
   *
   * @param name The name of the highlight.
   * @param range The {@linkcode Range} to check.
   * @returns `true` if the range is already registered as a highlight with the given name,
   *          `false` otherwise.
   */
  has(name: string, range: Range): boolean {
    const set = this.#ranges.get(name);
    if (set == null) return false;
    return set.has(range);
  }

  /**
   * Remove a given {@linkcode Range} object from the highlight with the given name. If the range is
   * not present in this registry, this method does nothing.
   *
   * @param name The name of the highlight.
   * @param range The {@linkcode Range} to remove.
   * @returns `true` if the range was successfully removed, `false` if it was not present in this
   *           registry.
   */
  delete(name: string, range: Range): boolean {
    const set = this.#ranges.get(name);
    if (set == null || !set.has(range)) {
      return false;
    }
    set.delete(range);
    if (set.size === 0) this.#ranges.delete(name);

    const globalHighlight = CSS.highlights.get(name);
    if (globalHighlight == null || !globalHighlight.has(range)) {
      console.warn("This range has already been deleted elsewhere.");
    } else {
      globalHighlight.delete(range);
    }

    return true;
  }

  /**
   * Remove all {@linkcode Range} objects register by this registry with the given name.
   *
   * @param name The name of the highlights to remove.
   * @returns `true` if any ranges were removed, `false` otherwise.
   */
  deleteAll(name: string): boolean {
    const set = this.#ranges.get(name);
    if (set == null) return false;

    let warn = false;
    const globalHighlight = CSS.highlights.get(name);
    if (globalHighlight == null) {
      warn = true;
    } else {
      for (const range of set) {
        warn = !globalHighlight.delete(range);
      }
    }
    if (warn) {
      console.warn(
        `One or more ${name} ranges owned by this LocalHighlightRegistry have already been ` +
          `deleted elsewhere.`,
      );
    }

    this.#ranges.delete(name);
    return true;
  }

  /**
   * Remove all {@linkcode Range} objects registered by this registry.
   */
  clear(): void {
    for (const name of this.#ranges.keys()) this.deleteAll(name);
  }
}
