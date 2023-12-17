import axios from "axios";
// import { HttpsProxyAgent } from "https-proxy-agent";

// axios.defaults.httpsAgent = new HttpsProxyAgent("http://127.0.0.1:10809");

function formatMusicItem(item) {
  return {
    id: item.videoId,
    title: item.title.runs?.[0]?.text,
    artist: item.ownerText.runs?.[0]?.text,
    artwork: item?.thumbnail?.thumbnails?.[0]?.url,
  };
}

let lastQuery;
let musicContinToken;

async function searchMusic(query, page) {
  // 新的搜索
  if (query !== lastQuery || page === 1) {
    musicContinToken = undefined;
  }
  lastQuery = query;

  let data = JSON.stringify({
    context: {
      client: {
        hl: "zh-CN",
        gl: "US",
        deviceMake: "",
        deviceModel: "",
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0,gzip(gfe)",
        clientName: "WEB",
        clientVersion: "2.20231121.08.00",
        osName: "Windows",
        osVersion: "10.0",
        platform: "DESKTOP",
        userInterfaceTheme: "USER_INTERFACE_THEME_LIGHT",
        browserName: "Edge Chromium",
        browserVersion: "119.0.0.0",
        acceptHeader:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        screenWidthPoints: 1358,
        screenHeightPoints: 1012,
        screenPixelDensity: 1,
        screenDensityFloat: 1.2395833730697632,
        utcOffsetMinutes: 480,
        memoryTotalKbytes: "8000000",
        mainAppWebInfo: {
          pwaInstallabilityStatus: "PWA_INSTALLABILITY_STATUS_UNKNOWN",
          webDisplayMode: "WEB_DISPLAY_MODE_BROWSER",
          isWebNativeShareAvailable: true,
        },
        timeZone: "Asia/Shanghai",
      },
      user: {
        lockedSafetyMode: false,
      },
      request: {
        useSsl: true,
        internalExperimentFlags: [],
      },
    },
    query: musicContinToken ? undefined : query,
    continuation: musicContinToken || undefined,
  });

  var config = {
    method: "post",
    url: "https://www.youtube.com/youtubei/v1/search?prettyPrint=false",
    headers: {
      "Content-Type": "text/plain",
    },
    data: data,
  };

  const response = (await axios(config)).data;

  const contents =
    response.contents.twoColumnSearchResultsRenderer.primaryContents
      .sectionListRenderer.contents;

  const isEndItem = contents.find(
    (it) =>
      it.continuationItemRenderer?.continuationEndpoint?.continuationCommand
        ?.request === "CONTINUATION_REQUEST_TYPE_SEARCH"
  );
  if (isEndItem) {
    musicContinToken =
      isEndItem.continuationItemRenderer.continuationEndpoint
        .continuationCommand.token;
  }

  const musicData = contents.find((it) => it.itemSectionRenderer)
    .itemSectionRenderer.contents;

  let resultMusicData = [];
  for (let i = 0; i < musicData.length; ++i) {
    if (musicData[i].videoRenderer) {
      resultMusicData.push(formatMusicItem(musicData[i].videoRenderer));
    }
  }

  return {
    isEnd: !isEndItem,
    data: resultMusicData,
  };
}

async function search(query, page, type) {
  if (type === "music") {
    return await searchMusic(query, page);
  }
}

let cacheMediaSource = {
  id: null,
  urls: {},
};

function getQuality(label) {
  if (label === "small") {
    return "standard";
  } else if (label === "tiny") {
    return "low";
  } else if (label === "medium") {
    return "high";
  } else if (label === "large") {
    return "super";
  } else {
    return "standard";
  }
}

async function getMediaSource(musicItem, quality) {
  if (musicItem.id === cacheMediaSource.id) {
    return {
      url: cacheMediaSource.urls[quality],
    };
  }

  cacheMediaSource = {
    id: null,
    urls: {},
  };

  const data = {
    context: {
      client: {
        screenWidthPoints: 689,
        screenHeightPoints: 963,
        screenPixelDensity: 1,
        utcOffsetMinutes: 120,
        hl: "en",
        gl: "GB",
        remoteHost: "1.1.1.1",
        deviceMake: "",
        deviceModel: "",
        userAgent:
          "com.google.android.apps.youtube.music/6.14.50 (Linux; U; Android 13; GB) gzip",
        clientName: "ANDROID_MUSIC",
        clientVersion: "6.14.50",
        osName: "Android",
        osVersion: "13",
        originalUrl:
          "https://www.youtube.com/tv?is_account_switch=1&hrld=1&fltor=1",
        theme: "CLASSIC",
        platform: "MOBILE",
        clientFormFactor: "UNKNOWN_FORM_FACTOR",
        webpSupport: false,
        timeZone: "Europe/Amsterdam",
        acceptHeader:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      },
      user: { enableSafetyMode: false },
      request: {
        internalExperimentFlags: [],
        consistencyTokenJars: [],
      },
    },
    contentCheckOk: true,
    racyCheckOk: true,
    video_id: musicItem.id,
  };

  var config = {
    method: "post",
    url: "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
    headers: {
      "Content-Type": "application/json",
    },
    data: JSON.stringify(data),
  };

  const result = (await axios(config)).data;
  const formats = result.streamingData.formats ?? [];
  const adaptiveFormats = result.streamingData.adaptiveFormats ?? [];

  [...formats, ...adaptiveFormats].forEach((it) => {
    const q = getQuality(it.quality);
    if (q && it.url && !cacheMediaSource.urls[q]) {
      cacheMediaSource.urls[q] = it.url;
    }
  });

  return {
    url: cacheMediaSource.urls[quality],
  };
}

module.exports = {
  platform: "Youtube",
  author: '猫头猫',
  version: "0.0.1",
  supportedSearchType: ["music"],
  srcUrl:
    "https://gitee.com/maotoumao/MusicFreePlugins/raw/v0.1/dist/youtube/index.js",
  cacheControl: "no-cache",
  search,
  getMediaSource,
};

