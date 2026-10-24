/**
 * @fileoverview Entry point: wires the API client into the app shell.
 */

import { ApiClient } from "./api/api-client.js";
import { App } from "./app.js";

const app = new App({
  api: new ApiClient(),
  nav: document.getElementById("level-nav"),
  stage: document.getElementById("stage"),
  badge: document.getElementById("model-badge"),
});

app.start();
