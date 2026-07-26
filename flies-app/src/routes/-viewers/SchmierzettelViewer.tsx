import z from "zod";
import { ErrorPage, PathBreadcrumbs } from "../$";
import Schmierzettel, {
  newSchmierzettelData,
  SchmierzettelData,
} from "./schmierzettel/Schmierzettel";

export default function SchmierzettelViewer({
  path,
  content,
  setContent,
  SaveStatusIndicator,
}: {
  path: string;
  content: string;
  setContent: (content: string) => void;
  SaveStatusIndicator: React.ReactNode;
}) {
  const parsedData = (() => {
    try {
      return content.length > 0 ? JSON.parse(content) : newSchmierzettelData;
    } catch (error) {
      return null;
    }
  })();
  if (parsedData === null) {
    return <ErrorPage>Invalid JSON data for Schmierzettel</ErrorPage>;
  }

  const validatedData = SchmierzettelData.safeParse(parsedData);
  if (!validatedData.success) {
    return (
      <ErrorPage>
        Invalid Schmierzettel data:
        <br />
        <div className="whitespace-pre font-mono">
          {z.prettifyError(validatedData.error)}
        </div>
      </ErrorPage>
    );
  }

  return (
    <div className="m-8 flex flex-col gap-8">
      <div className="flex gap-4 items-center">
        <PathBreadcrumbs path={path} />
        {SaveStatusIndicator}
      </div>
      <Schmierzettel
        data={validatedData.data}
        setData={(data) => setContent(JSON.stringify(data, null, 2))}
      />
    </div>
  );
}
