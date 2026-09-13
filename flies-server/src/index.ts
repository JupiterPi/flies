import { fsRoutes } from "./fs";
import { os } from "@orpc/server";
import "@orpc/openapi/extensions/route";
import { userRoutes } from "./users/users";

export {
  fileTypeAssociations,
  type FileViewer,
  resolveFileViewer,
} from "./fileTypeAssociations";

export const router = {
  hello: os.route({ method: "GET", path: "/hello" }).handler(async () => {
    return "Hello, Flies!";
  }),
  fs: fsRoutes,
  user: userRoutes,
};
export type router = typeof router;
