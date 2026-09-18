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
import ExcalidrawViewer from "./-viewers/ExcalidrawViewer";
import Viewer from "./-viewers/Viewer";
import SchmierzettelViewer from "./-viewers/SchmierzettelViewer";
import { FliesHomeLogo } from ".";
import React from "react";
import { resolveFileViewer } from "#/data/fileTypeAssociations";
import { useServer } from "#/client/orpc";

export const Route = createFileRoute("/_loggedIn/$")({
  component: RouteComponent,
});

function RouteComponent() {
  const path = Route.useParams()._splat!;
  return <FileAssociationRouter path={path} />;
}

function FileAssociationRouter({ path }: { path: string }) {
  const { fs } = useServer();

  const remoteFile = useQuery({
    queryKey: ["remoteFile", path],
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
    const downloadLink = remoteFile.data.downloadLink;
    const fileViewer = resolveFileViewer(path);
    return (
      <Viewer
        path={path}
        children={(content, setContent, SaveStatusIndicator) => {
          if (fileViewer === "plaintext") {
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
          } else if (fileViewer === undefined) {
            window.open(downloadLink, "_blank");
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
        Check your configuration! {/* // todo */}
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
  const pathSegments = path.split("/").filter((segment) => segment !== "");
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <FliesHomeLogo className="size-5" />
        </BreadcrumbItem>
        {pathSegments.map((segment, index) => (
          <React.Fragment key={index}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink
                render={
                  <Link
                    to="/$"
                    params={{
                      _splat: pathSegments.slice(0, index + 1).join("/"),
                    }}
                    className="text-base"
                  >
                    {segment}
                  </Link>
                }
              />
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
