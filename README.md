# JS SDK for [Visual Regression Tracker](https://github.com/Visual-Regression-Tracker/Visual-Regression-Tracker)

## Install

`npm install @visual-regression-tracker/sdk-js`

## Usage
### Import
```
import { VisualRegressionTracker, Config } from '@visual-regression-tracker/sdk-js'
```
### Configure connection
```js
const config: Config = {
    // URL where backend is running 
    // Required
    apiUrl: "http://localhost:4200",

    // Current git branch 
    // Required
    branchName: "develop",

    // Project name or ID
    // Required
    project: "Demo project",

    // User apiKey
    // Required
    apiKey: "F5Z2H0H2SNMXZVHX0EA4YQM1MGDD",
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
