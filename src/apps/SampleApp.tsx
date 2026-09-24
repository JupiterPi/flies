import z from "zod";
import { createOperation, createOperations } from "./operations";
import { produce } from "immer";
import { AppAssociation, type AppInstanceInfo } from "./apps";
import { DefaultAppLayout, PathBreadcrumbs } from "#/routes/_loggedIn/$";
import { FullApp, type FullAppProps } from "./fullApps";

// sample app

const SampleSchema = z.object({
  someField: z.string().default("default value"),
});
type SampleSchema = z.infer<typeof SampleSchema>;

const sampleOperations = createOperations<SampleSchema>()({
  setSomeField: createOperation({
    input: z.object({ newValue: z.string() }),
    handler: (data, input) =>
      produce(data, (data) => {
        data.someField = input.newValue;
      }),
  }),
  resetSomeField: createOperation({
    input: z.null(),
    handler: (data) => {
      console.log("resetSomeField operation called");
      return produce(data, (data) => {
        data.someField = "reset value";
      });
    },
  }),
});

class SampleApp extends FullApp<typeof SampleSchema, typeof sampleOperations> {
  constructor(instanceInfo: AppInstanceInfo) {
    super("Sample App", instanceInfo, SampleSchema, {}, sampleOperations);
  }

  override FullAppComponent = ({
    data,
    dispatchOperation,
    saveStatus,
  }: FullAppProps<typeof SampleSchema, typeof sampleOperations>) => {
    return (
      <DefaultAppLayout
        PathBreadcrumbs={<PathBreadcrumbs path={this.instanceInfo.path} />}
        SaveStatusIndicator={this.SaveStatusIndicator(saveStatus)}
      >
        <h1>Sample App!</h1>
        <p>someField: {data.someField}</p>
        <button
          onClick={async () => {
            try {
              await dispatchOperation("setSomeField", {
                newValue: "new value",
              });
            } catch (error) {
              console.error("Error dispatching setSomeField operation:", error);
            }
          }}
        >
          set new value
        </button>
        <button onClick={() => dispatchOperation("resetSomeField", null)}>
          reset value
        </button>
      </DefaultAppLayout>
    );
  };
}

export const app = new AppAssociation(
  [".sample"],
  (instanceInfo) => new SampleApp(instanceInfo),
);
