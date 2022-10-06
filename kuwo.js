function kuwo(packages) {
    const { axios, he, CookieManager } = packages;

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const pageSize = 30;
    function getRandomCsrf() {
        return Array(11).fill(0).map(_ => alphabet[Math.floor(Math.random() * 36)]).join('');
    }

    async function getHeaders() {
        await CookieManager.flush();
        const csrfToken = (await CookieManager.get('www.kuwo.cn'))?.kw_token?.value ?? getRandomCsrf();

        return {
            "user-agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36 Edg/89.0.774.63",
            accept: "application/json, text/plain, */*",
            "accept-encoding": "gzip, deflate, br",
            csrf: csrfToken,
            cookie: `kw_token=${csrfToken}`,
            referer: "http://www.kuwo.cn/",
            host: 'www.kuwo.cn',
            "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
        };
    }

    function formatMusicItem(_){
        return {
            id: _.rid,
            artwork: _.pic || _.albumpic || _.pic120,
            title: he.decode(_.name || ''),
            artist: he.decode(_.artist || ''),
            album: he.decode(_.album || '')
        }
    }

    function formatAlbumItem(_) {
        return {
            id: _.albumid,
            artist: he.decode(_.artist || ''),
            title: he.decode(_.album || ''),
            artwork: _.pic,
            description: he.decode(_.albuminfo || ''),
            date: _.releaseDate,
        }
    }

    async function searchMusic(query, page) {
        const headers = await getHeaders();
        const res = (await axios({
            method: 'get',
            url: `http://www.kuwo.cn/api/www/search/searchMusicBykeyWord?key=${query}&pn=${page}&rn=${pageSize}&httpStatus=1`,
            headers,
        }));
        const songs = res.data.data.list.filter(_ => !_.isListenFee).map(formatMusicItem)

        return {
            isEnd: res.data.data.total <= page * pageSize,
            data: songs
        }
    }

    async function searchAlbum(query, page) {
        const headers = await getHeaders();
        const res = (await axios.get('http://www.kuwo.cn/api/www/search/searchAlbumBykeyWord', {
            headers,
            params: {
                key: query,
                pn: page,
                rn: pageSize,
                httpStatus: 1
            }
        })).data;
        const albums = res.data.albumList.map(formatAlbumItem)

        return {
            isEnd: res.data.total <= page * pageSize,
            data: albums
        }

    }

    async function searchArtist(query, page) {
        const headers = await getHeaders();
        const res = (await axios.get('http://www.kuwo.cn/api/www/search/searchArtistBykeyWord', {
            headers,
            params: {
                key: query,
                pn: page,
                rn: pageSize,
                httpStatus: 1
            }
        })).data;
        const artists = res.data.list.map(_ => ({
            name: he.decode(_.name),
            id: _.id,
            avatar: _.pic || _.pic120 || _.pic700 || _.pic70,
            worksNum: _.musicNum
        }))

        return {
            isEnd: res.data.total <= page * pageSize,
            data: artists
        }
    }

    async function getArtistMusicWorks (artistItem, page) {
        const headers = await getHeaders();
        const res = (await axios.get('http://www.kuwo.cn/api/www/artist/artistMusic', {
            headers: {
                ...headers,
                referer: `http://www.kuwo.cn/singer_detail/${artistItem.id}`
            },
            params: {
                artistid: artistItem.id,
                pn: page,
                rn: pageSize,
                httpStatus: 1
            }
        })).data;
        const musicList = res.data.list.filter(_ => !_.isListenFee).map(formatMusicItem);
        return {
            isEnd: res.data.total <= page * pageSize,
            data: musicList
        }
    }

    async function getArtistAlbumWorks (artistItem, page) {
        const headers = await getHeaders();
        const res = (await axios.get('http://www.kuwo.cn/api/www/artist/artistAlbum', {
            headers: {
                ...headers,
                referer: `http://www.kuwo.cn/singer_detail/${artistItem.id}`
            },
            params: {
                artistid: artistItem.id,
                pn: page,
                rn: pageSize,
                httpStatus: 1
            }
        })).data;
        const albumList = res.data.albumList.map(formatAlbumItem);
        return {
            isEnd: res.data.total <= page * pageSize,
            data: albumList
        }
    }

    async function getArtistWorks(artistItem, page, type) {
        if(type === 'music') {
            return getArtistMusicWorks(artistItem, page);
        } else if (type === 'album') {
            return getArtistAlbumWorks(artistItem, page);
        }
    }

    async function getLyric(musicItem) {
        const headers = await getHeaders();
        const res = (await axios.get('http://m.kuwo.cn/newh5/singles/songinfoandlrc', {
            headers,
            params: {
                musicId: musicItem.id,
                httpStatus: 1
            }
        })).data;
        const list = res.data.lrclist;
        return {
            rawLrc: list.map(_ => `[${_.time}]${_.lineLyric}`).join('\n')
        }
    }

    async function getAlbumInfo(albumItem) {

        const headers = await getHeaders();
        const res = (await axios.get('http://www.kuwo.cn/api/www/album/albumInfo', {
            headers,
            params: {
                albumId: albumItem.id,
                httpStatus: 1
            }
        })).data;

        return {
            ...albumItem,
            musicList: res.data.musicList.filter(_ => !_.isListenFee).map(formatMusicItem)
        }
    }

    return {
        platform: '酷我',
        version: '0.0.0',
        appVersion: '>0.0.1-alpha.3',
        srcUrl: 'https://gitee.com/maotoumao/MusicFreePlugins/raw/master/kuwo.js',
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
            const headers = await getHeaders();
            const res = (await axios.get('http://www.kuwo.cn/api/v1/www/music/playUrl', {
                headers,
                params: {
                    mid: musicItem.id,
                    type: 'music',
                    httpStatus: 1
                }
            })).data;

            return {
                url: res.data.url
            };
        },
        getAlbumInfo,
        getLyric,
        getArtistWorks

    }
}