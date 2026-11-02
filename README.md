# JavaScript SDK for [Visual Regression Tracker](https://github.com/Visual-Regression-Tracker/Visual-Regression-Tracker)

[![npm](https://img.shields.io/npm/v/@visual-regression-tracker/sdk-js)](https://www.npmjs.com/package/@visual-regression-tracker/sdk-js)

Sends screenshots to a Visual Regression Tracker server and reports whether they match the baseline.
The [Playwright](https://github.com/Visual-Regression-Tracker/agent-playwright), [Cypress](https://github.com/Visual-Regression-Tracker/agent-cypress) and [CodeceptJS](https://github.com/Visual-Regression-Tracker/agent-codeceptjs) agents are built on it.

## Requirements

- Node.js 18 or later
- Visual Regression Tracker server 5.0.8 or later; 6 is recommended

## Install

```sh
npm install --save-dev @visual-regression-tracker/sdk-js
```

## Configuration

| Option | Environment variable | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `apiUrl` | `VRT_APIURL` | yes | | URL of the server API, e.g. `http://localhost:4200` |
| `apiKey` | `VRT_APIKEY` | yes | | API key of a user with access to the project |
| `project` | `VRT_PROJECT` | yes | | Project name or ID |
| `branchName` | `VRT_BRANCHNAME` | yes | | Current git branch |
| `sourceBranch` | `VRT_SOURCEBRANCH` | no | project's main branch | Branch to take baselines from while `branchName` has none of its own |
| `ciBuildId` | `VRT_CIBUILDID` | no | | ID of one CI build; machines with the same ID share a build |
| `enableSoftAssert` | `VRT_ENABLESOFTASSERT` | no | `false` | Log failed comparisons instead of throwing |
| `httpTimeoutInSeconds` | `VRT_HTTPTIMEOUTINSECONDS` | no | `360` | How long to wait for each response; `0` means no limit. Connecting always times out after 10 s |

Pass the options to the constructor:

```ts
import { VisualRegressionTracker, Config } from "@visual-regression-tracker/sdk-js";

const config: Config = {
  apiUrl: "http://localhost:4200",
  apiKey: "tXZVHX0EA4YQM1MGDD",
  project: "Default project",
  branchName: "develop",
};
const vrt = new VisualRegressionTracker(config);
```

Or call `new VisualRegressionTracker()` without a config. The options are then read from `vrt.json` in the working directory, with the same keys:

```json
{
  "apiUrl": "http://localhost:4200",
  "apiKey": "tXZVHX0EA4YQM1MGDD",
  "project": "Default project",
  "branchName": "develop",
  "sourceBranch": "release-1.2",
  "ciBuildId": "commit_sha",
  "enableSoftAssert": false,
  "httpTimeoutInSeconds": 360
}
```

Environment variables override `vrt.json` key by key. An explicit config is used as it is: `vrt.json` and the environment are not read.

`baselineBranchName` (`VRT_BASELINEBRANCHNAME`) is a deprecated alias of `sourceBranch`. It still works and logs a warning once.

## Usage

```ts
await vrt.start();

const result = await vrt.track({
  name: "Home page",
  imagePath: "./screenshots/home.png",
});

await vrt.stop();
```

`track()` takes the image in one of three forms:

- `imageBase64`: a base64 string, sent as JSON;
- `imagePath`: a PNG file, sent as multipart;
- `imageBuffer`: a PNG `Buffer`, sent as multipart.

Prefer `imagePath` or `imageBuffer`. Large base64 screenshots can exceed the server's JSON body limit.

The other `track()` fields are optional:

| Field | Description |
| --- | --- |
| `os`, `browser`, `viewport`, `device`, `customTags` | Tell baselines of the same name apart |
| `diffTollerancePercent` | Allowed difference, in percent of all pixels (the spelling is the API's) |
| `ignoreAreas` | `[{ x, y, width, height }]` in pixels, left out of the comparison |
| `comment` | Shown with the test run |
| `merge` | `true` marks a run of a merge into the main branch: approving it updates the main branch's baseline instead of `branchName`'s |

The second argument of `track()` is how many more times to submit the image while the result is `unresolved`. The default is 2.

## Results and statuses

`track()` resolves to a `TestRunResult`:

- `testRunResponse` holds the server's answer, including `id`, `status` and `url`. `url` is the test run in the web UI.
- `imageUrl`, `diffUrl` and `baselineUrl` link to `{apiUrl}/images/{name}`.

| Status | Outcome |
| --- | --- |
| `new` | No baseline yet: throws, or logs with `enableSoftAssert` |
| `unresolved` | Differs from the baseline: throws, or logs with `enableSoftAssert` |
| `ok`, `approved`, `autoApproved` | Passes |
| `failed` | A reviewer rejected it: passes with a warning |
| anything else | Passes with a warning, so newer servers do not break older SDKs |

## Errors

A request the server answered with an error throws a `ServerError`. Its `message` names the request, the HTTP status and the server's message; `status` and `serverMessage` hold them separately. For common causes the message adds a hint:

- 401: check `apiKey`
- 403: the user has no access to the project
- 404: check `apiUrl` and `project`
- 409: another change to the same build is in progress
- 413: the image is over the server's body limit
- 422: the image has more pixels than the server's `MAX_IMAGE_PIXELS`
- 503: the server is busy

A 503 that carries `Retry-After` is not thrown at first. The SDK waits as long as the header says, up to 60 s, and sends the request again, at most 3 times.

When the server cannot be reached, the message says so and keeps the network error as `cause`. The API key never appears in error messages.

## Examples

[examples-js](https://github.com/Visual-Regression-Tracker/examples-js)

## Releasing

Every push to `master` runs [semantic-release](https://semantic-release.gitbook.io). It reads the [Conventional Commits](https://www.conventionalcommits.org) since the last `v*` tag:

| Commit | Release |
| --- | --- |
| `fix:` | patch |
| `feat:` | minor |
| `feat!:` or a `BREAKING CHANGE:` footer | major |
| `chore:`, `ci:`, `docs:`, `test:` | none |

It then publishes to npm through trusted publishing with provenance, tags `vX.Y.Z`, and writes the GitHub release.
The `version` field in `package.json` is a placeholder. The released version lives in the tags and on npm.

## License

[Apache-2.0](LICENSE)
