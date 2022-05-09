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

### Configure

#### Explicit config from code

```js
const config: Config = {
  // URL where backend is running
  // Required
  apiUrl: "http://localhost:4200",

  // Project name or ID
  // Required
  project: "Default project",

  // User apiKey
  // Required
  apiKey: "tXZVHX0EA4YQM1MGDD",

  // Current git branch
  // Required
  branchName: "develop",

  // Log errors instead of throwing exceptions
  // Optional - default false
  enableSoftAssert: true,

  // Unique ID related to one CI build
  // Optional - default null
  ciBuildId: "SOME_UNIQUE_ID",
};
```

#### Or, as JSON config file `vrt.json`

_Used only if not explicit config provided_
_Is overriden if ENV variables are present_

```json
{
  "apiUrl": "http://localhost:4200",
  "project": "Default project",
  "apiKey": "tXZVHX0EA4YQM1MGDD",
  "ciBuildId": "commit_sha",
  "branchName": "develop",
  "enableSoftAssert": false
}
```

#### Or, as environment variables

_Used only if not explicit config provided_

```
VRT_APIURL="http://localhost:4200"
VRT_PROJECT="Default project"
VRT_APIKEY="tXZVHX0EA4YQM1MGDD"
VRT_CIBUILDID="commit_sha"
VRT_BRANCHNAME="develop"
VRT_ENABLESOFTASSERT=true
```

### Setup

```js
vrt.start();
```

### Teardown

```js
vrt.stop();
```

### Assert

```js
await vrt.track({
  // Name to be displayed
  // Required
  name: "Image name",

  // Base64 encoded string
  // Required or use imagePath
  imageBase64: image,

  // Path to image (service version api:4.14.0 or higher is required)
  // Required or use imageBase64
  imagePath: image,

  // Allowed mismatch % (mismatched pixels to overal pixels count)
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

  // Optional
  customTags: "Cloud, DarkTheme, Auth",

  // Array of areas to be ignored
  // Optional
  ignoreAreas: [
    {
      // X-coordinate relative of left upper corner
      // Required
      x: 10;

      // Y-coordinate relative of left upper corner
      // Required
      y: 20;

      // Area width in px
      // Required
      width: 300;

      // Height width in px
      // Required
      height: 400;
    }
  ]

  // Allow additional details
  // Optional
  comment: 'Ignoring region because of animation'
});
```
