import { useQuery } from "@tanstack/react-query";
import { useFs } from "../$";

export default function TextViewer({ path }: { path: string }) {
  const fs = useFs();
  const content = useQuery({
    queryKey: ["text-file-content", fs.getRoot().id, path],
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
