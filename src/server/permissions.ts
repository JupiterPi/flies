import type { Share, User } from "./stores/authStore.server";
import * as AuthStore from "./stores/authStore.server";

// designed so that privileges can only be created using the methods prefiyed PRIVILEGES_
// this way, they can be easily identified in the code as potentially dangerous

export class Privileges {
  static unauthenticated() {
    return new Privileges(false, [], []);
  }

  static PRIVILEGES_forUser(user: User) {
    return new Privileges(user.admin, "*", "*");
  }

  static PRIVILEGES_forShare(share: Share) {
    return new Privileges(
      false,
      [share.path],
      share.allowWrite ? [share.path] : [],
    );
  }

  static PRIVILEGES_all() {
    return new Privileges(true, "*", "*");
  }

  static PRIVILEGES_forApp(path: string) {
    return new Privileges(false, [path], [path]);
  }

  private static INTEGRITY_TAG = Symbol("Privileges");
  private readonly integrityTag = Privileges.INTEGRITY_TAG;
  checkIntegrity() {
    if (this.integrityTag !== Privileges.INTEGRITY_TAG) {
      throw new Error("Privileges object integrity check failed");
    }
    return true;
  }

  private constructor(
    public readonly admin: boolean,
    public readonly readPaths: "*" | string[],
    public readonly writePaths: "*" | string[],
  ) {}

  static combine(privileges: Privileges[]): Privileges {
    const admin = privileges.some((p) => p.admin);
    const readPaths = privileges.some((p) => p.readPaths === "*")
      ? "*"
      : privileges.flatMap((p) => p.readPaths);
    const writePaths = privileges.some((p) => p.writePaths === "*")
      ? "*"
      : privileges.flatMap((p) => p.writePaths);
    return new Privileges(admin, readPaths, writePaths);
  }
}

export const permissions = {
  admin: {
    description: "admin",
    check: (privileges: Privileges) =>
      privileges.checkIntegrity() && privileges.admin,
  },
  read: (path: string) => ({
    description: `read path ${path}`,
    check: (privileges: Privileges) =>
      privileges.checkIntegrity() &&
      (privileges.readPaths === "*" ||
        privileges.readPaths.some((p) => path.startsWith(p)) ||
        AuthStore.getShares().some(
          (s) => s.password === null && path.startsWith(s.path),
        )),
  }),
  write: (path: string) => ({
    description: `write to path ${path}`,
    check: (privileges: Privileges) =>
      privileges.checkIntegrity() &&
      (privileges.writePaths === "*" ||
        privileges.writePaths.some((p) => path.startsWith(p)) ||
        AuthStore.getShares().some(
          (s) => s.password === null && path.startsWith(s.path) && s.allowWrite,
        )),
  }),
  createShares: {
    description: "create shares",
    check: (privileges: Privileges) =>
      privileges.checkIntegrity() && privileges.admin,
  },
} satisfies Record<string, Permission | ((...args: any[]) => Permission)>;
export type Permission = {
  description: string;
  check: (privileges: Privileges) => boolean;
};
