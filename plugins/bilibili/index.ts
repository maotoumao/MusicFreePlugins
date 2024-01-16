import axios from "axios";
import dayjs = require("dayjs");
import he = require("he");
import CryptoJs = require("crypto-js");

const headers = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36 Edg/89.0.774.63",
  accept: "*/*",
  "accept-encoding": "gzip, deflate, br",
  "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
};
let cookie;

/** 获取cid */
async function getCid(bvid, aid) {
  const params = bvid
    ? {
        bvid: bvid,
      }
    : {
        aid: aid,
      };
  const cidRes = (
    await axios.get("https://api.bilibili.com/x/web-interface/view?%s", {
      headers: headers,
      params: params,
    })
  ).data;
  return cidRes;
}

/** 格式化 */
function durationToSec(duration: string | number) {
  if (typeof duration === "number") {
    return duration;
  }

  if (typeof duration === "string") {
    var dur = duration.split(":");
    return dur.reduce(function (prev, curr) {
      return 60 * prev + +curr;
    }, 0);
  }

  return 0;
}

const searchHeaders = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36 Edg/89.0.774.63",
  accept: "application/json, text/plain, */*",
  "accept-encoding": "gzip, deflate, br",
  origin: "https://search.bilibili.com",
  "sec-fetch-site": "same-site",
  "sec-fetch-mode": "cors",
  "sec-fetch-dest": "empty",
  referer: "https://search.bilibili.com/",
  "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
};
async function getCookie() {
  if (!cookie) {
    cookie = (
      await axios.get("https://api.bilibili.com/x/frontend/finger/spi", {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1 Edg/114.0.0.0",
        },
      })
    ).data.data;
  }
}
const pageSize = 20;
/** 搜索 */
async function searchBase(keyword: string, page: number, searchType) {
  await getCookie();
  const params = {
    context: "",
    page: page,
    order: "",
    page_size: pageSize,
    keyword: keyword,
    duration: "",
    tids_1: "",
    tids_2: "",
    __refresh__: true,
    _extra: "",
    highlight: 1,
    single_column: 0,
    platform: "pc",
    from_source: "",
    search_type: searchType,
    dynamic_offset: 0,
  };
  const res = (
    await axios.get("https://api.bilibili.com/x/web-interface/search/type", {
      headers: {
        ...searchHeaders,
        cookie: `buvid3=${cookie.b_3};buvid4=${cookie.b_4}`,
      },
      params: params,
    })
  ).data;
  return res.data;
}

/** 获取收藏夹 */
async function getFavoriteList(id: number | string) {
  const result = [];
  const pageSize = 20;
  let page = 1;

  while (true) {
    try {
      const {
        data: {
          data: { medias, has_more },
        },
      } = await axios.get("https://api.bilibili.com/x/v3/fav/resource/list", {
        params: {
          media_id: id,
          platform: "web",
          ps: pageSize,
          pn: page,
        },
      });
      result.push(...medias);

      if (!has_more) {
        break;
      }
      page += 1;
    } catch (error) {
      console.warn(error);
      break;
    }
  }

  return result;
}

function formatMedia(result: any) {
  const title = he.decode(
    result.title?.replace(/(\<em(.*?)\>)|(\<\/em\>)/g, "") ?? ""
  );
  return {
    id: result.cid ?? result.bvid ?? result.aid,
    aid: result.aid,
    bvid: result.bvid,
    artist: result.author ?? result.owner?.name,
    title,
    alias: title.match(/《(.+?)》/)?.[1],
    album: result.bvid ?? result.aid,
    artwork: result.pic?.startsWith("//")
      ? "http:".concat(result.pic)
      : result.pic,
    // description: result.description,
    duration: durationToSec(result.duration),
    tags: result.tag?.split(","),
    date: dayjs.unix(result.pubdate || result.created).format("YYYY-MM-DD"),
  };
}

async function searchAlbum(keyword, page) {
  const resultData = await searchBase(keyword, page, "video");
  const albums = resultData.result.map(formatMedia);
  return {
    isEnd: resultData.numResults <= page * pageSize,
    data: albums,
  };
}

async function searchArtist(keyword, page) {
  const resultData = await searchBase(keyword, page, "bili_user");
  const artists = resultData.result.map((result) => ({
    name: result.uname,
    id: result.mid,
    fans: result.fans,
    description: result.usign,
    avatar: result.upic?.startsWith("//")
      ? `https://${result.upic}`
      : result.upic,
    worksNum: result.videos,
  }));
  return {
    isEnd: resultData.numResults <= page * pageSize,
    data: artists,
  };
}

function getMixinKey(e) {
  var t = [];
  return (
    [
      46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5,
      49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55,
      40, 61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57,
      62, 11, 36, 20, 34, 44, 52,
    ].forEach(function (r) {
      e.charAt(r) && t.push(e.charAt(r));
    }),
    t.join("").slice(0, 32)
  );
}

