import { Axios, AxiosRequestConfig } from "axios";

type Status = "starting" | "processing" | "succeeded" | "failed" | "canceled";

export class Inference {
  private axios: Axios;
  constructor(server_url: string) {
    this.axios = new Axios({ baseURL: server_url });
  }

  async createInferenceRequest<T, Y>({
    url,
    payload,
    config,
  }: {
    url: string;
    payload: Y;
    config?: AxiosRequestConfig;
  }) {
    const { data } = await this.axios.post<T & { status: Status }>(
      url,
      payload,
      config
    );
    return data;
  }

  async pollInferenceRequest<T, Y>({
    url,
    prediction_status_url,
    payload,
    config,
  }: {
    url: string;
    payload: Y;
    config?: AxiosRequestConfig;
    prediction_status_url: string;
  }) {
    let prediction = await this.createInferenceRequest<T, Y>({
      url,
      payload,
      config,
    });

    while (
      prediction.status !== "succeeded" &&
      prediction.status !== "failed" &&
      prediction.status !== "canceled"
    ) {
      const { data } = await this.axios.get(
        `/${prediction_status_url}/${(prediction as any).id}`
      );

      prediction = data;
    }

    return prediction;
  }
}
