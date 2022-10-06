function bilibili(packages) {
    const { axios, dayjs } = packages;
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
    function durationToSec(duration) {
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
            cookie = await axios.get(
                "https://api.bilibili.com/x/frontend/finger/spi",
                { headers: searchHeaders }
            );
        }
    }
    const pageSize = 30;
    async function searchBase(keyword, page, searchType) {
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
            platform: 'pc',
            from_source: '',
            search_type: searchType,
            dynamic_offset: 0
        };
        const res = (
            await axios.get(
                "https://api.bilibili.com/x/web-interface/search/type",
                {
                    headers: {
                        ...searchHeaders,
                        cookie: `buvid3=${cookie.b_3};buvid4=${cookie.b_4}`,
                    },
                    params: params,
                }
            )
        ).data;
        return res.data;
    }

    async function searchAlbum(keyword, page) {
        const resultData = await searchBase(keyword, page, 'video');
        const albums = resultData.result.map(function (result) {
            return {
                id:
                    result["bvid"] !== null && result["bvid"] !== void 0
                        ? result["bvid"]
                        : result["aid"],
                aid: result.aid,
                bvid: result.bvid,
                artist: result.author,
                title:
                    result.title === null || result.title === void 0
                        ? void 0
                        : result.title.replace(/(\<em(.*?)\>)|(\<\/em\>)/g, ""),
                album:
                    result["bvid"] !== null && result["bvid"] !== void 0
                        ? result["bvid"]
                        : result["aid"],
                artwork: "http:".concat(result.pic),
                description: result.description,
                duration: durationToSec(result.duration),
                tags:
                    result.tag === null || result.tag === void 0
                        ? void 0
                        : result.tag.split(","),
                date: dayjs.unix(result.pubdate).format("YYYY-MM-DD"),
            };
        })
        return {
            isEnd: resultData.numResults <= page * pageSize,
            data: albums
        }

    }

    async function searchArtist(keyword, page) {
        const resultData = await searchBase(keyword, page, 'bili_user');
        const artists = resultData.result.map(result => ({
            name: result.uname,
            id: result.mid,
            fans: result.fans,
            description: result.usign,
            avatar: result.upic,
            worksNum: result.videos
        }));
        return {
            isEnd: resultData.numResults <= page * pageSize,
            data: artists
        }
    }

    async function getArtistWorks(artistItem, page, type) {
        if (type !== 'album') {
            return;
        }

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
            "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
        };

        await getCookie();
        const params = {
            mid: artistItem.id,
            ps: 30,
            tid: 0,
            pn: page,
            order: 'pubdate',
            jsonp: 'jsonp'
        };
        const res = (
            await axios.get(
                "https://api.bilibili.com/x/space/arc/search",
                {
                    headers: {
                        ...queryHeaders,
                        cookie: `buvid3=${cookie.b_3};buvid4=${cookie.b_4}`,
                    },
                    params: params,
                }
            )
        ).data;
        const resultData = res.data;
        const albums = resultData.list.vlist.map(function (result) {
            return {
                id:
                    result["bvid"] !== null && result["bvid"] !== void 0
                        ? result["bvid"]
                        : result["aid"],
                aid: result.aid,
                bvid: result.bvid,
                artist: result.author,
                title:
                    result.title === null || result.title === void 0
                        ? void 0
                        : result.title.replace(/(\<em(.*?)\>)|(\<\/em\>)/g, ""),
                album:
                    result["bvid"] !== null && result["bvid"] !== void 0
                        ? result["bvid"]
                        : result["aid"],
                artwork: result.pic,
                description: result.description,
                duration: durationToSec(result.length),
                tags:
                    result.tag === null || result.tag === void 0
                        ? void 0
                        : result.tag.split(","),
                date: dayjs.unix(result.created).format("YYYY-MM-DD"),
            }
        })

        return {
            isEnd: resultData.page.pn * resultData.page.ps >= resultData.page.count,
            data: albums
        }

    }

    return {
        platform: "bilibili",
        appVersion: ">=0.0",
        version: '0.0.1',
        defaultSearchType: 'album',
        cacheControl: 'no-cache',
        srcUrl: 'https://gitee.com/maotoumao/MusicFreePlugins/raw/master/bilibili.js',
        primaryKey: ['id', 'aid', 'bvid', 'cid'],
        async search(keyword, page, type) {
            if (type === 'album') {
                return await searchAlbum(keyword, page);
            }
            if (type === 'artist') {
                return await searchArtist(keyword, page);
            }
        },

        async getMediaSource(musicItem) {
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
                url = res.data.dash.audio[0].baseUrl;
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
        },

        async getAlbumInfo(albumItem) {
            const cidRes = await getCid(albumItem.bvid, albumItem.aid);

            const _ref2 =
                cidRes.data !== null && cidRes.data !== void 0 ? cidRes.data : {};
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
                ...albumItem,
                musicList
            };
        },

        getArtistWorks
    };

}
