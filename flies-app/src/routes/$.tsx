import {
  FileViewer,
  FliesRoot,
  readConfigurationFromLocalStorage,
} from "#/data/configuration";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { createClient, type FileStat, type WebDAVClient } from "webdav";
import TextViewer from "./-viewers/TextViewer";
import DirectoryViewer from "./-viewers/DirectoryViewer";
import { IconLoader } from "@tabler/icons-react";
import MarkdownViewer from "./-viewers/MarkdownViewer";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "#/components/ui/breadcrumb";

export const Route = createFileRoute("/$")({
  component: RouteComponent,
});

function RouteComponent() {
  const path = Route.useParams()._splat!;

  const configuration = readConfigurationFromLocalStorage();
  if (!configuration) {
    return <ErrorPage>Invalid Flies configuration!</ErrorPage>;
  }

  const root = configuration.roots.find((r) => path.split("/")[0] === r.id);
  if (!root) {
    return <ErrorPage>No root found for path: {path}</ErrorPage>;
  }
  const remotePath = path.substring(root.id.length + 1);

  const [client, _] = useState(() =>
    createClient(
      root.webdavEndpoint,
      root.webdavCredentials
        ? {
            username: root.webdavCredentials.username,
            password: root.webdavCredentials.password,
          }
        : undefined,
    ),
  );

  const remoteFile = useQuery({
    queryKey: ["remoteFile", root.id, remotePath],
    queryFn: () => fetchRemotePath(client, remotePath),
  });

  if (remoteFile.isLoading) {
    return <LoadingPage />;
  }

  if (remoteFile.isError) {
    return (
      <ErrorPage>
        Error fetching remote file: {String(remoteFile.error)}
      </ErrorPage>
    );
  }

  if (!remoteFile.data) {
    return <ErrorPage>File or directory not found</ErrorPage>;
  }

  if (remoteFile.data.type === "file") {
    const fileViewer: FileViewer = (() => {
      const fileViewerFromRootConfiguration = root.fileTypeAssociations.find(
        (fta) => remotePath.endsWith(fta.extension),
      );
      if (fileViewerFromRootConfiguration)
        return fileViewerFromRootConfiguration.viewer;

      const fileViewerFromConfiguration =
        configuration.fileTypeAssociations.find((fta) =>
          remotePath.endsWith(fta.extension),
        );
      if (fileViewerFromConfiguration)
        return fileViewerFromConfiguration.viewer;

      if (remotePath.endsWith(".txt")) return "text";
      if (remotePath.endsWith(".md")) return "markdown";
      return "default";
    })();

    if (fileViewer === "text") {
      return <TextViewer client={client} root={root} path={remotePath} />;
    } else if (fileViewer === "markdown") {
      return <MarkdownViewer client={client} root={root} path={remotePath} />;
    } else if (fileViewer === "default") {
      return (
        <iframe
          src={remoteFile.data.downloadLink}
          sandbox="allow-popups allow-same-origin allow-scripts"
        ></iframe>
      );
    }
  } else {
    return <DirectoryViewer client={client} root={root} path={remotePath} />;
  }
}

function ErrorPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex mt-10 w-full items-center justify-center">
      <div className="text-center text-lg font-semibold text-red-600">
        {children}
        <br />
        Check your configuration{" "}
        <Link to="/config" className="underline">
          here
        </Link>
        .
      </div>
    </div>
  );
}

export function LoadingPage() {
  return (
    <div className="flex mt-10 w-full items-center justify-center">
      <IconLoader className="mr-2 h-6 w-6 animate-spin animate-3s" />
    </div>
  );
}

async function fetchRemotePath(
  client: WebDAVClient,
  remotePath: string,
): Promise<
  null | { type: "file"; downloadLink: string } | { type: "directory" }
> {
  const stat = await (async () => {
    try {
      return (await client.stat(remotePath)) as unknown as FileStat;
    } catch (e) {
      if (e instanceof Error && e.message.includes("404")) {
        return null;
      }
      throw e;
    }
  })();
  if (stat === null) {
    return null;
  }

  if (stat.type === "directory") {
    return {
      type: "directory",
    };
  } else {
    return {
      type: "file",
      downloadLink: client.getFileDownloadLink(remotePath),
    };
  }
}
// todo: simplify ^

export type ViewerInfo = {
  client: WebDAVClient;
  root: FliesRoot;
  path: string;
};

export function PathBreadcrumbs({
  root,
  path,
}: {
  root: FliesRoot;
  path: string;
}) {
  const pathSegments = path.split("/").filter((segment) => segment !== "");
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink
            render={
              <Link
                to="/$"
                params={{
                  _splat: root.id,
                }}
                className="text-base"
              >
                {root.name ?? root.id}
              </Link>
            }
          />
        </BreadcrumbItem>
        {pathSegments.map((segment, index) => (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem key={index}>
              <BreadcrumbLink
                render={
                  <Link
                    to="/$"
                    params={{
                      _splat:
                        root.id +
                        "/" +
                        pathSegments.slice(0, index + 1).join("/"),
                    }}
                    className="text-base"
                  >
                    {segment}
                  </Link>
                }
              />
            </BreadcrumbItem>
          </>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
