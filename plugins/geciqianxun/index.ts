import axios from "axios";
import { load } from "cheerio";


async function search(query, page, type){
  if (type !== 'lyric') {
    return;
  }
  const result = (await axios.get('https://so.lrcgc.com/', {
    params: {
      q: query,
    }
  })).data;

  const $ = load(result);
  const results = $('.resultWrap').children();
  const data = [];

  if (results.first().prop('tagName') === 'DL') {
    const title = results.first().find('dt > a');
    const desc = results.first().find('dd > small');
    const descText = desc.text().replace(/[\s|\n]/g, '').split(/[歌手：|专辑:]/).filter(it => it.trim() !== '');


    data.push({
      title: title.text(),
      id: title.attr('href'),
      artist: descText?.[0],
      album: descText?.[1]
    })
  }

  return {
    isEnd: true,
    data
  }
  
}

async function getLyric(musicItem) {
  const res = (await axios.get(musicItem.id)).data;

  const $ = load(res);

  const rawLrc = $('p#J_lyric').text().replace(/\n/g, '');

  return {
      rawLrc: rawLrc,
  };
}

module.exports = {
  platform: "歌词千寻",
  version: "0.0.0",
  srcUrl: 'https://gitee.com/maotoumao/MusicFreePlugins/raw/v0.1/dist/geciqianxun/index.js',
  cacheControl: "no-store",
  supportedSearchType: ['lyric'],
  search,
  getLyric
};
