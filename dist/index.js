"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
class VisualRegressionTracker {
    constructor(config) {
        this.config = config;
        this.axiosConfig = {
            headers: {
                apiKey: this.config.token,
            },
        };
    }
    startBuild(projectId, branchName) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.buildId) {
                console.log("Starting new build");
                const data = { branchName, projectId };
                const build = yield axios_1.default
                    .post(`${this.config.apiUrl}/builds`, data, this.axiosConfig)
                    .then(function (response) {
                    // handle success
                    return response.data;
                })
                    .catch(function (error) {
                    // handle error
                    return Promise.reject(error);
                });
                this.buildId = build.id;
            }
        });
    }
    submitTestResult(test) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.startBuild(this.config.projectId, this.config.branchName);
            const data = Object.assign({ buildId: this.buildId, projectId: this.config.projectId }, test);
            return axios_1.default
                .post(`${this.config.apiUrl}/test`, data, this.axiosConfig)
                .then(function (response) {
                // handle success
                return response.data;
            })
                .catch(function (error) {
                // handle error
                return Promise.reject(error);
            });
        });
    }
}
exports.VisualRegressionTracker = VisualRegressionTracker;
