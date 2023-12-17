import axios from "axios";
import dayjs = require("dayjs");
import CryptoJs = require("crypto-js");

function formatMusicItem(_) {
  return {
    id: _.id ?? _.trackId,
    artist: _.nickname,
    title: _.title,
    album: _.albumTitle,
    duration: _.duration,
    artwork: _.coverPath?.startsWith("//")
      ? `https:${_.coverPath}`
      : _.coverPath,
  };
}

function formatAlbumItem(_) {
  return {
    id: _.albumId ?? _.id,
    artist: _.nickname,
    title: _.title,
    artwork: _.coverPath?.startsWith("//")
      ? `https:${_.coverPath}`
      : _.coverPath,
    description: _.intro ?? _.description,
    date: _.updatedAt ? dayjs(_.updatedAt).format("YYYY-MM-DD") : null,
  };
}

function formatArtistItem(_) {
  return {
    name: _.nickname,
    id: _.uid,
    fans: _.followersCount,
    description: _.description,
    avatar: _.logoPic,
    worksNum: _.tracksCount,
  };
}

function paidAlbumFilter(raw) {
  return !raw.priceTypes?.length;
}

function paidMusicFilter(raw) {
  return raw.tag === 0 || raw.isPaid === false || parseFloat(raw.price) === 0;
}

async function searchBase(query: string, page: number, core: string) {
  return (
    await axios.get("https://www.ximalaya.com/revision/search/main", {
      params: {
        kw: query,
        page: page,
        spellchecker: true,
        condition: "relation",
        rows: 20,
        device: "iPhone",
        core,
        paidFilter: true,
      },
    })
  ).data;
}

async function searchMusic(query: string, page: number) {
  const res = (await searchBase(query, page, "track")).data.track;
  return {
    isEnd: page >= res.totalPage,
    data: res.docs.filter(paidMusicFilter).map(formatMusicItem),
  };
}

async function searchAlbum(query: string, page: number) {
  const res = (await searchBase(query, page, "album")).data.album;
  return {
    isEnd: page >= res.totalPage,
    data: res.docs.filter(paidAlbumFilter).map(formatAlbumItem),
  };
}

async function searchArtist(query: string, page: number) {
  const res = (await searchBase(query, page, "user")).data.user;
  return {
    isEnd: page >= res.totalPage,
    data: res.docs.map(formatArtistItem),
  };
}

async function getAlbumInfo(albumItem: IAlbum.IAlbumItem, page: number = 1) {
  const res = await axios.get(
    "https://www.ximalaya.com/revision/album/v1/getTracksList",
    {
      params: {
        albumId: albumItem.id,
        pageNum: page,
        pageSize: 50,
      },
    }
  );
  return {
    isEnd: page * 50 >= res.data.data.trackTotalCount,
    albumItem: {
      worksNum: res.data.data.trackTotalCount,
    },
    musicList: res.data.data.tracks.filter(paidMusicFilter).map((_) => {
      const r = formatMusicItem(_);
      r.artwork = albumItem.artwork;
      r.artist = albumItem.artist;
      return r;
    }),
  };
}

async function search(query, page, type: ICommon.SupportMediaType) {
  if (type === "music") {
    return searchMusic(query, page);
  } else if (type === "album") {
    return searchAlbum(query, page);
  } else if (type === "artist") {
    return searchArtist(query, page);
  }
}

async function getMediaSource(
  musicItem: IMusic.IMusicItem,
  quality: IMusic.IQualityKey
) {
  if (quality !== "standard") {
    return;
  }

  const info = (
    await axios.get(
      `https://www.ximalaya.com/mobile-playpage/track/v3/baseInfo/${Date.now()}?device=www&trackId=${
        musicItem.id
      }&trackQualityLevel=1`
    )
  ).data;

  const trackInfo = info.trackInfo;
  const { playUrlList } = trackInfo;

  const encodeText = playUrlList[0].url;

  const url = CryptoJs.AES.decrypt(
    // @ts-ignore
    {
      ciphertext: CryptoJs.enc.Base64url.parse(encodeText),
    },
    CryptoJs.enc.Hex.parse("aaad3e4fd540b0f79dca95606e72bf93"),
    {
      mode: CryptoJs.mode.ECB,
      padding: CryptoJs.pad.Pkcs7,
    }
  ).toString(CryptoJs.enc.Utf8);

  return {
    url,
  };
}

async function getArtistWorks(artistItem, page, type) {
  if (type === "music") {
    const res = (
      await axios.get("https://www.ximalaya.com/revision/user/track", {
        params: {
          page,
          pageSize: 30,
          uid: artistItem.id,
        },
      })
    ).data.data;
    return {
      isEnd: res.page * res.pageSize >= res.totalCount,
      data: res.trackList.filter(paidMusicFilter).map((_) => ({
        ...formatMusicItem(_),
        artist: artistItem.name,
      })),
    };
  } else {
    const res = (
      await axios.get("https://www.ximalaya.com/revision/user/pub", {
        params: {
          page,
          pageSize: 30,
          uid: artistItem.id,
        },
      })
    ).data.data;
    return {
      isEnd: res.page * res.pageSize >= res.totalCount,
      data: res.albumList.filter(paidAlbumFilter).map((_) => ({
        ...formatAlbumItem(_),
        artist: artistItem.name,
      })),
    };
  }
}

module.exports = {
  platform: "喜马拉雅",
  author: '猫头猫',
  version: "0.1.6",
  supportedSearchType: ["music", "album", "artist"],
  srcUrl:
    "https://gitee.com/maotoumao/MusicFreePlugins/raw/v0.1/dist/xmly/index.js",
  cacheControl: "no-cache",
  search,
  getAlbumInfo,
  getMediaSource,
  getArtistWorks,
};

