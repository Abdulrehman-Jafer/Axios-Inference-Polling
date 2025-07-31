import { Axios, AxiosRequestConfig } from "axios";

export type Status =
  | "starting"
  | "processing"
  | "succeeded"
  | "failed"
  | "canceled";
export type InfereceEventType = "CREATE_PREDICTION" | "UPDATE_PREDICTION";

const sleep = (timeInMs: number) =>
  new Promise((resolve) => setTimeout(resolve, timeInMs));

export class Inference {
  private axios: Axios;
  private subscribers: any[];
  constructor() {
    this.axios = new Axios();
    this.subscribers = [];
  }

  public subscribeToEvents(
    handler: (event: any, type: InfereceEventType) => any
  ) {
    if (typeof handler !== "function")
      throw new Error("Not a valid subscriber function");
    this.subscribers = [...this.subscribers, handler];
  }

  public unsubscribeToEvents(
    handler: (event: any, type: InfereceEventType) => any
  ) {
    if (typeof handler !== "function")
      throw new Error("Not a valid subscriber function");
    this.subscribers = this.subscribers.filter((sub) => sub !== handler);
  }

  private emitEvent<T>(event: T, type: InfereceEventType) {
    this.subscribers.forEach((sub) => sub(event, type));
  }

  async createInferenceRequest<T, Y>({
    create_prediction_url,
    payload,
    config,
  }: {
    create_prediction_url: string;
    payload: Y;
    config?: AxiosRequestConfig;
  }) {
    try {
      const { data } = await this.axios.post<T & { status: Status }>(
        create_prediction_url,
        payload,
        config
      );

      this.emitEvent(data, "CREATE_PREDICTION");
      return data;
    } catch (error) {
      throw new Error(
        `Error while creating prediction, error: ${JSON.stringify(error)}`
      );
    }
  }

  async pollInferenceRequest<T, Y>({
    create_prediction_url,
    prediction_status_url,
    payload,
    config,
  }: {
    create_prediction_url: string;
    payload: Y;
    config?: AxiosRequestConfig;
    prediction_status_url: string;
  }) {
    let prediction = await this.createInferenceRequest<T, Y>({
      create_prediction_url,
      payload,
      config,
    });

    while (
      prediction.status !== "succeeded" &&
      prediction.status !== "failed" &&
      prediction.status !== "canceled"
    ) {
      await sleep(2000);
      try {
        const { data } = await this.axios.get(
          `/${prediction_status_url}/${(prediction as any).id}`
        );
        prediction = data;
      } catch (error) {
        throw new Error(
          `Error while getting prediction status, error: ${JSON.stringify(
            error
          )}`
        );
      }

      this.emitEvent(prediction, "UPDATE_PREDICTION");
    }

    this.emitEvent(prediction, "UPDATE_PREDICTION");
    return prediction;
  }
}
