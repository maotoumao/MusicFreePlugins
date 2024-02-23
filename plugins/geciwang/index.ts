import axios from "axios";
import { load } from "cheerio";


async function search(query, page, type){
  if (type !== 'lyric') {
    return;
  }
  const result = (await axios.get('https://zh.followlyrics.com/search', {
    params: {
      name: query,
      type: 'song'
    }
  })).data;

  const $ = load(result);
  const results = $('.table.table-striped > tbody');

  const items = results.children('tr');

  const data = items.map((index, el) => {
    const tds = $(el).children();


    const title = $(tds.get(0)).text().trim();
    const artist = $(tds.get(1)).text().trim();
    const album = $(tds.get(2)).text().trim();
    const id = $(tds.get(3)).children('a').attr('href');

    return {
      title,
      artist,
      album,
      id
    }
  }).toArray();

  return {
    isEnd: true,
    data
  }
  
}

async function getLyric(musicItem) {
  const res = (await axios.get(musicItem.id)).data;

  const $ = load(res);

  const rawLrc = $('div#lyrics').text().replace(/\n/g, '');

  return {
      rawLrc: rawLrc,
  };
}

module.exports = {
  platform: "歌词网",
  version: "0.0.0",
  srcUrl: 'https://gitee.com/maotoumao/MusicFreePlugins/raw/v0.1/dist/geciwang/index.js',
  cacheControl: "no-store",
  supportedSearchType: ['lyric'],
  search,
  getLyric

};


// search('夜曲', 1, 'lyric').then(console.log);

// getLyric({
//   title: '夜曲',
//   artist: '周杰伦',
//   album: '十一月的萧邦',
//   id: 'https://zh.followlyrics.com/lyrics/99416/ye-qu'
// }).then(console.log);
