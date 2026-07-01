import { registerPlugin } from "@capacitor/core";

export interface PictelioHttpRequestOptions {
  url: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
}

export interface PictelioHttpResponse {
  status: number;
  data: string;
  headers: Record<string, string>;
}

export interface PictelioHttpPlugin {
  request(options: PictelioHttpRequestOptions): Promise<PictelioHttpResponse>;
}

export const PictelioHttp = registerPlugin<PictelioHttpPlugin>("PictelioHttp");
