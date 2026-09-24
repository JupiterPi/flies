import type { Share, User } from "./stores/authStore.server";
import * as AuthStore from "./stores/authStore.server";

export class Privileges {
  static unauthenticated() {
    return new Privileges(false, [], []);
  }

  static forUser(user: User) {
    return new Privileges(user.admin, "*", "*");
  }

  static forShare(share: Share) {
    return new Privileges(
      false,
      [share.path],
      share.allowWrite ? [share.path] : [],
    );
  }

  constructor(
    public readonly admin: boolean,
    public readonly readPaths: "*" | string[],
    public readonly writePaths: "*" | string[],
  ) {}
}

export const permissions = {
  admin: {
    description: "admin",
    check: (privileges: Privileges) => privileges.admin,
  },
  read: (path: string) => ({
    description: `read path ${path}`,
    check: (privileges: Privileges) =>
      privileges.readPaths === "*" ||
      privileges.readPaths.some((p) => path.startsWith(p)) ||
      AuthStore.getShares().publicShares.some((s) => path.startsWith(s.path)),
  }),
  write: (path: string) => ({
    description: `write to path ${path}`,
    check: (privileges: Privileges) =>
      privileges.writePaths === "*" ||
      privileges.writePaths.some((p) => path.startsWith(p)) ||
      AuthStore.getShares().publicShares.some(
        (s) => path.startsWith(s.path) && s.allowWrite,
      ),
  }),
  createShares: {
    description: "create shares",
    check: (privileges: Privileges) => privileges.admin,
  },
} satisfies Record<string, Permission | ((...args: any[]) => Permission)>;
export type Permission = {
  description: string;
  check: (privileges: Privileges) => boolean;
};
