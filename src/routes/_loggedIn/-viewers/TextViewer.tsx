import { useServer } from "#/client/orpc";
import { useQuery } from "@tanstack/react-query";

export default function TextViewer({ path }: { path: string }) {
  const { fs } = useServer();
  const content = useQuery({
    queryKey: ["text-file-content", path],
    queryFn: () => fs.readFile(path),
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
