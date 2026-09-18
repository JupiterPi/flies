export type UserPermissions = {
  admin: boolean;
  readPaths: "*" | string[];
  writePaths: "*" | string[];
};

export const defaultPermissions: UserPermissions = {
  admin: false,
  readPaths: [],
  writePaths: [],
};

export function hasAdminPermission(permissions: UserPermissions): boolean {
  return permissions.admin;
}

export function hasReadPermission(
  permissions: UserPermissions,
  path: string,
): boolean {
  if (permissions.admin) return true;
  if (permissions.readPaths === "*") return true;
  return permissions.readPaths.some((p) => path.startsWith(p));
}

export function hasWritePermission(
  permissions: UserPermissions,
  path: string,
): boolean {
  if (permissions.admin) return true;
  if (permissions.writePaths === "*") return true;
  return permissions.writePaths.some((p) => path.startsWith(p));
}

// todo: more work here to recognize public shares