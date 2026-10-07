/**
 * The concept of an "app" in Flies is like a powerful file viewer.
 */

// base App

import { ErrorPage, LoadingPage } from "#/routes/$";
import { useServer } from "#/client/orpc";
import { useEffect, useState } from "react";
import { useDebounce } from "@uidotdev/usehooks";
import {
  IconCloudCheck,
  IconCloudUp,
  IconCloudUpload,
  IconLock,
} from "@tabler/icons-react";
import { cn } from "#/utils";
import { createServerOnlyFn } from "@tanstack/react-start";
import { useBlocker } from "@tanstack/react-router";

export type AppInstanceInfo = {
  path: string;
};

export type AppSaveStatus =
  "idle" | "savingSoon" | "saving" | "saved" | "readonly";

export abstract class App {
  constructor(
    public readonly instanceInfo: AppInstanceInfo,
    protected readonly newFileData: string,
  ) {}

  WrapperComponent = ({
    PathBreadcrumbs,
    readonly,
  }: {
    PathBreadcrumbs: React.ReactNode;
    readonly: boolean;
  }) => {
    const path = this.instanceInfo.path;
    const { fs } = useServer();

    const [queriedContent, setQueriedContent] = useState<
      string | { error: string } | null
    >(null);
    useEffect(() => {
      let cancelled = false;
      fs.readFile(path)
        .then((content) => {
          if (!cancelled) setQueriedContent(new TextDecoder().decode(content));
        })
        .catch((error) => {
          if (!cancelled) setQueriedContent({ error: String(error) });
        });
      return () => {
        cancelled = true;
      };
    }, [path]);

    const [contentInput, setContentInput] = useState<string | null>(null);
    const debouncedContentInput = useDebounce(contentInput, 1000);
    const [saveStatus, setSaveStatus] = useState<AppSaveStatus>(
      readonly ? "readonly" : "idle",
    );
    useEffect(() => {
      if (!readonly && contentInput !== null && saveStatus !== "saving") {
        setSaveStatus("savingSoon");
      }
    }, [contentInput]);
    useEffect(() => {
      if (
        !readonly &&
        debouncedContentInput !== null &&
        saveStatus !== "saving"
      ) {
        setSaveStatus("saving");
        fs.writeFile(path, debouncedContentInput).then(() => {
          setSaveStatus("saved");
        });
      }
    }, [debouncedContentInput]);
    useEffect(() => {
      if (saveStatus === "saved") {
        const timeout = setTimeout(() => {
          setSaveStatus("idle");
        }, 700);
        return () => clearTimeout(timeout);
      }
    }, [saveStatus]);

    // prevent accidental navigation away when there are unsaved changes
    const isUnsavedChanges =
      saveStatus === "savingSoon" || saveStatus === "saving";
    useBlocker({
      shouldBlockFn: () => isUnsavedChanges,
      enableBeforeUnload: isUnsavedChanges,
    });

    if (queriedContent === null) {
      return <LoadingPage />;
    }
    if (queriedContent && typeof queriedContent === "object") {
      return <ErrorPage>Error reading file: {queriedContent.error}</ErrorPage>;
    }

    const content =
      contentInput !== null && !readonly
        ? contentInput
        : queriedContent.trim().length > 0
          ? queriedContent
          : this.newFileData;

    return (
      <this.AppComponent
        data={content}
        setData={(data) => {
          if (typeof data === "function") {
            setContentInput(data(content));
          } else {
            setContentInput(data);
          }
        }}
        saveStatus={saveStatus}
        PathBreadcrumbs={PathBreadcrumbs}
        readonly={readonly}
      />
    );
  };

  protected SaveStatusIndicator(saveStatus: AppSaveStatus) {
    if (saveStatus === "idle" || saveStatus === "saved") {
      return (
        <IconCloudCheck
          className={cn("size-5 transition-opacity transition-duration-300", {
            "opacity-50": saveStatus === "idle",
          })}
        />
      );
    } else if (saveStatus === "savingSoon") {
      return <IconCloudUp className="size-5 opacity-50" />;
    } else if (saveStatus === "saving") {
      return <IconCloudUpload className="size-5 opacity-75" />;
    } else if (saveStatus === "readonly") {
      return <IconLock className="size-5 opacity-50" />;
    }
  }

  protected abstract AppComponent: React.ComponentType<AppProps>;

  runServerHandler(abortSignal: AbortSignal) {
    return createServerOnlyFn(async () => {
      await this._runServerHandler(abortSignal);
    });
  }
  protected async _runServerHandler(_abortSignal: AbortSignal) {}
}

export type AppProps = {
  data: string;
  setData: (data: string | ((prev: string) => string)) => void;
  saveStatus: AppSaveStatus;
  PathBreadcrumbs: React.ReactNode;
  readonly: boolean;
};

// associations

export class AppAssociation {
  constructor(
    private readonly associatedFileExtensions: string[],
    private readonly app: (instanceInfo: AppInstanceInfo) => App,
  ) {}

  instantiateOrNull(instanceInfo: AppInstanceInfo) {
    if (
      this.associatedFileExtensions.some((ext) =>
        instanceInfo.path.endsWith(ext),
      )
    ) {
      return this.app(instanceInfo);
    }
    return null;
  }
}
