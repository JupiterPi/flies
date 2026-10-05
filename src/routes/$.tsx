import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import DirectoryViewer from "./-DirectoryViewer";
import { IconLoader } from "@tabler/icons-react";
import React from "react";
import {
  LoginPage,
  useAuthInvalidationKey,
  useIsLoggedInAsUser,
  useServer,
} from "#/client/orpc";
import { instantiateApp } from "#/apps/appsRegistry";
import PathBreadcrumbs from "./-PathBreadcrumbs";

export const Route = createFileRoute("/$")({
  ssr: false,
  component: RouteComponent,
});

function RouteComponent() {
  const isLoggedInAsUser = useIsLoggedInAsUser();
  const { client, fs } = useServer();
  const path = Route.useParams()._splat!;

  const authInvalidationKey = useAuthInvalidationKey();
  const remoteItem = useQuery({
    queryKey: ["remoteFile", path, authInvalidationKey],
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

  if (!remoteItem.data || remoteItem.data.type === "not_found") {
    return <ErrorPage>File or directory not found</ErrorPage>;
  }

  if (remoteItem.data.type === "not_authenticated") {
    return (
      <LoginPage
        sharePath={path}
        justification={
          <>
            You are not authenticated to access the file or directory at{" "}
            <span className="font-mono">{path}</span>. Please log in to
            continue.
          </>
        }
      />
    );
  }

  const _PathBreadcrumbs = (
    <PathBreadcrumbs
      path={path}
      mayShare={
        isLoggedInAsUser // todo: theoretically check specific permission
      }
    />
  );

  if (remoteItem.data.type === "file") {
    const downloadLink = remoteItem.data.downloadLink;

    // resolve associated app
    const app = instantiateApp({ path });
    if (app) {
      client.apps.discoverAppFile({ filePath: path }); // ignore result
      return (
        <app.WrapperComponent
          PathBreadcrumbs={_PathBreadcrumbs}
          readonly={remoteItem.data.readonly}
        />
      );
    }

    // if no app is found, open the raw file
    window.open(downloadLink, "_blank");
  } else {
    return <DirectoryViewer PathBreadcrumbs={_PathBreadcrumbs} path={path} />;
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
    <div className="flex my-10 w-full items-center justify-center">
      <IconLoader className="mr-2 h-6 w-6 animate-spin animate-3s" />
    </div>
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
