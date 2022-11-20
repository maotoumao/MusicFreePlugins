function qq(packages) {
    const { axios, CryptoJs } = packages;

    const pageSize = 20;

    function formatMusicItem(_) {
        const albumid = _.albumid || (_.album || {}).id;
        const albummid = _.albummid || (_.album || {}).mid;
        const albumname = _.albumname || (_.album || {}).title;
        return {
            id: _.id || _.songid,
            songmid: _.mid || _.songmid,
            title: _.title || _.songname,
            artist: _.singer.map(s => s.name).join(', '),
            artwork: albummid ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${albummid}.jpg` : undefined,
            album: albumname,
            lrc: _.lyric || undefined,
            albumid: albumid,
            albummid: albummid,
        }
    }

    function formatAlbumItem(_) {
        return {
            id: _.albumID || _.albumid,
            albumMID: _.albumMID || _.album_mid,
            title: _.albumName || _.album_name,
            artwork: _.albumPic || `https://y.gtimg.cn/music/photo_new/T002R300x300M000${_.albumMID || _.album_mid}.jpg`,
            date: _.publicTime || _.pub_time,
            singerID: _.singerID || _.singer_id,
            artist: _.singerName || _.singer_name,
            singerMID: _.singerMID || _.singer_mid,
            description: _.desc
        }
    }

    function formatArtistItem(_) {
        return {
            name: _.singerName,
            id: _.singerID,
            singerMID: _.singerMID,
            avatar: _.singerPic,
            worksNum: _.songNum
        }
    }

    const searchTypeMap = {
        0: 'song',
        2: 'album',
        1: 'singer',
        3: 'songlist',
        7: 'lyric',
        12: 'mv',
    };

    const headers = {
        referer: 'https://y.qq.com',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
        Cookie: 'uin='
    }

    const validSongFilter = (item) => {
        return item.pay.pay_play === 0 || item.pay.payplay === 0
    }

    async function searchBase(query, page, type) {

        const res = (await axios({
            "url": "https://u.y.qq.com/cgi-bin/musicu.fcg",
            "method": "POST",
            "data": {
                "req_1": {
                    "method": "DoSearchForQQMusicDesktop",
                    "module": "music.search.SearchCgiService",
                    "param": {
                        "num_per_page": pageSize,
                        "page_num": page,
                        "query": query,
                        "search_type": type
                    }
                }
            },
            "headers": headers,
            "xsrfCookieName": "XSRF-TOKEN",
            "withCredentials": true
        }
        )).data;

        return {
            isEnd: res.req_1.data.meta.sum <= page * pageSize,
            data: res.req_1.data.body[searchTypeMap[type]].list
        }
    }


    async function searchMusic(query, page) {
        const songs = await searchBase(query, page, 0);

        return {
            isEnd: songs.isEnd,
            data: songs.data.filter(validSongFilter).map(formatMusicItem)
        }
    }

    async function searchAlbum(query, page) {
        const albums = await searchBase(query, page, 2);

        return {
            isEnd: albums.isEnd,
            data: albums.data.map(formatAlbumItem)
        }
    }


    async function searchArtist(query, page) {
        const artists = await searchBase(query, page, 1);

        return {
            isEnd: artists.isEnd,
            data: artists.data.map(formatArtistItem)
        }
    }


    function getQueryFromUrl(key, search) {
        try {
            const sArr = search.split('?');
            let s = '';
            if (sArr.length > 1) {
                s = sArr[1];
            } else {
                return key ? undefined : {};
            }
            const querys = s.split('&');
            const result = {};
            querys.forEach((item) => {
                const temp = item.split('=');
                result[temp[0]] = decodeURIComponent(temp[1]);
            });
            return key ? result[key] : result;
        } catch (err) {
            // 除去search为空等异常
            return key ? '' : {};
        }
    }

    // geturl 
    function changeUrlQuery(obj, baseUrl) {
        const query = getQueryFromUrl(null, baseUrl);
        let url = baseUrl.split('?')[0];

        const newQuery = { ...query, ...obj };
        let queryArr = [];
        Object.keys(newQuery).forEach((key) => {
            if (newQuery[key] !== undefined && newQuery[key] !== '') {
                queryArr.push(`${key}=${encodeURIComponent(newQuery[key])}`);
            }
        });
        return `${url}?${queryArr.join('&')}`.replace(/\?$/, '');
    }

    const typeMap = {
        m4a: {
            s: 'C400',
            e: '.m4a',
        },
        128: {
            s: 'M500',
            e: '.mp3',
        },
        320: {
            s: 'M800',
            e: '.mp3',
        },
        ape: {
            s: 'A000',
            e: '.ape',
        },
        flac: {
            s: 'F000',
            e: '.flac',
        },
    };

    async function getSourceUrl(id, type = '128') {
        const mediaId = id;
        let uin = ''
        const guid = (Math.random() * 10000000).toFixed(0);
        const typeObj = typeMap[type];
        const file = `${typeObj.s}${id}${mediaId}${typeObj.e}`;
        const url = changeUrlQuery({
            '-': 'getplaysongvkey',
            g_tk: 5381,
            loginUin: uin,
            hostUin: 0,
            format: 'json',
            inCharset: 'utf8',
            outCharset: 'utf-8¬ice=0',
            platform: 'yqq.json',
            needNewCode: 0,
            data: JSON.stringify({
                req_0: {
                    module: 'vkey.GetVkeyServer',
                    method: 'CgiGetVkey',
                    param: {
                        filename: [file],
                        guid: guid,
                        songmid: [id],
                        songtype: [0],
                        uin: uin,
                        loginflag: 1,
                        platform: '20',
                    },
                },
                comm: {
                    uin: uin,
                    format: 'json',
                    ct: 19,
                    cv: 0,
                    authst: '',
                },
            }),
        }, 'https://u.y.qq.com/cgi-bin/musicu.fcg')
        return (await axios({
            method: 'GET',
            url: url,
            xsrfCookieName: 'XSRF-TOKEN',
            withCredentials: true
        })).data
    }


    async function getAlbumInfo(albumItem) {
        const url = changeUrlQuery({
            data: JSON.stringify({
                comm: {
                    ct: 24,
                    cv: 10000
                },
                albumSonglist: {
                    method: "GetAlbumSongList",
                    param: {
                        albumMid: albumItem.albumMID,
                        albumID: 0,
                        begin: 0,
                        num: 999,
                        order: 2
                    },
                    module: "music.musichallAlbum.AlbumSongList"
                }
            })
        }, 'https://u.y.qq.com/cgi-bin/musicu.fcg?g_tk=5381&format=json&inCharset=utf8&outCharset=utf-8');
        const res = (await axios({
            "url": url,
            "headers": headers,
            "xsrfCookieName": "XSRF-TOKEN",
            "withCredentials": true
        }
        )).data;
        return {
            ...albumItem,
            musicList: res.albumSonglist.data.songList.filter(_ => validSongFilter(_.songInfo)).map((item) => {
                const _ = item.songInfo;
                return formatMusicItem(_)
            })
        }
    }

    async function getArtistSongs(artistItem, page) {
        const url = changeUrlQuery({
            data: JSON.stringify({
                comm: {
                    ct: 24,
                    cv: 0
                },
                singer: {
                    method: "get_singer_detail_info",
                    param: {
                        sort: 5,
                        singermid: artistItem.singerMID,
                        sin: (page - 1) * pageSize,
                        num: pageSize,
                    },
                    module: "music.web_singer_info_svr"
                }
            })
        }, 'http://u.y.qq.com/cgi-bin/musicu.fcg')

        const res = (await axios({
            "url": url,
            "method": "get",
            "headers": headers,
            "xsrfCookieName": "XSRF-TOKEN",
            "withCredentials": true
        }
        )).data;
        return {
            isEnd: res.singer.data.total_song <= page * pageSize,
            data: res.singer.data.songlist.filter(validSongFilter).map(formatMusicItem)
        }
    }

    async function getArtistAlbums(artistItem, page) {
        const url = changeUrlQuery({
            data: JSON.stringify({
                comm: {
                    ct: 24,
                    cv: 0
                },
                singerAlbum: {
                    method: "get_singer_album",
                    param: {
                        singermid: artistItem.singerMID,
                        order: "time",
                        begin: (page - 1) * pageSize,
                        num: pageSize / 1,
                        exstatus: 1
                    },
                    module: "music.web_singer_info_svr"
                }
            })
        }, 'http://u.y.qq.com/cgi-bin/musicu.fcg');
        const res = (await axios({
            url,
            "method": "get",
            "headers": headers,
            "xsrfCookieName": "XSRF-TOKEN",
            "withCredentials": true
        }
        )).data;
        return {
            isEnd: res.singerAlbum.data.total <= page * pageSize,
            data: res.singerAlbum.data.list.map(formatAlbumItem)
        }
    }

    async function getArtistWorks(artistItem, page, type) {
        if (type === 'music') {
            return getArtistSongs(artistItem, page);
        }
        if (type === 'album') {
            return getArtistAlbums(artistItem, page);
        }

    }

    async function getLyric(musicItem) {
        const result = (await axios({
            "url": `http://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?songmid=${musicItem.songmid}&pcachetime=${new Date().getTime()}&g_tk=5381&loginUin=0&hostUin=0&inCharset=utf8&outCharset=utf-8&notice=0&platform=yqq&needNewCode=0`,
            "headers": { "Referer": "https://y.qq.com", "Cookie": "uin=" },
            "method": "get",
            "xsrfCookieName": "XSRF-TOKEN",
            "withCredentials": true
        }
        )).data;

        const res = JSON.parse(result.replace(/callback\(|MusicJsonCallback\(|jsonCallback\(|\)$/g, ''))

        return {
            rawLrc: CryptoJs.enc.Base64.parse(res.lyric).toString(CryptoJs.enc.Utf8)
        }
    }

    async function importMusicSheet(urlLike) {
        //
        let id;
        if (!id) {
            id = (urlLike.match(/https?:\/\/i\.y\.qq\.com\/n2\/m\/share\/details\/taoge\.html\?.*id=([0-9]+)/) || [])[1];
        }
        if (!id) {
            id = (urlLike.match(/https?:\/\/y\.qq\.com\/n\/ryqq\/playlist\/([0-9]+)/) || [])[1];
        }
        if (!id) {
            return;
        }

        const result = (await axios({
            "url": `http://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg?type=1&utf8=1&disstid=${id}&loginUin=0`,
            "headers": { "Referer": "https://y.qq.com/n/yqq/playlist", "Cookie": "uin=" },
            "method": "get",
            "xsrfCookieName": "XSRF-TOKEN",
            "withCredentials": true
        }
        )).data;
        const res = JSON.parse(result.replace(/callback\(|MusicJsonCallback\(|jsonCallback\(|\)$/g, ''))
        console.log(res);
        return res.cdlist[0].songlist.filter(validSongFilter).map(formatMusicItem);
    }

    // 接口参考：https://jsososo.github.io/QQMusicApi/#/
    return {
        platform: 'QQ音乐',
        version: '0.0.2',
        srcUrl: 'https://gitee.com/maotoumao/MusicFreePlugins/raw/master/qq.js',
        cacheControl: 'no-cache',
        async search(query, page, type) {
            if (type === 'music') {
                return await searchMusic(query, page);
            }
            if (type === 'album') {
                return await searchAlbum(query, page);
            }
            if (type === 'artist') {
                return await searchArtist(query, page);
            }
        },
        async getMediaSource(musicItem) {
            let purl = '';
            let domain = '';
            const result = await getSourceUrl(musicItem.songmid);
            if (result.req_0 && result.req_0.data && result.req_0.data.midurlinfo) {
                purl = result.req_0.data.midurlinfo[0].purl;
            }
            if (domain === '') {
                domain =
                    result.req_0.data.sip.find(i => !i.startsWith('http://ws')) ||
                    result.req_0.data.sip[0];
            }

            return {
                url: `${domain}${purl}`
            };
        },
        getLyric,
        getAlbumInfo,
        getArtistWorks,
        importMusicSheet
    }
}