function getRid(params) {
  const npi =
    "7cd084941338484aae1ad9425b84077c4932caff0ff746eab6f01bf08b70ac45";
  const o = getMixinKey(npi);
  const l = Object.keys(params).sort();
  let c = [];
  for (let d = 0, u = /[!'\(\)*]/g; d < l.length; ++d) {
    let [h, p] = [l[d], params[l[d]]];
    p && "string" == typeof p && (p = p.replace(u, "")),
      null != p &&
        c.push(
          "".concat(encodeURIComponent(h), "=").concat(encodeURIComponent(p))
        );
  }
  const f = c.join("&");
  const w_rid = CryptoJs.MD5(f + o).toString();
  return w_rid;
}

async function getArtistWorks(artistItem, page, type) {
  const queryHeaders = {
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36 Edg/89.0.774.63",
    accept: "application/json, text/plain, */*",
    "accept-encoding": "gzip, deflate, br",
    origin: "https://space.bilibili.com",
    "sec-fetch-site": "same-site",
    "sec-fetch-mode": "cors",
    "sec-fetch-dest": "empty",
    referer: `https://space.bilibili.com/${artistItem.id}/video`,
  };

  await getCookie();
  const now = Math.round(Date.now() / 1e3);
  const params = {
    mid: artistItem.id,
    ps: 30,
    tid: 0,
    pn: page,
    web_location: 1550101,
    order_avoided: true,
    order: "pubdate",
    keyword: "",
    platform: "web",
    dm_img_list: "[]",
    dm_img_str: "V2ViR0wgMS4wIChPcGVuR0wgRVMgMi4wIENocm9taXVtKQ",
    dm_cover_img_str:
      "QU5HTEUgKE5WSURJQSwgTlZJRElBIEdlRm9yY2UgR1RYIDE2NTAgKDB4MDAwMDFGOTEpIERpcmVjdDNEMTEgdnNfNV8wIHBzXzVfMCwgRDNEMTEpR29vZ2xlIEluYy4gKE5WSURJQS",
    wts: now.toString(),
  };

  const w_rid = getRid(params);
  const res = (
    await axios.get("https://api.bilibili.com/x/space/wbi/arc/search", {
      headers: {
        ...queryHeaders,
        cookie: `buvid3=${cookie.b_3};buvid4=${cookie.b_4}`,
      },
      params: {
        ...params,
        w_rid,
      },
    })
  ).data;

  const resultData = res.data;
  const albums = resultData.list.vlist.map(formatMedia);

  return {
    isEnd: resultData.page.pn * resultData.page.ps >= resultData.page.count,
    data: albums,
  };
}

/** 获取音源 */
async function getMediaSource(
  musicItem: IMusic.IMusicItem,
  quality: IMusic.IQualityKey
) {
  let cid = musicItem.cid;

  if (!cid) {
    cid = (await getCid(musicItem.bvid, musicItem.aid)).data.cid;
  }

  const _params = musicItem.bvid
    ? {
        bvid: musicItem.bvid,
      }
    : {
        aid: musicItem.aid,
      };

  const res = (
    await axios.get("https://api.bilibili.com/x/player/playurl", {
      headers: headers,
      params: { ..._params, cid: cid, fnval: 16 },
    })
  ).data;
  let url;

  if (res.data.dash) {
    const audios = res.data.dash.audio;
    audios.sort((a, b) => a.bandwidth - b.bandwidth);
    switch (quality) {
      case "low":
        url = audios[0].baseUrl;
        break;
      case "standard":
        url = audios[1].baseUrl;
        break;
      case "high":
        url = audios[2].baseUrl;
        break;
      case "super":
        url = audios[3].baseUrl;
        break;
    }
  } else {
    url = res.data.durl[0].url;
  }

  const hostUrl = url.substring(url.indexOf("/") + 2);
  const _headers = {
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36 Edg/89.0.774.63",
    accept: "*/*",
    host: hostUrl.substring(0, hostUrl.indexOf("/")),
    "accept-encoding": "gzip, deflate, br",
    connection: "keep-alive",
    referer: "https://www.bilibili.com/video/".concat(
      (musicItem.bvid !== null && musicItem.bvid !== undefined
        ? musicItem.bvid
        : musicItem.aid) ?? ""
    ),
  };
  return {
    url: url,
    headers: _headers,
  };
}

async function getTopLists() {
  // 入站必刷
  const precious = {
    title: "入站必刷",
    data: [
      {
        id: "popular/precious?page_size=100&page=1",
        title: "入站必刷",
        coverImg:
          "https://s1.hdslb.com/bfs/static/jinkela/popular/assets/icon_history.png",
      },
    ],
  };

  // 每周必看
  const weekly = {
    title: "每周必看",
    data: [],
  };

  const weeklyRes = await axios.get(
    "https://api.bilibili.com/x/web-interface/popular/series/list",
    {
      headers: {
        ...headers,
        referer: "https://www.bilibili.com/",
      },
    }
  );

  // console.log(weeklyRes.data);
  weekly.data = weeklyRes.data.data.list.slice(0, 8).map((e) => ({
    id: `popular/series/one?number=${e.number}`,
    title: e.subject,
    description: e.name,
    coverImg:
      "https://s1.hdslb.com/bfs/static/jinkela/popular/assets/icon_weekly.png",
  }));

  // 排行榜

  const boardKeys = [
    {
      id: "ranking/v2?rid=0&type=all",
      title: "全站",
    },
    {
      id: "ranking/v2?rid=3&type=all",
      title: "音乐",
    },
    {
      id: "ranking/v2?rid=1&type=all",
      title: "动画",
    },
    {
      id: "ranking/v2?rid=119&type=all",
      title: "鬼畜",
    },
    {
      id: "ranking/v2?rid=168&type=all",
      title: "国创相关",
    },
    {
      id: "ranking/v2?rid=129&type=all",
      title: "舞蹈",
    },
    {
      id: "ranking/v2?rid=4&type=all",
      title: "游戏",
    },
    {
      id: "ranking/v2?rid=36&type=all",
      title: "知识",
    },
    {
      id: "ranking/v2?rid=188&type=all",
      title: "科技",
    },
    {
      id: "ranking/v2?rid=234&type=all",
      title: "运动",
    },
    {
      id: "ranking/v2?rid=223&type=all",
      title: "汽车",
    },
    {
      id: "ranking/v2?rid=160&type=all",
      title: "生活",
    },
    {
      id: "ranking/v2?rid=211&type=all",
      title: "美食",
    },
    {
      id: "ranking/v2?rid=217&type=all",
      title: "动物圈",
    },
    {
      id: "ranking/v2?rid=115&type=all",
      title: "时尚",
    },
    {
      id: "ranking/v2?rid=5&type=all",
      title: "娱乐",
    },
    {
      id: "ranking/v2?rid=181&type=all",
      title: "影视",
    },
    {
      id: "ranking/v2?rid=0&type=origin",
      title: "原创",
    },
    {
      id: "ranking/v2?rid=0&type=rookie",
      title: "新人",
    },
  ];
  const board = {
    title: "排行榜",
    data: boardKeys.map((_) => ({
      ..._,
      coverImg:
        "https://s1.hdslb.com/bfs/static/jinkela/popular/assets/icon_rank.png",
    })),
  };
  return [weekly, precious, board];
}

// getTopLists().then(console.log)

async function getTopListDetail(topListItem: IMusicSheet.IMusicSheetItem) {
  const res = await axios.get(
    `https://api.bilibili.com/x/web-interface/${topListItem.id}`,
    {
      headers: {
        ...headers,
        referer: "https://www.bilibili.com/",
      },
    }
  );
  return {
    ...topListItem,
    musicList: res.data.data.list.map(formatMedia),
  };
}

async function importMusicSheet(urlLike: string) {
  let id: string;
  if (!id) {
    id = urlLike.match(/^\s*(\d+)\s*$/)?.[1];
  }
  if (!id) {
    id = urlLike.match(/^(?:.*)fid=(\d+).*$/)?.[1];
  }
  if (!id) {
    id = urlLike.match(/\/playlist\/pl(\d+)/i)?.[1];
  }
  if (!id) {
    id = urlLike.match(/\/list\/ml(\d+)/i)?.[1];
  }
  if (!id) {
    return;
  }
  const musicSheet = await getFavoriteList(id);
  return musicSheet.map((_) => ({
    id: _.id,
    aid: _.aid,
    bvid: _.bvid,
    artwork: _.cover,
    title: _.title,
    artist: _.upper?.name,
    album: _.bvid ?? _.aid,
    duration: durationToSec(_.duration),
  }));
}

module.exports = {
  platform: "bilibili",
  appVersion: ">=0.0",
  version: "0.1.12",
  author: "猫头猫",
  cacheControl: "no-cache",
  srcUrl:
    "https://gitee.com/maotoumao/MusicFreePlugins/raw/v0.1/dist/bilibili/index.js",
  primaryKey: ["id", "aid", "bvid", "cid"],
  hints: {
    importMusicSheet: [
      "bilibili 移动端：APP点击我的，空间，右上角分享，复制链接，浏览器打开切换桌面版网站，点击播放全部视频，复制链接",
      "bilibili H5/PC端：复制收藏夹URL，或者直接输入ID即可",
      "非公开收藏夹无法导入，编辑收藏夹改为公开即可",
      "导入时间和歌单大小有关，请耐心等待",
    ],
  },
  supportedSearchType: ["music", "album", "artist"],
  async search(keyword, page, type) {
    if (type === "album" || type === "music") {
      return await searchAlbum(keyword, page);
    }
    if (type === "artist") {
      return await searchArtist(keyword, page);
    }
  },

  getMediaSource,
  async getAlbumInfo(albumItem) {
    const cidRes = await getCid(albumItem.bvid, albumItem.aid);

    const _ref2 = cidRes?.data ?? {};
    const cid = _ref2.cid;
    const pages = _ref2.pages;

    let musicList;
    if (pages.length === 1) {
      musicList = [{ ...albumItem, cid: cid }];
    } else {
      musicList = pages.map(function (_) {
        return {
          ...albumItem,
          cid: _.cid,
          title: _.part,
          duration: durationToSec(_.duration),
          id: _.cid,
        };
      });
    }
    return {
      musicList,
    };
  },

  getArtistWorks,
  getTopLists,
  getTopListDetail,
  importMusicSheet,
};

// searchAlbum('周杰伦', 2)

// {
//   url: 'https://xy60x29x234x168xy.mcdn.bilivideo.cn:4483/upgcxcode/01/93/935359301/935359301-1-30232.m4s?e=ig8euxZM2rNcNbdlhoNvNC8BqJIzNbfqXBvEqxTEto8BTrNvN0GvT90W5JZMkX_YN0MvXg8gNEV4NC8xNEV4N03eN0B5tZlqNxTEto8BTrNvNeZVuJ10Kj_g2UB02J0mN0B5tZlqNCNEto8BTrNvNC7MTX502C8f2jmMQJ6mqF2fka1mqx6gqj0eN0B599M=&uipk=5&nbs=1&deadline=1685552083&gen=playurlv2&os=mcdn&oi=1698964255&trid=0000c4b8722cca5a4b88b6ffceabb89e7330u&mid=0&platform=pc&upsig=5317110e9e7617d7a04a47fb15f3bd87&uparams=e,uipk,nbs,deadline,gen,os,oi,trid,mid,platform&mcdnid=1003026&bvc=vod&nettype=0&orderid=0,3&buvid=&build=0&agrr=1&bw=13831&logo=A0000001',
//   headers: {
//     'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36 Edg/89.0.774.63',
//     accept: '*/*',
//     host: 'xy60x29x234x168xy.mcdn.bilivideo.cn:4483',
//     'accept-encoding': 'gzip, deflate, br',
//     connection: 'keep-alive',
//     referer: 'https://www.bilibili.com/video/BV1Pv4y1z7A1'
//   }
// }

// getMediaSource( {
//   id: 'BV1r7411p7R4',
//   aid: 86670567,
//   bvid: 'BV1r7411p7R4',
//   artist: 'zyl2012',
//   title: '【4K修复】周杰伦 - 青花瓷MV 2160P修复版 经典中国风',
//   album: 'BV1r7411p7R4',
//   artwork: 'http://i2.hdslb.com/bfs/archive/d6d5176730f19c23e03d3304c7bd30041024d5d8.jpg',
//   description: '转载自我自己修复\n' +
//     'DVD修复伪1080P，修复仅为提升观感\n' +
//     '---------------------\n' +
//     '2021.4.9\n' +
//     '重新修复伪4K，修复仅为提升观感',
//   duration: 242,
//   date: '2020-02-04'
// }, 'standard').then(console.log)

// getArtistWorks({
//   name: '不想睡觉猫头猫',
//   id: 12866223,
//   fans: 1103,
//   description: '不定期搞搞事情～点个关注吧\n(๑>؂<๑）',
//   avatar: '//i1.hdslb.com/bfs/face/ec98b6458cdc8fdde2a72f705151b0e81cadff71.jpg',
//   worksNum: 20
// }, 1, 'music').then(console.log);

// console.log(
//   getRid({
//     mid: 12866223,
//     ps: 30,
//     tid: 0,
//     pn: 1,
//     keyword: "",
//     order: "pubdate",
//     platform: "web",
//     web_location: 1550101,
//     order_avoided: true,
//     dm_img_list: [],
//     dm_img_str: "V2ViR0wgMS4wIChPcGVuR0wgRVMgMi4wIENocm9taXVtKQ",
//     dm_cover_img_str:
//       "QU5HTEUgKE5WSURJQSwgTlZJRElBIEdlRm9yY2UgR1RYIDE2NTAgKDB4MDAwMDFGOTEpIERpcmVjdDNEMTEgdnNfNV8wIHBzXzVfMCwgRDNEMTEpR29vZ2xlIEluYy4gKE5WSURJQS",
//     wts: 1701483964,
//   })
// );
