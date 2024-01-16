import axios from "axios";
import { load } from "cheerio";
import CryptoJS = require("crypto-js");
import dayjs = require("dayjs");
const pageSize = 20;

const headers = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
};

/** 工具函数 */
function nonce(e = 10) {
  let n = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
    r = "";
  for (let i = 0; i < e; i++)
    r += n.charAt(Math.floor(Math.random() * n.length));
  return r;
}

function getNormalizedParams(parameters) {
  const sortedKeys = [];
  const normalizedParameters = [];
  for (let e in parameters) {
    sortedKeys.push(_encode(e));
  }
  sortedKeys.sort();

  for (let idx = 0; idx < sortedKeys.length; idx++) {
    const e = sortedKeys[idx];
    var n,
      r,
      i = _decode(e),
      a = parameters[i];
    for (a.sort(), n = 0; n < a.length; n++)
      (r = _encode(a[n])), normalizedParameters.push(e + "=" + r);
  }

  return normalizedParameters.join("&");
}

function _encode(e) {
  return e
    ? encodeURIComponent(e)
        .replace(/[!'()]/g, escape)
        .replace(/\*/g, "%2A")
    : "";
}

function _decode(e) {
  return e ? decodeURIComponent(e) : "";
}

function u(e) {
  (this._parameters = {}), this._loadParameters(e || {});
}

u.prototype = {
  _loadParameters: function (e) {
    e instanceof Array
      ? this._loadParametersFromArray(e)
      : "object" == typeof e && this._loadParametersFromObject(e);
  },
  _loadParametersFromArray: function (e) {
    var n;
    for (n = 0; n < e.length; n++) this._loadParametersFromObject(e[n]);
  },
  _loadParametersFromObject: function (e) {
    var n;
    for (n in e)
      if (e.hasOwnProperty(n)) {
        var r = this._getStringFromParameter(e[n]);
        this._loadParameterValue(n, r);
      }
  },
  _loadParameterValue: function (e, n) {
    var r;
    if (n instanceof Array) {
      for (r = 0; r < n.length; r++) {
        var i = this._getStringFromParameter(n[r]);
        this._addParameter(e, i);
      }
      0 == n.length && this._addParameter(e, "");
    } else this._addParameter(e, n);
  },
  _getStringFromParameter: function (e) {
    var n = e || "";
    try {
      ("number" == typeof e || "boolean" == typeof e) && (n = e.toString());
    } catch (e) {}
    return n;
  },
  _addParameter: function (e, n) {
    this._parameters[e] || (this._parameters[e] = []),
      this._parameters[e].push(n);
  },
  get: function () {
    return this._parameters;
  },
};

// 获取签名
function getSignature(
  method: string,
  urlPath: string,
  params,
  secret = "f3ac5b086f3eab260520d8e3049561e6"
) {
  urlPath = urlPath.split("?")[0];
  urlPath = urlPath.startsWith("http")
    ? urlPath
    : "https://api.audiomack.com/v1" + urlPath;
  const r = new u(params).get();

  const httpMethod = method.toUpperCase();
  const normdParams = getNormalizedParams(r);

  const l =
    _encode(httpMethod) + "&" + _encode(urlPath) + "&" + _encode(normdParams);

  const hash = CryptoJS.HmacSHA1(l, secret + "&").toString(CryptoJS.enc.Base64);
  return hash;
}

function formatMusicItem(raw) {
  return {
    id: raw.id,
    artwork: raw.image || raw.image_base,
    duration: +raw.duration,
    title: raw.title,
    artist: raw.artist,
    album: raw.album,
    url_slug: raw.url_slug,
  };
}

function formatAlbumItem(raw) {
  return {
    artist: raw.artist,
    artwork: raw.image || raw.image_base,
    id: raw.id,
    date: dayjs.unix(+raw.released).format("YYYY-MM-DD"),
    title: raw.title,
    _musicList: raw?.tracks?.map?.((it) => ({
      id: it.song_id || it.id,
      artwork: raw.image || raw.image_base,
      duration: +it.duration,
      title: it.title,
      artist: it.artist,
      album: raw.title,
    })),
  };
}

function formatMusicSheetItem(raw) {
  return {
    worksNum: raw.track_count,
    id: raw.id,
    title: raw.title,
    artist: raw.artist?.name,
    artwork: raw.image || raw.image_base,
    artistItem: {
      id: raw.artist?.id,
      avatar: raw.artist?.image || raw.artist?.image_base,
      name: raw.artist?.name,
      url_slug: raw.artist?.url_slug,
    },
    createAt: dayjs.unix(+raw.created).format("YYYY-MM-DD"),
    url_slug: raw.url_slug,
  };
}

async function searchBase(query, page, show) {
  const params = {
    limit: pageSize,
    oauth_consumer_key: "audiomack-js",
    oauth_nonce: nonce(32),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.round(Date.now() / 1e3),
    oauth_version: "1.0",
    page: page,
    q: query,
    show: show,
    sort: "popular",
  };
  const oauth_signature = getSignature("GET", "/search", params);

  const results = (
    await axios.get("https://api.audiomack.com/v1/search", {
      headers,
      params: {
        ...params,
        oauth_signature,
      },
    })
  ).data.results;
  return results;
}

async function searchMusic(query, page) {
  const results = await searchBase(query, page, "songs");

  return {
    isEnd: results.length < pageSize,
    data: results.map(formatMusicItem),
  };
}

async function searchAlbum(query, page) {
  const results = await searchBase(query, page, "albums");

  return {
    isEnd: results.length < pageSize,
    data: results.map(formatAlbumItem),
  };
}

async function searchMusicSheet(query, page) {
  const results = await searchBase(query, page, "playlists");

  return {
    isEnd: results.length < pageSize,
    data: results.map(formatMusicSheetItem),
  };
}

async function searchArtist(query, page) {
  const results = await searchBase(query, page, "artists");

  return {
    isEnd: results.length < pageSize,
    data: results.map((raw) => ({
      name: raw.name,
      id: raw.id,
      avatar: raw.image || raw.image_base,
      url_slug: raw.url_slug,
    })),
  };
}

let dataUrlBase;

async function getDataUrlBase() {
  if (dataUrlBase) {
    return dataUrlBase;
  }
  const rawHtml = (await axios.get("https://audiomack.com/")).data;
  const $ = load(rawHtml);
  const script = $("script#__NEXT_DATA__").text();
  const jsonObj = JSON.parse(script);
  
  if (jsonObj.buildId) {
    dataUrlBase = `https://audiomack.com/_next/data/${jsonObj.buildId}`
  }
  return dataUrlBase;
}

async function getArtistWorks(artistItem, page, type) {
  if (type === "music") {
    const params = {
      artist_id: artistItem.id,
      limit: pageSize,
      oauth_consumer_key: "audiomack-js",
      oauth_nonce: nonce(32),
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: Math.round(Date.now() / 1e3),
      oauth_version: "1.0",
      page: page,
      sort: "rank",
      type: "songs",
    };
    const oauth_signature = getSignature(
      "GET",
      "/search_artist_content",
      params
    );

    const results = (
      await axios.get("https://api.audiomack.com/v1/search_artist_content", {
        headers,
        params: {
          ...params,
          oauth_signature,
        },
      })
    ).data.results;
    return {
      isEnd: results.length < pageSize,
      data: results.map(formatMusicItem),
    };
  } else if (type === "album") {
    const params = {
      artist_id: artistItem.id,
      limit: pageSize,
      oauth_consumer_key: "audiomack-js",
      oauth_nonce: nonce(32),
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: Math.round(Date.now() / 1e3),
      oauth_version: "1.0",
      page: page,
      sort: "rank",
      type: "albums",
    };
    const oauth_signature = getSignature(
      "GET",
      "/search_artist_content",
      params
    );

    const results = (
      await axios.get("https://api.audiomack.com/v1/search_artist_content", {
        headers,
        params: {
          ...params,
          oauth_signature,
        },
      })
    ).data.results;
    return {
      isEnd: results.length < pageSize,
      data: results.map(formatAlbumItem),
    };
  }
}

async function getMusicSheetInfo(sheet: IMusicSheet.IMusicSheetItem, page) {
  const _dataUrlBase = await getDataUrlBase();

  const res = (
    await axios.get(
      `${_dataUrlBase}/${sheet.artistItem.url_slug}/playlist/${sheet.url_slug}.json`,
      {
        params: {
          page_slug: sheet.artistItem.url_slug,
          playlist_slug: sheet.url_slug,
        },
        headers: {
          ...headers,
        },
      }
    )
  ).data;

  const musicPage = res.pageProps.initialState.musicPage;
  const targetKey = Object.keys(musicPage).find((it) =>
    it.startsWith("musicMusicPage")
  );
  const tracks = musicPage[targetKey].results.tracks;

  return {
    isEnd: true,
    musicList: tracks.map(formatMusicItem),
  };
}

async function getMediaSource(musicItem, quality: IMusic.IQualityKey) {
  if (quality !== "standard") {
    return;
  }

  const params = {
    environment: "desktop-web",
    hq: true,
    oauth_consumer_key: "audiomack-js",
    oauth_nonce: nonce(32),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.round(Date.now() / 1e3),
    oauth_version: "1.0",
    section: "/search",
  };
  const oauth_signature = getSignature(
    "GET",
    `/music/play/${musicItem.id}`,
    params
  );

  const res = (
    await axios.get(`https://api.audiomack.com/v1/music/play/${musicItem.id}`, {
      headers: {
        ...headers,
        origin: "https://audiomack.com",
      },
      params: {
        ...params,
        oauth_signature,
      },
    })
  ).data;
  return {
    url: res.signedUrl,
  };
}

async function getAlbumInfo(albumItem) {
  return {
    // 老版本有bug
    musicList: albumItem._musicList.map((it) => ({ ...it })),
  };
}

async function getRecommendSheetTags() {
  const rawHtml = (await axios.get("https://audiomack.com/playlists")).data;
  const $ = load(rawHtml);
  const script = $("script#__NEXT_DATA__").text();
  const jsonObj = JSON.parse(script);

  return {
    data: [
      {
        data: jsonObj.props.pageProps.categories,
      },
    ],
  };
}

async function getRecommendSheetsByTag(tag, page) {
  if (!tag.id) {
    tag = { id: "34", title: "What's New", url_slug: "whats-new" };
  }
  const params = {
    featured: "yes",
    limit: pageSize,
    oauth_consumer_key: "audiomack-js",
    oauth_nonce: nonce(32),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.round(Date.now() / 1e3),
    oauth_version: "1.0",
    page: page,
    slug: tag.url_slug,
  };
  const oauth_signature = getSignature("GET", "/playlist/categories", params);

  const results = (
    await axios.get("https://api.audiomack.com/v1/playlist/categories", {
      headers,
      params: {
        ...params,
        oauth_signature,
      },
    })
  ).data.results.playlists;
  return {
    isEnd: results.length < pageSize,
    data: results.map(formatMusicSheetItem),
  };
}

async function getTopLists() {
  const genres = [
    {
      title: "All Genres",
      url_slug: null,
    },
    {
      title: "Afrosounds",
      url_slug: "afrobeats",
    },
    {
      title: "Hip-Hop/Rap",
      url_slug: "rap",
    },
    {
      title: "Latin",
      url_slug: "latin",
    },
    {
      title: "Caribbean",
      url_slug: "caribbean",
    },
    {
      title: "Pop",
      url_slug: "pop",
    },
    {
      title: "R&B",
      url_slug: "rb",
    },
    {
      title: "Gospel",
      url_slug: "gospel",
    },
    {
      title: "Electronic",
      url_slug: "electronic",
    },
    {
      title: "Rock",
      url_slug: "rock",
    },
    {
      title: "Punjabi",
      url_slug: "punjabi",
    },
    {
      title: "Country",
      url_slug: "country",
    },
    {
      title: "Instrumental",
      url_slug: "instrumental",
    },
    {
      title: "Podcast",
      url_slug: "podcast",
    },
  ];
  return [
    {
      title: "Trending Songs",
      data: genres.map((it) => ({
        ...it,
        type: "trending",
        id: it.url_slug ?? it.title,
      })),
    },
    {
      title: "Recently Added Music",
      data: genres.map((it) => ({
        ...it,
        type: "recent",
        id: it.url_slug ?? it.title,
      })),
    },
  ];
}

// TODO: 支持分页
async function getTopListDetail(topListItem, page = 1) {
  const type = topListItem.type;
  const partialUrl = `/music/${
    topListItem.url_slug ? `${topListItem.url_slug}/` : ""
  }${type}/page/${page}`;
  const url = `https://api.audiomack.com/v1${partialUrl}`;
  const params = {
    oauth_consumer_key: "audiomack-js",
    oauth_nonce: nonce(32),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.round(Date.now() / 1e3),
    oauth_version: "1.0",
    type: "song",
  };
  const oauth_signature = getSignature("GET", partialUrl, params);

  const results = (
    await axios.get(url, {
      headers,
      params: {
        ...params,
        oauth_signature,
      },
    })
  ).data.results;

  return {
    musicList: results.map(formatMusicItem),
  };
}

module.exports = {
  platform: "Audiomack",
  version: "0.0.2",
  author: '猫头猫',
  primaryKey: ["id", "url_slug"],
  srcUrl:
    "https://gitee.com/maotoumao/MusicFreePlugins/raw/v0.1/dist/audiomack/index.js",
  cacheControl: "no-cache",
  supportedSearchType: ['music', 'album', 'sheet', 'artist'],
  async search(query, page, type) {
    if (type === "music") {
      return await searchMusic(query, page);
    } else if (type === "album") {
      return await searchAlbum(query, page);
    } else if (type === "sheet") {
      return await searchMusicSheet(query, page);
    } else if (type === "artist") {
      return await searchArtist(query, page);
    }
  },
  getMediaSource,
  getAlbumInfo,
  getMusicSheetInfo,
  getArtistWorks,
  getRecommendSheetTags,
  getRecommendSheetsByTag,
  getTopLists,
  getTopListDetail,
};

// getMediaSource(
//   {
//     id: 14925926,
//     artwork:
//       "https://assets.audiomack.com/1756162437/a16444eb63eb3b3244e31c39ee98066f10c510429bde00f0949b9a0796f5b859.jpeg",
//     duration: 227,
//     title: "夜曲",
//     artist: "周杰伦",
//     album: "十一月的萧邦",
//   },
//   "standard"
// ).then(console.log);

// searchMusicSheet("周杰伦", 1).then(e => console.log(JSON.stringify(e.data[0])));

