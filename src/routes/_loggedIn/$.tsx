import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import DirectoryViewer from "./-DirectoryViewer";
import { IconLoader } from "@tabler/icons-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "#/components/ui/breadcrumb";
import { FliesHomeLogo } from ".";
import React from "react";
import { useServer } from "#/client/orpc";
import { apps, AppWrapper } from "#/apps/apps";

export const Route = createFileRoute("/_loggedIn/$")({
  ssr: false,
  component: RouteComponent,
});

function RouteComponent() {
  const { fs } = useServer();
  const path = Route.useParams()._splat!;

  const remoteItem = useQuery({
    queryKey: ["remoteFile", path],
    queryFn: () => fs.getFileOrDirectoryInfo(path),
  });

  if (remoteItem.isLoading) {
    return <LoadingPage />;
  }

  if (remoteItem.isError) {
    return (
      <ErrorPage>
        Error fetching remote file or directory: {String(remoteItem.error)}
      </ErrorPage>
    );
  }

  if (!remoteItem.data) {
    return <ErrorPage>File or directory not found</ErrorPage>;
  }

  if (remoteItem.data.type === "file") {
    const downloadLink = remoteItem.data.downloadLink;

    // resolve associated app
    for (const [_, app] of Object.entries(apps)) {
      if (app.associatedFileExtensions.some((ext) => path.endsWith(ext))) {
        return <AppWrapper app={app} path={path} />;
      }
    }

    // if no app is found, open the raw file
    window.open(downloadLink, "_blank");
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

export function DefaultAppLayout({
  PathBreadcrumbs,
  SaveStatusIndicator,
  children,
}: {
  PathBreadcrumbs: React.ReactNode;
  SaveStatusIndicator?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="m-8 flex flex-col gap-4">
      <div className="flex gap-4 items-center">
        {PathBreadcrumbs}
        {SaveStatusIndicator}
      </div>
      {children}
    </div>
  );
}
