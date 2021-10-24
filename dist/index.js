"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const dotenv_1 = __importDefault(require("dotenv"));
const cron = __importStar(require("node-cron"));
const cronConfig = {
    scheduled: true,
};
const config = dotenv_1.default.config();
if (config.error) {
    throw config.error;
}
const CONFIG = config.parsed;
const client = axios_1.default.create();
function asyncForEach(array, callback) {
    return __awaiter(this, void 0, void 0, function* () {
        for (let index = 0; index < array.length; index++) {
            yield callback(array[index], index, array);
        }
    });
}
function getMinersStatus(currency, list) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const queryString = list.join('&multi_account=');
            const response = yield client.get(`https://api.f2pool.com/${currency}/moshtaghi?multi_account=${queryString}`);
            return response.data;
        }
        catch (err) {
            throw err;
        }
    });
}
function sendTotelegram(reports) {
    return __awaiter(this, void 0, void 0, function* () {
        yield asyncForEach(reports, (report) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield client.post(`https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    chat_id: CONFIG.TELEGRAM_CHAT_ID,
                    text: `
${report.message}

#${report.name}`,
                });
            }
            catch (error) {
                console.log('=======', error);
            }
        }));
    });
}
function getSOSreport(currency, accounts, report) {
    let result = [];
    accounts.forEach((account) => {
        if (report[account].worker_length_online < report[account].worker_length) {
            result.push({
                name: account,
                message: `Among the ${report[account].worker_length} #${currency} workers, ${report[account].worker_length - report[account].worker_length_online} are offline`,
            });
        }
    });
    return result;
}
(() => __awaiter(void 0, void 0, void 0, function* () {
    const farmConfig = JSON.parse(CONFIG.FARM_CONFIG);
    cron.schedule(CONFIG.CRON, () => __awaiter(void 0, void 0, void 0, function* () {
        asyncForEach(farmConfig, (item) => __awaiter(void 0, void 0, void 0, function* () {
            const minerStatus = yield getMinersStatus(item.currency, item.accounts);
            const sosReport = yield getSOSreport(item.currency, item.accounts, minerStatus);
            if (sosReport.length > 0) {
                console.log(sosReport);
                yield sendTotelegram(sosReport);
            }
        }));
    }), cronConfig);
}))();
