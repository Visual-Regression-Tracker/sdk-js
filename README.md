# JS SDK for [Visual Regression Tracker](https://github.com/Visual-Regression-Tracker/Visual-Regression-Tracker)

## Install

`npm install @visual-regression-tracker/sdk-js`

## Usage
### Import
```js
import { VisualRegressionTracker, Config } from '@visual-regression-tracker/sdk-js'
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
};

const vrt = new VisualRegressionTracker(config);
```
### Send image
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
    // Default: 1%
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
