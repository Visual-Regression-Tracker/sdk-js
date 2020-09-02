# JS SDK for [Visual Regression Tracker](https://github.com/Visual-Regression-Tracker/Visual-Regression-Tracker)

[![Codacy Badge](https://app.codacy.com/project/badge/Coverage/b6796a5b10954c69a2151b118e44a5af)](https://www.codacy.com/gh/Visual-Regression-Tracker/sdk-js?utm_source=github.com&utm_medium=referral&utm_content=Visual-Regression-Tracker/sdk-js&utm_campaign=Badge_Coverage)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/b9a9e660b0e14c6c9fb38c7cf09ab16c)](https://app.codacy.com/gh/Visual-Regression-Tracker/sdk-js?utm_source=github.com&utm_medium=referral&utm_content=Visual-Regression-Tracker/sdk-js&utm_campaign=Badge_Grade_Dashboard)

## Npm

https://www.npmjs.com/package/@visual-regression-tracker/sdk-js

## Install

`npm install @visual-regression-tracker/sdk-js`

## Usage

### Import

```js
import {
  VisualRegressionTracker,
  Config,
} from "@visual-regression-tracker/sdk-js";
```

### Configure connection

```js
const config: Config = {
  // apiUrl - URL where backend is running
  apiUrl: "http://localhost:4200",

  // project - Project name or ID
  project: "Default project",

  // apiKey - User apiKey
  apiKey: "tXZVHX0EA4YQM1MGDD",

  // branch - Current git branch
  branchName: "develop",

  // enableSoftAssert - Log errors instead of exceptions
  enableSoftAssert: false,
};

const vrt = new VisualRegressionTracker(config);
```

### Setup

```js
vrt.start();
```

### Assert

```js
await vrt.track({
  // Name to be displayed
  // Required
  name: "Image name",

  // Base64 encoded string
  // Required
  imageBase64: image,

  // Allowed mismatch tollerance in %
  // Optional
  diffTollerancePercent: 0,

  // Optional
  os: "Mac",

  // Optional
  browser: "Chrome",

  // Optional
  viewport: "800x600",

  // Optional
  device: "PC",
});
```

### Teardown

```js
vrt.stop();
```
