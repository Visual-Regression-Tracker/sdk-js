# JS SDK for [Visual Regression Tracker](https://github.com/Visual-Regression-Tracker/Visual-Regression-Tracker)

## Install

`npm install @visual-regression-tracker/sdk-js`

## Usage
### Import
```
import { VisualRegressionTracker, Config } from '@visual-regression-tracker/sdk-js'
```
### Configure connection
```
const config: Config = {
    // Fill with your data
    apiUrl: "http://localhost:4200",

    // Fill with your data
    branchName: "develop",

    // Fill with your data
    projectId: "76f0c443-9811-4f4f-b1c2-7c01c5775d9a",

    // Fill with your data
    apiKey: "F5Z2H0H2SNMXZVHX0EA4YQM1MGDD",
};

const vrt = new VisualRegressionTracker(config);
```
### Send image
```
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
