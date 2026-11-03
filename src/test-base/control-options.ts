import type { Locator } from '@playwright/test';

/** Anything that owns a root locator a child control can be scoped to (a page object or another control). */
export interface ControlParent {
  readonly control: Locator;
}

export interface ControlOptions {
  /** Scope for the control's locator. Without a parent the control is located on the whole page. */
  parent?: ControlParent | null;
}

/**
 * How a control is located: a `test-id` string (preferred for interactive elements and asserted values)
 * or a role-based `Locator` built from `page` (display elements such as headings and alerts).
 * Both are resolved inside the parent's root.
 */
export type ControlSelector = string | Locator;
