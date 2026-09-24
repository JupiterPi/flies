/**
 * The concept of an "app" in Flies is like a powerful file viewer.
 */

// base App

import { LoadingPage } from "#/routes/_loggedIn/$";
import { useServer } from "#/client/orpc";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useDebounce } from "@uidotdev/usehooks";
import { IconCloudCheck, IconCloudUpload } from "@tabler/icons-react";
import { cn } from "#/utils";
import { createServerOnlyFn } from "@tanstack/react-start";

export type AppInstanceInfo = {
  path: string;
};

export type AppSaveStatus = "idle" | "saving" | "saved";

export abstract class App {
  constructor(
    public readonly instanceInfo: AppInstanceInfo,
    protected readonly newFileData: string,
  ) {}

  WrapperComponent = () => {
    const path = this.instanceInfo.path;
    const { fs } = useServer();

    const queriedContent = useQuery({
      queryKey: ["file-content", path],
      queryFn: () => fs.readFile(path),
    });

    const [contentInput, setContentInput] = useState<string | null>(null);
    const debouncedContentInput = useDebounce(contentInput, 1000);
    const [saveStatus, setSaveStatus] = useState<AppSaveStatus>("idle");
    useEffect(() => {
      if (debouncedContentInput !== null && saveStatus !== "saving") {
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

    if (queriedContent.isLoading) {
      return <LoadingPage />;
    }
    const queriedContentStr = new TextDecoder().decode(queriedContent.data!);
    const content =
      contentInput !== null
        ? contentInput
        : queriedContentStr.trim().length > 0
          ? queriedContentStr
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
    } else {
      return <IconCloudUpload className="size-5 opacity-75" />;
    }
  }

  protected abstract AppComponent: React.ComponentType<AppProps>;

  get runServerHandler() {
    return createServerOnlyFn(async () => {
      await this._runServerHandler();
    });
  }
  protected async _runServerHandler() {}
}

export type AppProps = {
  data: string;
  setData: (data: string | ((prev: string) => string)) => void;
  saveStatus: AppSaveStatus;
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
