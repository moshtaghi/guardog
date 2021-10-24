import axios from 'axios';
import dotenv from 'dotenv';
import * as cron from 'node-cron';

const cronConfig = {
  scheduled: true,
};

const config = dotenv.config();

if (config.error) {
  throw config.error;
}

const CONFIG = config.parsed;

const client = axios.create();

interface sosReport {
  name: string;
  message: string;
}

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

async function getMinersStatus(currency: string, list: string[]): Promise<any> {
  try {
    const queryString = list.join('&multi_account=');
    const response = await client.get(
      `https://api.f2pool.com/${currency}/moshtaghi?multi_account=${queryString}`
    );
    return response.data;
  } catch (err) {
    throw err;
  }
}

async function sendTotelegram(reports: sosReport[]): Promise<any> {
  await asyncForEach(reports, async (report) => {
    try {
      await client.post(
        `https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          chat_id: CONFIG.TELEGRAM_CHAT_ID,
          text: `
${report.message}

#${report.name}`,
        }
      );
    } catch (error) {
      console.log('=======', error);
    }
  });
}

function getSOSreport(currency: string, accounts: string[], report: any[]) {
  let result: sosReport[] = [];
  accounts.forEach((account) => {
    if (report[account].worker_length_online < report[account].worker_length) {
      result.push({
        name: account,
        message: `Among the ${
          report[account].worker_length
        } #${currency} workers, ${
          report[account].worker_length - report[account].worker_length_online
        } are offline`,
      } as sosReport);
    }
  });
  return result;
}

(async () => {
  const farmConfig = JSON.parse(CONFIG.FARM_CONFIG);
  cron.schedule(
    CONFIG.CRON,
    async () => {
      asyncForEach(farmConfig, async (item) => {
        const minerStatus = await getMinersStatus(item.currency, item.accounts);
        const sosReport = await getSOSreport(
          item.currency,
          item.accounts,
          minerStatus
        );
        if (sosReport.length > 0) {
          console.log(sosReport);
          await sendTotelegram(sosReport);
        }
      });
    },
    cronConfig
  );
})();
