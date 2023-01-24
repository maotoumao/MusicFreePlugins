"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
const pageSize = 20;
const validMusicFilter = (_) => _.privilege === 0 || _.privilege === 8;
function formatMusicItem(_) {
    var _a, _b, _c, _d, _e, _f, _g;
    return {
        id: _.hash,
        title: _.songname,
        artist: (_a = _.singername) !== null && _a !== void 0 ? _a : (((_c = (_b = _.authors) === null || _b === void 0 ? void 0 : _b.map((_) => { var _a; return (_a = _ === null || _ === void 0 ? void 0 : _.author_name) !== null && _a !== void 0 ? _a : ""; })) === null || _c === void 0 ? void 0 : _c.join(", ")) ||
            ((_f = (_e = (_d = _.filename) === null || _d === void 0 ? void 0 : _d.split("-")) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.trim())),
        album: (_g = _.album_name) !== null && _g !== void 0 ? _g : _.remark,
        album_id: _.album_id,
        album_audio_id: _.album_audio_id,
        artwork: _.album_sizable_cover
            ? _.album_sizable_cover.replace("{size}", "400")
            : undefined,
        "320hash": _["320hash"],
        sqhash: _.sqhash,
        origin_hash: _.origin_hash,
    };
}
const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36",
    Accept: "*/*",
    "Accept-Encoding": "gzip, deflate",
    "Accept-Language": "zh-CN,zh;q=0.9",
};
async function searchMusic(query, page) {
    const res = (await axios_1.default.get("http://mobilecdn.kugou.com/api/v3/search/song", {
        headers,
        params: {
            format: "json",
            keyword: query,
            page,
            pagesize: pageSize,
            showtype: 1,
        },
    })).data;
    const songs = res.data.info.filter(validMusicFilter).map(formatMusicItem);
    return {
        isEnd: page * pageSize >= res.data.total,
        data: songs,
    };
}
async function searchAlbum(query, page) {
    const res = (await axios_1.default.get("http://msearch.kugou.com/api/v3/search/album", {
        headers,
        params: {
            version: 9108,
            iscorrection: 1,
            highlight: "em",
            plat: 0,
            keyword: query,
            pagesize: 20,
            page,
            sver: 2,
            with_res_tag: 0,
        },
    })).data;
    const albums = res.data.info.map((_) => {
        var _a;
        return ({
            id: _.albumid,
            artwork: (_a = _.imgurl) === null || _a === void 0 ? void 0 : _a.replace("{size}", "400"),
            artist: _.singername,
            title: _.albumname,
            description: _.intro,
        });
    });
    return {
        isEnd: page * 20 >= res.data.total,
        data: albums,
    };
}
async function getMediaSource(musicItem, quality) {
    let hash;
    if (quality === "low") {
        hash = musicItem.id;
    }
    else if (quality === "standard") {
        hash = musicItem["320hash"];
    }
    else if (quality === "high") {
        hash = musicItem.sqhash;
    }
    else {
        hash = musicItem.origin_hash;
    }
    if (!hash) {
        return;
    }
    const res = (await axios_1.default.get("https://wwwapi.kugou.com/yy/index.php", {
        headers,
        params: {
            r: "play/getdata",
            hash: hash,
            appid: "1014",
            mid: "56bbbd2918b95d6975f420f96c5c29bb",
            album_id: musicItem.album_id,
            album_audio_id: musicItem.album_audio_id,
            _: Date.now(),
        },
    })).data.data;
    const url = res.play_url || res.play_backup_url;
    if (!url) {
        return;
    }
    return {
        url,
        rawLrc: res.lyrics,
        artwork: res.img,
    };
}
async function getTopLists() {
    const lists = (await axios_1.default.get("http://mobilecdnbj.kugou.com/api/v3/rank/list?version=9108&plat=0&showtype=2&parentid=0&apiver=6&area_code=1&withsong=0&with_res_tag=0", {
        headers: headers,
    })).data.data.info;
    const res = [
        {
            title: "热门榜单",
            data: [],
        },
        {
            title: "特色音乐榜",
            data: [],
        },
        {
            title: "全球榜",
            data: [],
        },
    ];
    const extra = {
        title: "其他",
        data: [],
    };
    lists.forEach((item) => {
        var _a, _b, _c, _d;
        if (item.classify === 1 || item.classify === 2) {
            res[0].data.push({
                id: item.rankid,
                description: item.intro,
                coverImg: (_a = item.imgurl) === null || _a === void 0 ? void 0 : _a.replace("{size}", "400"),
                title: item.rankname,
            });
        }
        else if (item.classify === 3 || item.classify === 5) {
            res[1].data.push({
                id: item.rankid,
                description: item.intro,
                coverImg: (_b = item.imgurl) === null || _b === void 0 ? void 0 : _b.replace("{size}", "400"),
                title: item.rankname,
            });
        }
        else if (item.classify === 4) {
            res[2].data.push({
                id: item.rankid,
                description: item.intro,
                coverImg: (_c = item.imgurl) === null || _c === void 0 ? void 0 : _c.replace("{size}", "400"),
                title: item.rankname,
            });
        }
        else {
            extra.data.push({
                id: item.rankid,
                description: item.intro,
                coverImg: (_d = item.imgurl) === null || _d === void 0 ? void 0 : _d.replace("{size}", "400"),
                title: item.rankname,
            });
        }
    });
    if (extra.data.length !== 0) {
        res.push(extra);
    }
    return res;
}
async function getTopListDetail(topListItem) {
    const res = await axios_1.default.get(`http://mobilecdnbj.kugou.com/api/v3/rank/song?version=9108&ranktype=0&plat=0&pagesize=100&area_code=1&page=1&volid=35050&rankid=${topListItem.id}&with_res_tag=0`, {
        headers,
    });
    return Object.assign(Object.assign({}, topListItem), { musicList: res.data.data.info.map(formatMusicItem) });
}
async function getAlbumInfo(albumItem) {
    const res = (await axios_1.default.get("http://mobilecdn.kugou.com/api/v3/album/song", {
        params: {
            version: 9108,
            albumid: albumItem.id,
            plat: 0,
            pagesize: 100,
            area_code: 1,
            page: 1,
            with_res_tag: 0,
        },
    })).data;
    return Object.assign(Object.assign({}, albumItem), { musicList: res.data.info.filter(validMusicFilter).map((_) => {
            var _a;
            const [artist, songname] = _.filename.split("-");
            return {
                id: _.hash,
                title: songname.trim(),
                artist: artist.trim(),
                album: (_a = _.album_name) !== null && _a !== void 0 ? _a : _.remark,
                album_id: _.album_id,
                album_audio_id: _.album_audio_id,
                artwork: albumItem.artwork,
                "320hash": _["320hash"],
                sqhash: _.sqhash,
                origin_hash: _.origin_hash,
            };
        }) });
}
module.exports = {
    platform: "酷狗",
    version: "0.0.0",
    srcUrl: "https://gitee.com/maotoumao/MusicFreePlugins/raw/master/kugou.js",
    cacheControl: "no-cache",
    primaryKey: ["id", "album_id", "album_audio_id"],
    async search(query, page, type) {
        if (type === "music") {
            return await searchMusic(query, page);
        }
        else if (type === "album") {
            return await searchAlbum(query, page);
        }
    },
    getMediaSource,
    getLyric: getMediaSource,
    getTopLists,
    getTopListDetail,
    getAlbumInfo
};
