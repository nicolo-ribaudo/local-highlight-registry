import { test } from "vitest";
import { LocalHighlightRegistry } from "../main.ts"

test("doesn't crash", () => {
  new LocalHighlightRegistry();
});
