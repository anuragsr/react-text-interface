import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { l, mock } from "../helpers/common";

let call,
  apiHost = "";

export default class HttpService {
  constructor() {
    if (mock) {
      this.initMock();
    } else {
      apiHost = "https://api-admin-staging.oyster.ai";
    }
  }

  initMock() {
    l("Mock");
    new MockAdapter(axios, { delayResponse: 1000 })
      .onPost("/api/v1/login")
      .reply(200, {
        results: ["photo_block", "place_block", "tag_block"]
      })
      .onPost("/api/v1/sources")
      .reply(200)
      .onPost("/api/v1/submit_data")
      .reply(200)
      .onGet("/api/v1/reviews/placeholders")
      .reply(200, {
        placeholders: ["photo_block", "place_block", "tag_block"]
      })
      .onGet("/api/v1/suggested_tag_for_text")
      .reply(200, {
        results: [{ name: "tag1" }, { name: "tag2" }, { name: "tag3" }]
      })
      .onGet("/api/v1/tags")
      .reply(200, {
        results: [
          { full_name: "tag1Normal" },
          { full_name: "tag2Normal" },
          { full_name: "tag3Normal" }
        ]
      })
      .onGet("/api/v1/sources")
      .reply(200, {
        results: [{ name: "source1" }, { name: "source2" }, { name: "source3" }]
      })
      .onGet("/api/v1/get_text")
      .reply(200, {
        text:
          "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem."
      });
  }

  get(url, params, auth) {
    let config = {
      method: "get",
      url: apiHost + url,
      params,
      auth
    };

    return this.doRequest(config);
  }

  post(url, data, auth, onUploadProgress) {
    let config = {
      method: "post",
      url: apiHost + url,
      data,
      auth,
      onUploadProgress
    };

    return this.doRequest(config);
  }

  put(url, data, auth, onUploadProgress) {
    let config = {
      method: "put",
      url: apiHost + url,
      data,
      auth,
      onUploadProgress
    };
    return this.doRequest(config);
  }

  doRequest = config => {
    // l(config)
    if (config.params && config.params.series) {
      delete config.params.series;
      if (call) {
        call.cancel("One request at a time, fellas!");
      }
      call = axios.CancelToken.source();
      config.cancelToken = call.token;
    }
    return axios(config);
  };
}
