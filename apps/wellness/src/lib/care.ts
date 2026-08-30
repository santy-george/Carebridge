export type PermissionLevel = 'full' | 'view';

export interface FamilyMember {
  id: string;
  relationship_label: string;
  permission_level: PermissionLevel;
}

export function initialsFor(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function permissionLabel(level: PermissionLevel): string {
  return level === 'full' ? 'Full access' : 'View only';
}
