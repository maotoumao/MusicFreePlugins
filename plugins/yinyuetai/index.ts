import axios from "axios";

const pageNum = 20;

function formatMusicItem(item) {
  return {
    id: item.id,
    title: item.title,
    artist:
      item?.allArtistNames ||
      item.artists?.map?.((s) => s.name).join(", ") ||
      item.user?.niceName,
    artwork: item?.headImg,
    urls: item?.fullClip?.urls,
  };
}

function formatArtistItem(item) {
  return {
    id: item.id,
    name: item.name,
    avatar: item.headImg,
  };
}

let lastQuery;
let lastMusicId;
async function searchMusic(query, page) {
  // 新的搜索
  if (query !== lastQuery || page === 1) {
    lastMusicId = 0;
  }
  lastQuery = query;

  let data = JSON.stringify({
    searchType: "MV",
    key: query,
    sinceId: lastMusicId,
    size: pageNum,
    requestTagRows: [
      {
        key: "sortType",
        chosenTags: ["HOTTEST"],
      },
      {
        key: "source",
        chosenTags: ["-1"],
      },
      {
        key: "duration",
        chosenTags: ["-1"],
      },
    ],
  });

  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: "https://search-api.yinyuetai.com/search/get_search_result.json",
    headers: {
      referrer: "https://www.yinyuetai.com/",
      accept: "application/json",
      "content-type": "application/json",
      wua: "YYT/1.0.0 (WEB;web;11;zh-CN;kADiV2jNJFy2ryvuyB5Ne)",
    },
    data: data,
  };

  const response = (await axios.request(config)).data.data;

  lastMusicId = response[response.length - 1].id;

  return {
    isEnd: pageNum > response.length,
    data: response.map(formatMusicItem),
  };
}

// async function searchArtist(query, page) {
//   let data = JSON.stringify({
//     searchType: "ARTIST",
//     key: query,
//     sinceId: 0,
//     size: 2 * pageNum,
//   });

//   let config = {
//     method: "post",
//     maxBodyLength: Infinity,
//     url: "https://search-api.yinyuetai.com/search/get_search_result.json",
//     headers: {
//       referrer: "https://www.yinyuetai.com/",
//       accept: "application/json",
//       "content-type": "application/json",
//       wua: "YYT/1.0.0 (WEB;web;11;zh-CN;kADiV2jNJFy2ryvuyB5Ne)",
//     },
//     data: data,
//   };

//   const response = (await axios.request(config)).data.data;

//   return {
//     isEnd: true,
//     data: response.map(formatArtistItem),
//   };
// }

async function search(query, page, type) {
  if (type === "music") {
    return await searchMusic(query, page);
  } 
//   else if (type === "artist") {
//     return await searchArtist(query, page);
//   }
}

async function getMediaSource(musicItem, quality) {
  let url;
  if (quality === "standard") {
    url = musicItem.urls.find((it) => it.streamType === 5).url;
  } else if (quality === "high") {
    url = musicItem.urls.find((it) => it.streamType === 1).url;
  }

  return {
    url,
  };
}

// let lastArtistId;
// let lastArtistSinceId = 0;
// let cacheExtendId;
// async function getArtistWorks(artistItem, page, type) {
//   if (type === "music") {
//     let sinceId =
//       page === 1 || artistItem.id !== lastArtistId ? 0 : lastArtistSinceId;
//     lastArtistId = artistItem.id;

//     if (sinceId === 0) {
//       const personBaseInfo = (
//         await axios.get("https://person-api.yinyuetai.com/person/getBase", {
//           params: {
//             id: artistItem.id,
//           },
//           headers: {
//             referrer: "https://www.yinyuetai.com/",
//             accept: "application/json",
//             "content-type": "application/json",
//             wua: "YYT/1.0.0 (WEB;web;11;zh-CN;kADiV2jNJFy2ryvuyB5Ne)",
//           },
//         })
//       ).data;


//       console.log(personBaseInfo)
//       cacheExtendId = personBaseInfo.extendId;
//     }

//     const medias = (
//       await axios.get("https://video-api.yinyuetai.com/video/listByArtist", {
//         params: {
//           artistId: cacheExtendId,
//           size: pageNum,
//           sinceId,
//         },
//       })
//     ).data.data;

//     lastArtistSinceId = medias[medias.length - 1].id;

//     return {
//       isEnd: medias.length < pageNum,
//       data: medias.map(formatMusicItem),
//     };
//   }
// }

module.exports = {
  platform: "音悦台",
  author: '猫头猫',
  version: "0.0.1",
  supportedSearchType: ["music"],
  srcUrl:
    "https://gitee.com/maotoumao/MusicFreePlugins/raw/v0.1/dist/yinyuetai/index.js",
  cacheControl: "no-cache",
  search,
  getMediaSource,
//   getArtistWorks,
};
