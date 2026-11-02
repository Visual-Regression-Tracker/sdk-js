# JS SDK for [Visual Regression Tracker](https://github.com/Visual-Regression-Tracker/Visual-Regression-Tracker)

[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=Visual-Regression-Tracker_sdk-js&metric=coverage)](https://sonarcloud.io/summary/new_code?id=Visual-Regression-Tracker_sdk-js)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=Visual-Regression-Tracker_sdk-js&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=Visual-Regression-Tracker_sdk-js)

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

  // Branch to take baselines from instead of the project's main branch
  // (a newer baseline on branchName still wins)
  // Optional - default is the project's main branch
  sourceBranch: "release-1.2",

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
  "sourceBranch": "release-1.2",
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
VRT_SOURCEBRANCH="release-1.2"
VRT_ENABLESOFTASSERT=true
```

#### `baselineBranchName` is deprecated

`baselineBranchName` (`VRT_BASELINEBRANCHNAME`) was never read by the server. It still
works as an alias of `sourceBranch` and logs a warning once; if both are set,
`sourceBranch` wins. Rename it to `sourceBranch`.

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
const result = await vrt.track(
  {
    // Name to be displayed
    // Required
    name: "Image name",

    // Image, one of imageBase64, imagePath or imageBuffer is required
    // Base64 encoded string, sent as JSON
    imageBase64: image,
    // Path to a PNG file, sent as multipart (service version api:4.14.0 or higher)
    imagePath: "./screenshots/home.png",
    // PNG as a Buffer, sent as multipart
    imageBuffer: buffer,

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

    // Areas to be ignored: x and y of the upper left corner, width and height, in px
    // Optional
    ignoreAreas: [{ x: 10, y: 20, width: 300, height: 400 }],

    // Allow additional details
    // Optional
    comment: "Ignoring region because of animation",
  },
  // How many more times to submit the image while the result is unresolved
  // Optional - default 2
  2
);

// result.testRunResponse.status, result.imageUrl, result.diffUrl, result.baselineUrl
```

Large screenshots in `imageBase64` can exceed the server's JSON body limit
(`BODY_PARSER_JSON_LIMIT`, HTTP 413); `imagePath` and `imageBuffer` are sent as
multipart and are not affected.
