import { Button } from "#/components/ui/button";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "#/components/ui/collapsible";
import { Field, FieldLabel, FieldDescription } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { Textarea } from "#/components/ui/textarea";
import {
  FliesConfiguration,
  readConfigurationFromLocalStorageUnvalidated,
  readDeviceNameFromLocalStorage,
  writeConfigurationToLocalStorage,
  writeDeviceNameToLocalStorage,
} from "#/data/configuration";
import { useTemporaryState } from "#/lib/utils";
import { IconCheck } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import z from "zod";
import { FliesHomeLogo } from ".";

export const Route = createFileRoute("/config")({
  component: RouteComponent,
});

const exampleConfig: FliesConfiguration = {
  roots: [
    {
      id: "root1",
      name: "Root 1",
      webdavEndpoint: "https://example.com/webdav",
      pathAssociations: [
        {
          pathPrefix: "/docs",
          openWith: {
            type: "web",
            url: "https://docs.example.com",
          },
        },
      ],
      fileTypeAssociations: [
        {
          extension: ".txt",
          icon: "text-icon",
          viewer: "text",
        },
      ],
    },
  ],
  fileTypeAssociations: [
    {
      extension: ".jpg",
      icon: "image-icon",
      viewer: "default",
    },
  ],
};

function RouteComponent() {
  const [isExampleOpen, setIsExampleOpen] = useState(false);

  // read and save configuration
  const [configInput, setConfigInput] = useState(
    JSON.stringify(readConfigurationFromLocalStorageUnvalidated(), null, 2),
  );
  const [configError, setConfigError] = useState<string | null>(null);
  useEffect(() => {
    try {
      const parsed = JSON.parse(configInput);
      setConfigError(null);
      const validated = FliesConfiguration.safeParse(parsed);
      if (validated.success) {
        writeConfigurationToLocalStorage(validated.data);
        setSaved(true);
      } else {
        setConfigError(z.prettifyError(validated.error));
      }
    } catch (err) {
      setConfigError("Invalid JSON");
    }
  }, [configInput]);

  // read and save device name
  const [deviceName, setDeviceName] = useState(
    readDeviceNameFromLocalStorage() || "",
  );
  useEffect(() => {
    writeDeviceNameToLocalStorage(deviceName);
    setSaved(true);
  }, [deviceName]);

  // saved indicator
  const [saved, setSaved] = useTemporaryState(false, 2000);

  return (
    <div className="p-8 typeset flex flex-col gap-4">
      <div className="flex gap-4 items-center">
        <FliesHomeLogo className="size-9" />
        <h1 className="m-0">Configuration</h1>
      </div>
      <div>
        Write your configuration in JSON format according to the schema (look in
        the source). The configuration is stored in local storage. You can also
        copy the configuration between devices, so give each one a name below to
        scope specific associations to that device.
      </div>
      <Field>
        <FieldLabel>Device Name</FieldLabel>
        <Input
          id="device-name-input"
          type="text"
          placeholder={deviceName || "My Device..."}
          className="max-w-3xs"
          value={deviceName}
          onChange={(e) => setDeviceName(e.target.value)}
        />
      </Field>
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
                setConfigInput(
                  JSON.stringify(JSON.parse(configInput), null, 2),
                );
              }
            }}
          >
            Pretty Print
          </Button>
        </div>
      </Field>
      {saved && (
        <div className="text-sm text-accent flex items-center gap-1">
          <IconCheck className="w-4 h-4" />
          Saved!
        </div>
      )}
      <Collapsible
        open={isExampleOpen}
        onOpenChange={setIsExampleOpen}
        className="flex flex-col gap-2 items-start"
      >
        <CollapsibleTrigger
          render={
            <Button variant="outline">
              {isExampleOpen ? "Hide" : "View"} Example Configuration
            </Button>
          }
        />
        <CollapsibleContent>
          <div className="whitespace-pre font-mono text-sm bg-card p-4 rounded-md border border-border">
            {JSON.stringify(exampleConfig, null, 2)}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
