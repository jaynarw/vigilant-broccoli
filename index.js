const jsdom = require("jsdom");
const fetch = require("node-fetch");

const host = 'https://economictimes.indiatimes.com';
const { JSDOM } = jsdom;
const fs = require('fs');

async function getArticlesById(id) {
  const articles = {};
  const rawPage = await fetch(`https://economictimes.indiatimes.com/archivelist/starttime-${id}.cms`);
  const html = await rawPage.text();
  const { document } = (new JSDOM(html)).window;
  const articleElems = document.querySelectorAll('#pageContent table li a');
  articleElems.forEach((elem) => {
    articles[elem.textContent] = host + elem.href;
  });
  return articles;
}
const finalArticles = {};
(async () => {
  
  for(let id = 44063;id >= 36892; id-=100 ) {
    console.log(id);
    const articleRequests = [];
    for(let j=id; j > id-100 && j >= 36892; j--) {
      articleRequests.push(getArticlesById(j).then((articles) => {
        finalArticles[j] = articles;
      }));
    }
    await Promise.all(articleRequests);
  }
  fs.writeFile('Articles.json', JSON.stringify(finalArticles, null, 2), (err) => {
    if(err) throw err;
    else {
      console.log('Done danda dones');
    }
  });
})();