"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
const he = require("he");
const cookies_1 = require("@react-native-cookies/cookies");
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const pageSize = 30;
function getRandomCsrf() {
    return Array(11)
        .fill(0)
        .map((_) => alphabet[Math.floor(Math.random() * 36)])
        .join("");
}
async function getHeaders() {
    var _a, _b, _c;
    await cookies_1.default.flush();
    const csrfToken = (_c = (_b = (_a = (await cookies_1.default.get("www.kuwo.cn"))) === null || _a === void 0 ? void 0 : _a.kw_token) === null || _b === void 0 ? void 0 : _b.value) !== null && _c !== void 0 ? _c : getRandomCsrf();
    return {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36 Edg/89.0.774.63",
        accept: "application/json, text/plain, */*",
        "accept-encoding": "gzip, deflate, br",
        csrf: csrfToken,
        cookie: `kw_token=${csrfToken}`,
        referer: "http://www.kuwo.cn/",
        host: "www.kuwo.cn",
        "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
    };
}
function formatMusicItem(_) {
    return {
        id: _.rid,
        artwork: _.pic || _.albumpic || _.pic120,
        title: he.decode(_.name || ""),
        artist: he.decode(_.artist || ""),
        album: he.decode(_.album || ""),
    };
}
function formatAlbumItem(_) {
    return {
        id: _.albumid,
        artist: he.decode(_.artist || ""),
        title: he.decode(_.album || ""),
        artwork: _.pic,
        description: he.decode(_.albuminfo || ""),
        date: _.releaseDate,
    };
}
async function searchMusic(query, page) {
    const headers = await getHeaders();
    const res = await (0, axios_1.default)({
        method: "get",
        url: `http://www.kuwo.cn/api/www/search/searchMusicBykeyWord?key=${query}&pn=${page}&rn=${pageSize}&httpStatus=1`,
        headers,
    });
    const songs = res.data.data.list
        .filter((_) => !_.isListenFee)
        .map(formatMusicItem);
    return {
        isEnd: res.data.data.total <= page * pageSize,
        data: songs,
    };
}
async function searchAlbum(query, page) {
    const headers = await getHeaders();
    const res = (await axios_1.default.get("http://www.kuwo.cn/api/www/search/searchAlbumBykeyWord", {
        headers,
        params: {
            key: query,
            pn: page,
            rn: pageSize,
            httpStatus: 1,
        },
    })).data;
    const albums = res.data.albumList.map(formatAlbumItem);
    return {
        isEnd: res.data.total <= page * pageSize,
        data: albums,
    };
}
async function searchArtist(query, page) {
    const headers = await getHeaders();
    const res = (await axios_1.default.get("http://www.kuwo.cn/api/www/search/searchArtistBykeyWord", {
        headers,
        params: {
            key: query,
            pn: page,
            rn: pageSize,
            httpStatus: 1,
        },
    })).data;
    const artists = res.data.list.map((_) => ({
        name: he.decode(_.name),
        id: _.id,
        avatar: _.pic || _.pic120 || _.pic700 || _.pic70,
        worksNum: _.musicNum,
    }));
    return {
        isEnd: res.data.total <= page * pageSize,
        data: artists,
    };
}
async function getArtistMusicWorks(artistItem, page) {
    const headers = await getHeaders();
    const res = (await axios_1.default.get("http://www.kuwo.cn/api/www/artist/artistMusic", {
        headers: Object.assign(Object.assign({}, headers), { referer: `http://www.kuwo.cn/singer_detail/${artistItem.id}` }),
        params: {
            artistid: artistItem.id,
            pn: page,
            rn: pageSize,
            httpStatus: 1,
        },
    })).data;
    const musicList = res.data.list
        .filter((_) => !_.isListenFee)
        .map(formatMusicItem);
    return {
        isEnd: res.data.total <= page * pageSize,
        data: musicList,
    };
}
async function getArtistAlbumWorks(artistItem, page) {
    const headers = await getHeaders();
    const res = (await axios_1.default.get("http://www.kuwo.cn/api/www/artist/artistAlbum", {
        headers: Object.assign(Object.assign({}, headers), { referer: `http://www.kuwo.cn/singer_detail/${artistItem.id}` }),
        params: {
            artistid: artistItem.id,
            pn: page,
            rn: pageSize,
            httpStatus: 1,
        },
    })).data;
    const albumList = res.data.albumList.map(formatAlbumItem);
    return {
        isEnd: res.data.total <= page * pageSize,
        data: albumList,
    };
}
async function getArtistWorks(artistItem, page, type) {
    if (type === "music") {
        return getArtistMusicWorks(artistItem, page);
    }
    else if (type === "album") {
        return getArtistAlbumWorks(artistItem, page);
    }
}
async function getLyric(musicItem) {
    const headers = await getHeaders();
    const res = (await axios_1.default.get("http://m.kuwo.cn/newh5/singles/songinfoandlrc", {
        headers,
        params: {
            musicId: musicItem.id,
            httpStatus: 1,
        },
    })).data;
    const list = res.data.lrclist;
    return {
        rawLrc: list.map((_) => `[${_.time}]${_.lineLyric}`).join("\n"),
    };
}
async function getAlbumInfo(albumItem) {
    const headers = await getHeaders();
    const res = (await axios_1.default.get("http://www.kuwo.cn/api/www/album/albumInfo", {
        headers,
        params: {
            albumId: albumItem.id,
            httpStatus: 1,
        },
    })).data;
    return {
        musicList: res.data.musicList
            .filter((_) => !_.isListenFee)
            .map(formatMusicItem),
    };
}
async function getTopLists() {
    var _a;
    const rawHtml = (await axios_1.default.get("http://www.kuwo.cn/rankList", {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
            Referer: "http://www.kuwo.cn/rankList",
            Host: "www.kuwo.cn",
        },
    })).data;
    const funcString = (_a = rawHtml.match(/<script>\s*window\.__NUXT__\s*=\s*(.+?)<\/script>/)) === null || _a === void 0 ? void 0 : _a[1];
    const result = Function(`return ${funcString};`)();
    return result.data[0].bangMenu.map((e) => ({
        title: e.name,
        data: e.list.map((_) => ({
            id: _.sourceid,
            coverImg: _.pic,
            title: _.name,
            description: _.intro,
        })),
    }));
}
async function getTopListDetail(topListItem) {
    const headers = await getHeaders();
    const res = await axios_1.default.get(`http://www.kuwo.cn/api/www/bang/bang/musicList?bangId=${topListItem.id}&pn=1&rn=30&httpsStatus=1`, {
        headers,
    });
    return Object.assign(Object.assign({}, topListItem), { musicList: res.data.data.musicList.map(formatMusicItem) });
}
async function getMusicSheetResponseById(id, page, pagesize = 50) {
    const headers = await getHeaders();
    return (await axios_1.default.get(`http://www.kuwo.cn/api/www/playlist/playListInfo?pid=${id}&pn=${page}&rn=${pagesize}&httpsStatus=1`, {
        headers,
    })).data;
}
async function importMusicSheet(urlLike) {
    var _a, _b;
    let id;
    if (!id) {
        id = (_a = urlLike.match(/https?:\/\/www\/kuwo\.cn\/playlist_detail\/(\d+)/)) === null || _a === void 0 ? void 0 : _a[1];
    }
    if (!id) {
        id = (_b = urlLike.match(/https?:\/\/m\.kuwo\.cn\/h5app\/playlist\/(\d+)/)) === null || _b === void 0 ? void 0 : _b[1];
    }
    if (!id) {
        id = urlLike.match(/^\s*(\d+)\s*$/);
    }
    if (!id) {
        return;
    }
    let page = 1;
    let totalPage = 30;
    let musicList = [];
    while (page < totalPage) {
        try {
            const data = await getMusicSheetResponseById(id, page, 80);
            totalPage = Math.ceil(data.data.total / 80);
            if (isNaN(totalPage)) {
                totalPage = 1;
            }
            musicList = musicList.concat(data.data.musicList
                .filter((_) => !_.isListenFee)
                .map(formatMusicItem));
        }
        catch (_c) { }
        await new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, 200 + Math.random() * 100);
        });
        ++page;
    }
    return musicList;
}
module.exports = {
    platform: "酷我",
    version: "0.1.0",
    appVersion: ">0.1.0-alpha.0",
    srcUrl: "https://gitee.com/maotoumao/MusicFreePlugins/raw/v0.1/dist/kuwo/index.js",
    cacheControl: "no-cache",
    hints: {
        importMusicSheet: [
            '酷我APP：自建歌单-分享-复制试听链接，直接粘贴即可',
            'H5：复制URL并粘贴，或者直接输入纯数字歌单ID即可',
            '导入过程中会过滤掉所有VIP/试听/收费音乐，导入时间和歌单大小有关，请耐心等待'
        ]
    },
    async search(query, page, type) {
        if (type === "music") {
            return await searchMusic(query, page);
        }
        if (type === "album") {
            return await searchAlbum(query, page);
        }
        if (type === "artist") {
            return await searchArtist(query, page);
        }
    },
    async getMediaSource(musicItem, quality) {
        if (quality === "super") {
            return;
        }
        let br;
        if (quality === "low") {
            br = "128kmp3";
        }
        else if (quality === "standard") {
            br = "192kmp3";
        }
        else {
            br = "320kmp3";
        }
        const headers = await getHeaders();
        const res = (await axios_1.default.get("http://www.kuwo.cn/api/v1/www/music/playUrl", {
            headers,
            params: {
                mid: musicItem.id,
                type: "music",
                br,
                httpStatus: 1,
            },
        })).data;
        return {
            url: res.data.url,
        };
    },
    getAlbumInfo,
    getLyric,
    getArtistWorks,
    getTopLists,
    getTopListDetail,
    importMusicSheet
};
