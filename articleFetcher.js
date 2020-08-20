const fs = require('fs');
const util = require('util');
const fetch = require('node-fetch');
const jsdom = require('jsdom');

const readFile = util.promisify(fs.readFile);
const { JSDOM } = jsdom;

const articleData = {};

(async () => {
  
  const articlesJSON = await readFile('Articles.json');

  let articles = JSON.parse(articlesJSON);
  articles = { '44062' : articles['44062'] };
  
  await Promise.all(
    Object.keys(articles).map(async (key) => {
      const articleTitles = Object.keys(articles[key]);
      articleData[key] = {};
      await Promise.all(
        articleTitles.map((async (title) => {
          const url = articles[key][title];
          const response = await fetch(url);
          if(response.status === 200) {
            const html = await response.text();
            const { document } = (new JSDOM(html)).window;
            const articleMetadata = document.evaluate("/html/body//script[@type='application/ld+json'][1]", document, null, 7, null);
            if (articleMetadata.snapshotLength > 0) {
              articleData[key][title] = JSON.parse(articleMetadata.snapshotItem(0).textContent);
            }
          }
        }))
      );
    })
  );
  fs.writeFile('ArticlesData.json', JSON.stringify(articleData, null, 2), (err) => {
    if(err) throw err;
    else {
      console.log('MwaaahH!!!');
    }
  });
})();