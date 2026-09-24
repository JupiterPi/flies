import { createFileRoute, Link } from "@tanstack/react-router";
import { FileOrDirectoryItem } from "./-DirectoryViewer";
import { ModeToggle } from "#/components/theme-toggle";
import classNames from "classnames";
import { useQuery } from "@tanstack/react-query";
import { ErrorPage, LoadingPage } from "./$";
import { useServer } from "#/client/orpc";

export const Route = createFileRoute("/_loggedIn/")({ component: Home });

function Home() {
  const { queries } = useServer();
  const {
    data: topLevelDirectories,
    isLoading: directoriesLoading,
    error,
  } = useQuery(queries.user.getAccessibleTopLevelDirectories.queryOptions());

  if (error) {
    return (
      <ErrorPage>
        Error fetching top-level directories: {String(error)}
      </ErrorPage>
    );
  }

  return (
    <>
      <div className="absolute top-4 right-4 z-50">
        <ModeToggle />
      </div>
      <div className="px-8 py-12 typeset flex flex-col items-center justify-center gap-4">
        <h1 className="text-4xl flex gap-4 items-center">
          <img src="/flies-logo.svg" alt="Flies Logo" className="size-12" />{" "}
          Flies
        </h1>

        {/* roots */}
        <div className="flex flex-col gap-2">
          {directoriesLoading && <LoadingPage />}
          {topLevelDirectories &&
            topLevelDirectories.map((dir) => (
              <FileOrDirectoryItem
                key={dir}
                type="directory"
                name={"/" + dir}
                path={dir}
                hasActions={false}
                onRefresh={() => {}}
                isRoot={true}
              />
            ))}
        </div>
      </div>
    </>
  );
}

export function FliesHomeLogo({ className }: { className?: string }) {
  return (
    <Link to="/">
      <img
        src="/flies-logo.svg"
        alt="Flies Logo"
        className={classNames("m-0!", className)}
      />
    </Link>
  );
}
