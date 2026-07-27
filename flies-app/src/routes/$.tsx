import {
  FileViewer,
  readConfigurationFromLocalStorage,
} from "#/data/configuration";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
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
import { WebDAVClientFS, type RemoteFileSystem } from "#/fs/fs";
import { createContext, useContext } from "react";
import ExcalidrawViewer from "./-viewers/ExcalidrawViewer";
import Viewer from "./-viewers/Viewer";
import SchmierzettelViewer from "./-viewers/SchmierzettelViewer";
import { FliesHomeLogo } from ".";

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

  const fs = new WebDAVClientFS(root);
  return (
    <FsContext value={fs}>
      <FileAssociationRouter path={remotePath} configuration={configuration} />
    </FsContext>
  );
}

export const FsContext = createContext<RemoteFileSystem | null>(null);

export function useFs() {
  const fs = useContext(FsContext);
  if (!fs) {
    throw new Error("useFs must be used within a FsContext.Provider");
  }
  return fs;
}

function FileAssociationRouter({
  path,
  configuration,
}: {
  path: string;
  configuration: NonNullable<
    ReturnType<typeof readConfigurationFromLocalStorage>
  >;
}) {
  const fs = useFs();

  const remoteFile = useQuery({
    queryKey: ["remoteFile", fs.getRoot().id, path],
    queryFn: () => fs.getFileOrDirectoryInfo(path),
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
      const fileViewerFromRootConfiguration = fs
        .getRoot()
        .fileTypeAssociations.find((fta) => path.endsWith(fta.extension));
      if (fileViewerFromRootConfiguration)
        return fileViewerFromRootConfiguration.viewer;

      const fileViewerFromConfiguration =
        configuration.fileTypeAssociations.find((fta) =>
          path.endsWith(fta.extension),
        );
      if (fileViewerFromConfiguration)
        return fileViewerFromConfiguration.viewer;

      if (path.endsWith(".txt")) return "text";
      if (path.endsWith(".md")) return "markdown";
      if (path.endsWith(".excalidraw")) return "excalidraw";
      if (path.endsWith("Schmierzettel")) return "schmierzettel";
      return "default";
    })();

    const downloadLink = remoteFile.data.downloadLink;
    return (
      <Viewer
        path={path}
        children={(content, setContent, SaveStatusIndicator) => {
          if (fileViewer === "text") {
            return <TextViewer path={path} />;
          } else if (fileViewer === "markdown") {
            return (
              <MarkdownViewer
                path={path}
                content={content}
                setContent={setContent}
                SaveStatusIndicator={SaveStatusIndicator}
              />
            );
          } else if (fileViewer === "excalidraw") {
            return (
              <ExcalidrawViewer
                path={path}
                content={content}
                setContent={setContent}
                SaveStatusIndicator={SaveStatusIndicator}
              />
            );
          } else if (fileViewer === "schmierzettel") {
            return (
              <SchmierzettelViewer
                path={path}
                content={content}
                setContent={setContent}
                SaveStatusIndicator={SaveStatusIndicator}
              />
            );
          } else if (fileViewer === "default") {
            return (
              <object data={downloadLink} className="w-full h-screen"></object>
            );
          }
        }}
      ></Viewer>
    );
  } else {
    return <DirectoryViewer path={path} />;
  }
}

export function ErrorPage({ children }: { children: React.ReactNode }) {
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

export function PathBreadcrumbs({ path }: { path: string }) {
  const fs = useFs();
  const pathSegments = path.split("/").filter((segment) => segment !== "");
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <FliesHomeLogo className="size-5" />
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink
            render={
              <Link
                to="/$"
                params={{
                  _splat: fs.getRoot().id,
                }}
                className="text-base"
              >
                {fs.getRoot().name ?? fs.getRoot().id}
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
                        fs.getRoot().id +
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
