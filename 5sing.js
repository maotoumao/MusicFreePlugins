function fiveSing(packages) {
    const { axios, cheerio } = packages;
    const pageSize = 10;


    function formatMusicItem(_) {
        return {
            id: _.songId,
            title: cheerio.load(_.songName).text(),
            artist: _.singer,
            singerId: _.singerId,
            album: _.typeName,
            type: _.type,
            typeName: _.typeName,
            typeEname: _.typeEname
        }
    }

    function formatAlbumItem(_) {
        return {
            id: _.songListId,
            artist: _.userName,
            title: cheerio.load(_.title).text(),
            artwork: _.pictureUrl,
            description: _.content,
            date: _.createTime,
        }
    }

    function formatArtistItem(_) {
        return ({
            id: _.id,
            name: cheerio.load(_.nickName).text(),
            fans: _.fans,
            avatar: _.pictureUrl,
            description: _.description,
            worksNum: _.totalSong

        })
    }

    const searchHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
        'Host': 'search.5sing.kugou.com',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Referer': 'http://search.5sing.kugou.com/home/index'
    }

    async function searchMusic(query, page) {
        const res = (await axios.get('http://search.5sing.kugou.com/home/json', {
            headers: searchHeaders,
            params: {
                keyword: query,
                sort: 1,
                page,
                filter: 0,
                type: 0,
            }
        })).data;
        const songs = res.list.map(formatMusicItem);

        return {
            isEnd: res.pageInfo.cur >= res.pageInfo.totalPages,
            data: songs
        }
    }

    async function searchAlbum(query, page) {
        const res = (await axios.get('http://search.5sing.kugou.com/home/json', {
            headers: searchHeaders,
            params: {
                keyword: query,
                sort: 1,
                page,
                filter: 0,
                type: 1,
            }
        })).data;
        const songs = res.list.map(formatAlbumItem);

        return {
            isEnd: res.pageInfo.cur >= res.pageInfo.totalPages,
            data: songs
        }
    }

    async function searchArtist(query, page) {
        const res = (await axios.get('http://search.5sing.kugou.com/home/json', {
            headers: searchHeaders,
            params: {
                keyword: query,
                sort: 1,
                page,
                filter: 1,
                type: 2,
            }
        })).data;
        const songs = res.list.map(formatArtistItem);

        return {
            isEnd: res.pageInfo.cur >= res.pageInfo.totalPages,
            data: songs
        }
    }


    let fcEnd = false;
    let ycEnd = false;
    let bzEnd = false;
    async function getArtistMusicWorks(artistItem, page) {
        if(page === 1) {
            fcEnd = false;
            ycEnd = false;
            bzEnd = false;
        }
        const headers = {
            'Accept': 'application/json, text/plain, */*',
            'Accept-Encoding': 'gzip, deflate',
            'Accept-Language': 'zh-CN,zh;q=0.9',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Host': 'service.5sing.kugou.com',
            'Origin': 'http://5sing.kugou.com',
            'Pragma': 'no-cache',
            'Referer': 'http://5sing.kugou.com/',
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
        }
        let data = [];
        if(!fcEnd) {
            const res = (await (axios.get('http://service.5sing.kugou.com/user/songlist', {
                headers,
                params: {
                    userId: artistItem.id,
                    type: 'fc',
                    pageSize,
                    page
                }
            }))).data;
            if(res.count <= page * pageSize) {
                fcEnd = true;
            }
            data = data.concat(res.data.map(_ => ({
                id: _.songId,
                artist: artistItem.name,
                title: _.songName,
                typeEname: 'fc',
                typeName: '翻唱',
                type: _.songType,
                album: '翻唱'
            })))
        }
        if(!ycEnd) {
            const res = (await (axios.get('http://service.5sing.kugou.com/user/songlist', {
                headers,
                params: {
                    userId: artistItem.id,
                    type: 'yc',
                    pageSize,
                    page
                }
            }))).data;
            if(res.count <= page * pageSize) {
                ycEnd = true;
            }
            data = data.concat(res.data.map(_ => ({
                id: _.songId,
                artist: artistItem.name,
                title: _.songName,
                typeEname: 'yc',
                typeName: '原唱',
                type: _.songType,
                album: '原唱'
            })));
        }
        if(!bzEnd) {
            const res = (await (axios.get('http://service.5sing.kugou.com/user/songlist', {
                headers,
                params: {
                    userId: artistItem.id,
                    type: 'bz',
                    pageSize,
                    page
                }
            }))).data;
            if(res.count <= page * pageSize) {
                bzEnd = true;
            }
            data = data.concat(res.data.map(_ => ({
                id: _.songId,
                artist: artistItem.name,
                title: _.songName,
                typeEname: 'bz',
                typeName: '伴奏',
                type: _.songType,
                album: '伴奏'
            })));
        }
        return {
            isEnd: fcEnd && ycEnd && bzEnd,
            data
        }

    }


    async function getArtistWorks(artistItem, page, type) {
        if (type === 'music') {
            return getArtistMusicWorks(artistItem, page);
        }
    }

    async function getLyric(musicItem) {
        const headers = {
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate',
            'Accept-Language': 'zh-CN,zh;q=0.9',
            'Host': 'service.5sing.kugou.com',
            'Referer': 'http://5sing.kugou.com/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36'
        };
        const res = (await axios.get('http://5sing.kugou.com/fm/m/json/lrc', {
            headers,
            params: {
                songId: musicItem.id,
                songType: musicItem.typeEname
            }
        })).data;
        return {
            rawLrc: res.txt
        }
    }

    async function getAlbumInfo(albumItem) {
        const headers = {
            'Accept': 'application/json, text/plain, */*',
            'Accept-Encoding': 'gzip, deflate',
            'Accept-Language': 'zh-CN,zh;q=0.9',
            'Cache-Control': 'no-cache',
            'Host': 'service.5sing.kugou.com',
            'Origin': 'http://5sing.kugou.com',
            'Referer': 'http://5sing.kugou.com/',
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
        }
        const res = (await axios.get('http://service.5sing.kugou.com/song/getPlayListSong', {
            headers: headers,
            params: {
                id: albumItem.id,
            }
        })).data;

        return {
            ...albumItem,
            musicList: res.data.map(_ => ({
                id: _.ID,
                typeEname: _.SK,
                title: _.SN,
                artist: _.user.NN,
                singerId: _.user.ID,
                album: albumItem.title,
                artwork: albumItem.artwork,
            }))
        }

    }

    return {
        platform: '5sing',
        version: '0.0.0',
        srcUrl: 'https://gitee.com/maotoumao/MusicFreePlugins/raw/master/5sing.js',
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
            const headers = {
                'Accept': '*/*',
                'Accept-Encoding': 'gzip, deflate',
                'Accept-Language': 'zh-CN,zh;q=0.9',
                'Host': 'service.5sing.kugou.com',
                'Referer': 'http://5sing.kugou.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36'
            };
            const res = (await axios.get('http://service.5sing.kugou.com/song/getsongurl', {
                headers,
                params: {
                    songid: musicItem.id,
                    songtype: musicItem.typeEname,
                    from: 'web',
                    version: '6.6.72',
                    _: Date.now()
                }
            })).data;
            const data = JSON.parse(res.substring(1, res.length - 1)).data;


            return {
                url: data.hqurl || data.lqurl || data.squrl
            };
        },
        getAlbumInfo,
        getLyric,
        getArtistWorks

    }
}