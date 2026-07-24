import { useQuery } from "@tanstack/react-query";
import type { ViewerInfo } from "../$";

export default function TextViewer({ client, root, path }: ViewerInfo) {
  const content = useQuery({
    queryKey: ["text-file-content", root.id, path],
    queryFn: () =>
      client.getFileContents(path) as unknown as ArrayBuffer | String,
  });
  const contentStr = content.data
    ? content.data instanceof ArrayBuffer
      ? new TextDecoder().decode(content.data)
      : content.data
    : undefined;

  return (
    <div className="p-8">
      <pre className="whitespace-pre-wrap break-words">{contentStr}</pre>
    </div>
  );
}
