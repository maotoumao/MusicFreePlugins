"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
const pageSize = 30;
function validMusicFilter(_) {
    return `${_.pay_type}` === "0";
}
function formatMusicItem(_) {
    var _a;
    return {
        id: _.id,
        artwork: _.front_cover,
        title: _.soundstr,
        artist: _.username,
        user_id: _.user_id,
        duration: +((_a = _.duration) !== null && _a !== void 0 ? _a : 0),
    };
}
function formatAlbumItem(_) {
    return {
        id: _.id,
        artist: _.author,
        title: _.name,
        artwork: _.cover,
        description: _.abstract,
    };
}
const searchHeaders = {
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36 Edg/109.0.1518.61",
    accept: "application/json",
    "accept-encoding": "gzip, deflate, br",
    referer: "https://www.missevan.com/sound/search",
};
async function searchMusic(query, page) {
    const res = (await axios_1.default.get("https://www.missevan.com/sound/getsearch", {
        params: {
            s: query,
            p: page,
            type: 3,
            page_size: pageSize,
        },
        headers: searchHeaders,
    })).data.info;
    return {
        isEnd: res.pagination.p >= res.pagination.maxpage,
        data: res.Datas.filter(validMusicFilter).map(formatMusicItem),
    };
}
async function searchAlbum(query, page) {
    const res = (await axios_1.default.get("https://www.missevan.com/dramaapi/search", {
        headers: searchHeaders,
        params: {
            s: query,
            page,
        },
    })).data.info;
    return {
        isEnd: res.pagination.p >= res.pagination.maxpage,
        data: res.Datas.filter(validMusicFilter).map(formatAlbumItem),
    };
}
async function getAlbumInfo(albumItem) {
    const res = (await axios_1.default.get("https://www.missevan.com/dramaapi/getdrama", {
        headers: {
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36 Edg/109.0.1518.61",
            accept: "application/json",
            "accept-encoding": "gzip, deflate, br",
            referer: `https://www.missevan.com/mdrama/${albumItem.id}`,
        },
        params: {
            drama_id: albumItem.id,
        },
    })).data;
    return Object.assign(Object.assign({}, albumItem), { musicList: res.info.episodes.episode
            .filter(validMusicFilter)
            .map(_ => {
            const r = formatMusicItem(_);
            r.artwork = albumItem.artwork;
            return r;
        }) });
}
async function getMediaSource(musicItem, quality) {
    if (quality === "high" || quality === "super") {
        return;
    }
    const res = (await axios_1.default.get("https://www.missevan.com/sound/getsound", {
        headers: {
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36 Edg/109.0.1518.61",
            accept: "application/json",
            "accept-encoding": "gzip, deflate, br",
            referer: `https://www.missevan.com/sound/player?id=${musicItem.id}`,
        },
        params: {
            soundid: musicItem.id,
        },
    })).data.info;
    if (quality === "low") {
        return {
            url: res.sound.soundurl_128,
        };
    }
    else {
        return {
            url: res.sound.soundurl,
        };
    }
}
module.exports = {
    platform: "猫耳FM",
    version: "0.1.0",
    appVersion: ">0.1.0-alpha.0",
    srcUrl: "https://gitee.com/maotoumao/MusicFreePlugins/raw/v0.1/dist/maoerfm/index.js",
    cacheControl: "no-cache",
    async search(query, page, type) {
        if (type === "music") {
            return await searchMusic(query, page);
        }
        if (type === "album") {
            return await searchAlbum(query, page);
        }
    },
    getMediaSource,
    getAlbumInfo,
};
