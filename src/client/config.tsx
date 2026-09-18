import { createClientOnlyFn } from "@tanstack/react-start";
import { createContext, useContext, useEffect, useState } from "react";
import z from "zod";

// schema

const ClientConfig = z.object({
  savedCredentials: z
    .object({
      username: z.string(),
      password: z.string(),
    })
    .optional(),
});
export type ClientConfig = z.infer<typeof ClientConfig>;

// storage

const readSavedConfig = createClientOnlyFn(() => {
  const storedConfig = localStorage.getItem("clientConfig");
  if (storedConfig) {
    try {
      return ClientConfig.parse(JSON.parse(storedConfig));
    } catch (error) {
      console.error("Failed to parse client config:", error);
    }
  }
  return ClientConfig.parse({} satisfies z.input<typeof ClientConfig>);
});
const writeSavedConfig = createClientOnlyFn((config: ClientConfig) => {
  localStorage.setItem("clientConfig", JSON.stringify(config, null, 2));
});

// provider

const ClientConfigContext = createContext<
  [ClientConfig, React.Dispatch<React.SetStateAction<ClientConfig>>] | null
>(null);

export function ClientConfigProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [config, setConfig] = useState(readSavedConfig());
  useEffect(() => {
    writeSavedConfig(config);
  }, [config]);
  return (
    <ClientConfigContext value={[config, setConfig]}>
      {children}
    </ClientConfigContext>
  );
}

export function useClientConfig() {
  const config = useContext(ClientConfigContext);
  if (!config) {
    throw new Error(
      "useClientConfig must be used within a ClientConfigProvider",
    );
  }
  return config;
}
