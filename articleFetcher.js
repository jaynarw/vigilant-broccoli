const fs = require('fs');
const util = require('util');
const fetch = require('node-fetch');
const jsdom = require('jsdom');

const readFile = util.promisify(fs.readFile);
const { JSDOM } = jsdom;

const articleData = {};

const logUpdate = require('log-update');

const frames = ['-', '\\', '|', '/'];
let i = 0;
let percentage = 0;
const id = setInterval(() => {
	const frame = frames[i = ++i % frames.length];
	logUpdate(
`♥ Running: ${Math.round((percentage + Number.EPSILON) * 100) / 100}% complete... ${frame} ♥`
	);
}, 80);

(async () => {
  
  const articlesJSON = await readFile('Articles.json');

  let articles = JSON.parse(articlesJSON);
  articles = { '44062' : articles['44062'] };
  
  const days = Object.keys(articles);

  for(let ind = 0; ind < days.length; ind++ ) {
    const articleTitles = Object.keys(articles[days[ind]]);
    articleData[days[ind]] = {};

    for(let articleInd = 0; articleInd < articleTitles.length; articleInd++) {
      percentage = ind/days.length + (articleInd / (articleTitles.length)) * (100/days.length);
      // console.log(percentage);
      const url = articles[days[ind]][articleTitles[articleInd]];
      const response = await fetch(url);
      if(response.status === 200) {
        const html = await response.text();
        const virtualConsole = new jsdom.VirtualConsole();
        virtualConsole.sendTo(console, { omitJSDOMErrors: true });
        const { document } = (new JSDOM(html, {
          contentType: "text/html",
          virtualConsole
        })).window;
        const articleMetadata = document.evaluate("/html/body//script[@type='application/ld+json'][1]", document, null, 7, null);
        if (articleMetadata.snapshotLength > 0) {
          articleData[days[ind]][articleTitles[articleInd]] = JSON.parse(articleMetadata.snapshotItem(0).textContent);
        }
      }
    }
  }
  fs.writeFile('ArticlesData.json', JSON.stringify(articleData), (err) => {
    if(err) throw err;
    else {
      clearInterval(id);
      logUpdate('MwaaahH!!! ♥');
    }
  });
})();