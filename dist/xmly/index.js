"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
const dayjs = require("dayjs");
const CryptoJs = require("crypto-js");
function formatMusicItem(_) {
    var _a, _b;
    return {
        id: (_a = _.id) !== null && _a !== void 0 ? _a : _.trackId,
        artist: _.nickname,
        title: _.title,
        album: _.albumTitle,
        duration: _.duration,
        artwork: ((_b = _.coverPath) === null || _b === void 0 ? void 0 : _b.startsWith("//"))
            ? `https:${_.coverPath}`
            : _.coverPath,
    };
}
function formatAlbumItem(_) {
    var _a, _b, _c;
    return {
        id: (_a = _.albumId) !== null && _a !== void 0 ? _a : _.id,
        artist: _.nickname,
        title: _.title,
        artwork: ((_b = _.coverPath) === null || _b === void 0 ? void 0 : _b.startsWith("//"))
            ? `https:${_.coverPath}`
            : _.coverPath,
        description: (_c = _.intro) !== null && _c !== void 0 ? _c : _.description,
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
    var _a;
    return !((_a = raw.priceTypes) === null || _a === void 0 ? void 0 : _a.length);
}
function paidMusicFilter(raw) {
    return raw.tag === 0 || raw.isPaid === false || parseFloat(raw.price) === 0;
}
async function searchBase(query, page, core) {
    return (await axios_1.default.get("https://www.ximalaya.com/revision/search/main", {
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
    })).data;
}
async function searchMusic(query, page) {
    const res = (await searchBase(query, page, "track")).data.track;
    return {
        isEnd: page >= res.totalPage,
        data: res.docs.filter(paidMusicFilter).map(formatMusicItem),
    };
}
async function searchAlbum(query, page) {
    const res = (await searchBase(query, page, "album")).data.album;
    return {
        isEnd: page >= res.totalPage,
        data: res.docs.filter(paidAlbumFilter).map(formatAlbumItem),
    };
}
async function searchArtist(query, page) {
    const res = (await searchBase(query, page, "user")).data.user;
    return {
        isEnd: page >= res.totalPage,
        data: res.docs.map(formatArtistItem),
    };
}
async function getAlbumInfo(albumItem, page = 1) {
    const res = await axios_1.default.get("https://www.ximalaya.com/revision/album/v1/getTracksList", {
        params: {
            albumId: albumItem.id,
            pageNum: page,
            pageSize: 50,
        },
    });
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
async function search(query, page, type) {
    if (type === "music") {
        return searchMusic(query, page);
    }
    else if (type === "album") {
        return searchAlbum(query, page);
    }
    else if (type === "artist") {
        return searchArtist(query, page);
    }
}
async function getMediaSource(musicItem, quality) {
    if (quality !== "standard") {
        return;
    }
    const info = (await axios_1.default.get(`https://www.ximalaya.com/mobile-playpage/track/v3/baseInfo/${Date.now()}?device=www&trackId=${musicItem.id}&trackQualityLevel=1`)).data;
    const trackInfo = info.trackInfo;
    const { playUrlList } = trackInfo;
    const encodeText = playUrlList[0].url;
    const url = CryptoJs.AES.decrypt({
        ciphertext: CryptoJs.enc.Base64url.parse(encodeText),
    }, CryptoJs.enc.Hex.parse("aaad3e4fd540b0f79dca95606e72bf93"), {
        mode: CryptoJs.mode.ECB,
        padding: CryptoJs.pad.Pkcs7,
    }).toString(CryptoJs.enc.Utf8);
    return {
        url,
    };
}
async function getArtistWorks(artistItem, page, type) {
    if (type === "music") {
        const res = (await axios_1.default.get("https://www.ximalaya.com/revision/user/track", {
            params: {
                page,
                pageSize: 30,
                uid: artistItem.id,
            },
        })).data.data;
        return {
            isEnd: res.page * res.pageSize >= res.totalCount,
            data: res.trackList.filter(paidMusicFilter).map((_) => (Object.assign(Object.assign({}, formatMusicItem(_)), { artist: artistItem.name }))),
        };
    }
    else {
        const res = (await axios_1.default.get("https://www.ximalaya.com/revision/user/pub", {
            params: {
                page,
                pageSize: 30,
                uid: artistItem.id,
            },
        })).data.data;
        return {
            isEnd: res.page * res.pageSize >= res.totalCount,
            data: res.albumList.filter(paidAlbumFilter).map((_) => (Object.assign(Object.assign({}, formatAlbumItem(_)), { artist: artistItem.name }))),
        };
    }
}
module.exports = {
    platform: "喜马拉雅",
    author: '猫头猫',
    version: "0.1.6",
    supportedSearchType: ["music", "album", "artist"],
    srcUrl: "https://gitee.com/maotoumao/MusicFreePlugins/raw/v0.1/dist/xmly/index.js",
    cacheControl: "no-cache",
    search,
    getAlbumInfo,
    getMediaSource,
    getArtistWorks,
};
