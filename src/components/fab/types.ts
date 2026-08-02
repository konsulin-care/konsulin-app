import type { ComponentType } from 'react';

export interface ActionConfig {
  label: string;
  onAction: () => void | Promise<void>;
  icon?: ComponentType<{ className?: string }>;
  disabled?: boolean;
  isSaving?: boolean;
  variant?: FabVariant;
}

export interface SelectionConfig {
  count: number;
  onDelete: () => void;
  onCancel: () => void;
}

export interface MenuAction {
  label: string;
  icon: ComponentType<{ className?: string }>;
  onAction: () => void | Promise<void>;
}

export interface MenuConfig {
  icon: ComponentType<{ className?: string }>;
  actions: readonly MenuAction[];
}

export interface Pill {
  label: string;
  icon: ComponentType<{ className?: string }>;
  delay: number;
  action: PillAction;
  href?: string;
}

export type PillAction =
  | 'navigate'
  | 'register-practitioner'
  | 'add-location'
  | 'add-assessment';

export type FabVariant = 'primary' | 'danger' | 'secondary' | 'ghost';

/** @deprecated Use MenuAction instead */
export type CustomAction = MenuAction;

export type ResolvedMode =
  | { type: 'selection'; config: SelectionConfig }
  | { type: 'action'; config: ActionConfig }
  | { type: 'menu'; config: MenuConfig }
  | { type: 'idle' };
