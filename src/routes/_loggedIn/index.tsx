import { createFileRoute } from "@tanstack/react-router";
import { FileOrDirectoryItem } from "./-DirectoryViewer";
import { ModeToggle } from "#/components/theme-toggle";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ErrorPage } from "./$";
import { LoginPage, useIsLoggedInAsUser, useServer } from "#/client/orpc";
import { FliesHomeLogo } from "../_loggedIn";
import { Dashboard } from "#/server/userConfiguration";
import z from "zod";
import { Button } from "#/components/ui/button";
import { IconSettings } from "@tabler/icons-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "#/components/ui/field";
import { Textarea } from "#/components/ui/textarea";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_loggedIn/")({ component: Home });

function Home() {
  const { queries } = useServer();

  const { data: userDashboard, error } = useQuery(
    queries.user.getDashboard.queryOptions(),
  );
  const dashboardMutation = useMutation(
    queries.user.setDashboard.mutationOptions(),
  );
  const queryClient = useQueryClient();

  const dashboard =
    userDashboard ?? Dashboard.parse({} satisfies z.input<typeof Dashboard>);
  const setDashboard = (dashboard: Dashboard) => {
    dashboardMutation.mutate(
      { dashboard },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: queries.user.getDashboard.key(),
          });
        },
      },
    );
  };

  const [configurationInput, setConfigurationInput] =
    useState<null | Dashboard>(null);

  const isLoggedIn = useIsLoggedInAsUser();
  if (!isLoggedIn) {
    return (
      <LoginPage
        justification={<>Please log in to view your dashboard.</>}
        requireUserLogin={true}
      />
    );
  }
  // todo: could make this pattern nicer by extracting a wrapper component that is
  // used in the createFileRoute({ component }) call, which would handle those
  // things automatically and reusably, but it sadly cannot be used for $.tx where
  // the route is dynamic and the auth requirements are not known at compile time

  // todo: unauthenticated landing page

  if (error) {
    return (
      <ErrorPage>Error fetching user dashboard: {String(error)}</ErrorPage>
    );
  }

  return (
    <>
      <div className="absolute top-4 right-4 z-50">
        <ModeToggle />
      </div>
      <div className="px-8 py-12 typeset flex flex-col items-center justify-center gap-8">
        <h1 className="text-4xl flex gap-4 items-center">
          <FliesHomeLogo className="size-12" /> Flies
        </h1>

        {dashboard.greetingName && (
          <div className="text-2xl font-heading m-2">
            {(() => {
              const hours = new Date().getHours();
              if (hours > 5 && hours < 12) return "Good morning";
              if (hours >= 12 && hours < 18) return "Good afternoon";
              return "Good evening";
            })()}
            , {dashboard.greetingName}!
          </div>
        )}

        <div className="flex flex-col gap-2 m-0">
          {dashboard.pinnedDirectoryPaths.map((dir) => (
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
          {dashboard.pinnedFilePaths.map((file) => (
            <FileOrDirectoryItem
              key={file}
              type="file"
              name={"/" + file}
              path={file}
              hasActions={false}
              onRefresh={() => {}}
              isRoot={true}
            />
          ))}
          {dashboard.pinnedDirectoryPaths.length === 0 &&
            dashboard.pinnedFilePaths.length === 0 && (
              <div className="text-gray-500 italic">
                No pinned files or directories.
              </div>
            )}
        </div>

        <Dialog>
          <DialogTrigger
            render={
              <Button variant="outline">
                <IconSettings />
                Configure
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configure Dashboard</DialogTitle>
            </DialogHeader>
            <ConfigurationInput
              configuration={dashboard}
              onConfigurationChange={(config) => setConfigurationInput(config)}
            />
            <DialogFooter>
              <DialogClose render={<Button variant="outline">Cancel</Button>} />
              <DialogClose
                render={
                  <Button
                    onClick={() => {
                      configurationInput && setDashboard(configurationInput);
                      setConfigurationInput(null);
                    }}
                  >
                    Save
                  </Button>
                }
              />
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

const Configuration = Dashboard;
type Configuration = z.infer<typeof Configuration>;

function ConfigurationInput({
  configuration,
  onConfigurationChange,
}: {
  configuration: Configuration;
  onConfigurationChange: (config: Configuration) => void;
}) {
  const [configInput, setConfigInput] = useState(
    JSON.stringify(configuration, null, 2),
  );
  const [configError, setConfigError] = useState<string | null>(null);
  useEffect(() => {
    try {
      const parsed = JSON.parse(configInput);
      setConfigError(null);
      const validated = Configuration.safeParse(parsed);
      if (validated.success) {
        onConfigurationChange?.(validated.data);
      } else {
        setConfigError(z.prettifyError(validated.error));
      }
    } catch (err) {
      setConfigError("Invalid JSON");
    }
  }, [configInput]);

  return (
    <Field data-invalid={configError !== null}>
      <FieldLabel>Configuration</FieldLabel>
      <Textarea
        spellCheck={false}
        placeholder="Your configuration here..."
        className="font-mono"
        value={configInput}
        onChange={(e) => setConfigInput(e.target.value)}
        aria-invalid={configError !== null}
      />
      <FieldDescription className="text-destructive whitespace-pre-wrap">
        {configError}
      </FieldDescription>
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => {
            if (!configError) {
              setConfigInput(JSON.stringify(JSON.parse(configInput), null, 2));
            }
          }}
        >
          Pretty Print
        </Button>
      </div>
    </Field>
  );
}
