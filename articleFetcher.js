/* eslint-disable no-console */
const fs = require('fs');
const util = require('util')
const jsdom = require('jsdom');
const superagent = require('superagent');

const readFile = util.promisify(fs.readFile);
const { JSDOM } = jsdom;

const articleData = {};

const logUpdate = require('log-update');

const frames = ['-', '\\', '|', '/'];
let i = 0;
let percentage = 0;
let percentage2 = 0;
let speed = '0 KBs';

const name = process.argv.slice(2)[0];

const nameFormat = /^([1-7]?[0-9]?[0-9]?[0-9])-([1-7]?[0-9]?[0-9]?[0-9])$/;
if (!nameFormat.test(name)) {
  process.exit(1);
}
let [, startIndex, endIndex] = name.match(nameFormat);
console.log(startIndex, endIndex);
startIndex = Number(startIndex);
endIndex = Number(endIndex);

function roundNum(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}
const id = setInterval(() => {
  const frame = frames[i = ++i % frames.length];
  logUpdate(
    `♥ Running: ${Math.round((percentage + Number.EPSILON) * 100) / 100}% complete... | ${roundNum(percentage2)} | ${speed} ${frame} ♥`,
  );
}, 80);

function toSpeedStr(bytes, time) {
  if (bytes / time < 1) {
    speed = `${roundNum((bytes * 1000) / time)} B/s`;
  } else {
    speed = `${roundNum(bytes / time)} kB/s`;
  }
}

async function fetchArticle(url, dayId, articleTitle) {
  const startTime = Date.now();
  const response = await superagent.get(url).retry(10);
  const endTime = Date.now();
  const bytes = response.headers['content-length'];
  toSpeedStr(bytes, endTime - startTime);
  if (response.ok) {
    const html = response.text;
    const virtualConsole = new jsdom.VirtualConsole();
    virtualConsole.sendTo(console, { omitJSDOMErrors: true });
    const { document } = (new JSDOM(html, {
      contentType: 'text/html',
      virtualConsole,
    })).window;
    const articleMetadata = document.evaluate("/html/body//script[@type='application/ld+json'][1]", document, null, 7, null);
    if (articleMetadata.snapshotLength > 0) {
      try {
        articleData[dayId][articleTitle] = JSON.parse(articleMetadata.snapshotItem(0).textContent);
      } catch {
        try {
          articleData[dayId][articleTitle] = JSON.parse(articleMetadata.snapshotItem(0).textContent.replace(/[\u0000-\u0019]+/g, ''));
        } catch {
          articleData[dayId][articleTitle] = articleMetadata.snapshotItem(0).textContent;
          console.log(url);
        }
      }
    }
  }
}

(async () => {
  const articlesJSON = await readFile('Articles.json');

  const articles = JSON.parse(articlesJSON);

  const days = Object.keys(articles);

  for (let ind = startIndex; ind < endIndex; ind += 1) {
    if (days[ind] && articles[days[ind]]) {
      const articleTitles = Object.keys(articles[days[ind]]);
      articleData[days[ind]] = {};
      for (let articleInd = 0; articleInd < articleTitles.length; articleInd += 500) {
        percentage = ((ind - startIndex) / (endIndex - startIndex)) * 100 + (articleInd / (articleTitles.length)) * (100 / (endIndex - startIndex));
        percentage2 = (articleInd / (articleTitles.length)) * (100);
        const articlesRequests = [];
        for (let ind2 = articleInd; ind2 < articleInd + 500 && ind2 < articleTitles.length; ind2 += 1) {
          const url = articles[days[ind]][articleTitles[ind2]];
          articlesRequests.push(fetchArticle(url, days[ind], articleTitles[ind2]));
        }
        await Promise.allSettled(articlesRequests);
        // console.log(percentage);
      }
    }
  }
  fs.writeFile(`${startIndex}-${endIndex - 1}.json`, JSON.stringify(articleData), (err) => {
    if (err) throw err;
    else {
      clearInterval(id);
      logUpdate('MwaaahH!!! ♥');
    }
  });
})();
