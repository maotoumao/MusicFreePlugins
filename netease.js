function netease(packages) {
    const { axios, CryptoJs, qs, bigInt, dayjs } = packages;

    /** 内部的函数 */

    function a() {
        var d, e, b = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", c = "";
        for (d = 0; 16 > d; d += 1)
            e = Math.random() * b.length,
                e = Math.floor(e),
                c += b.charAt(e);
        return c
    }

    function b(a, b) {
        var c = CryptoJs.enc.Utf8.parse(b)
            , d = CryptoJs.enc.Utf8.parse("0102030405060708")
            , e = CryptoJs.enc.Utf8.parse(a)
            , f = CryptoJs.AES.encrypt(e, c, {
                iv: d,
                mode: CryptoJs.mode.CBC
            });
        return f.toString()
    }


    function c(text) {
        text = text.split('').reverse().join('');
        const d = '010001';
        const e = '00e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7';
        const hexText = text.split('').map(_ => _.charCodeAt(0).toString(16)).join('');
        const res = bigInt(hexText, 16).modPow(bigInt(d, 16), bigInt(e, 16)).toString(16);

        return Array(256 - res.length).fill('0').join('').concat(res);
    }

    function getParamsAndEnc(text) {
        const first = b(text, '0CoJUm6Qyw8W8jud');
        const rand = a();
        const params = b(first, rand);

        const encSecKey = c(rand);
        return {
            params,
            encSecKey
        }
    }

    function formatMusicItem(_) {
        const album = _.al || _.album;
        return ({
            id: _.id,
            artwork: album.picUrl,
            title: _.name,
            artist: (_.ar || _.artists)[0].name,
            album: album.name
        })
    }

    function formatAlbumItem(_) {
        return ({
            id: _.id,
            artist: _.artist.name,
            title: _.name,
            artwork: _.picUrl,
            description: '',
            date: dayjs.unix(_.publishTime / 1000).format("YYYY-MM-DD"),
        });
    }

    function musicCanPlayFilter(_) {
        return ((_.fee === 0) || _.fee === 8) && _.privilege.st >= 0;
    }

    const pageSize = 30;
    async function searchBase(query, page, type) {
        const data = {
            's': query,
            'limit': pageSize,
            'type': type,
            'offset': (page - 1) * pageSize,
            'csrf_token': ''
        }
        const pae = getParamsAndEnc(JSON.stringify(data));
        const paeData = qs.stringify(pae);

        const headers = {
            'authority': 'music.163.com',
            'user-agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.135 Safari/537.36',
            'content-type': 'application/x-www-form-urlencoded',
            'accept': '*/*',
            'origin': 'https://music.163.com',
            'sec-fetch-site': 'same-origin',
            'sec-fetch-mode': 'cors',
            'sec-fetch-dest': 'empty',
            'referer': 'https://music.163.com/search/',
            'accept-language': 'zh-CN,zh;q=0.9',
        }

        const res = (await axios({
            method: 'post',
            url: 'https://music.163.com/weapi/cloudsearch/get/web?csrf_token=',
            headers,
            data: paeData
        })).data;

        return res;
    }

    async function searchMusic(query, page) {

        const res = await searchBase(query, page, 1);

        const songs = res.result.songs.filter(musicCanPlayFilter).map(formatMusicItem)

        return {
            isEnd: res.result.songCount <= page * pageSize,
            data: songs
        }

    }

    async function searchAlbum(query, page) {
        const res = await searchBase(query, page, 10);

        const albums = res.result.albums.map(formatAlbumItem)

        return {
            isEnd: res.result.albumCount <= page * pageSize,
            data: albums
        }
    }

    async function searchArtist(query, page) {
        const res = await searchBase(query, page, 100);

        const artists = res.result.artists.map(_ => ({
            name: _.name,
            id: _.id,
            avatar: _.img1v1Url,
            worksNum: _.albumSize
        }))

        return {
            isEnd: res.result.artistCount <= page * pageSize,
            data: artists
        }
    }

    async function getArtistWorks(artistItem, page, type) {
        const data = {
            'csrf_token': ''
        }
        const pae = getParamsAndEnc(JSON.stringify(data));
        const paeData = qs.stringify(pae);

        const headers = {
            'authority': 'music.163.com',
            'user-agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.135 Safari/537.36',
            'content-type': 'application/x-www-form-urlencoded',
            'accept': '*/*',
            'origin': 'https://music.163.com',
            'sec-fetch-site': 'same-origin',
            'sec-fetch-mode': 'cors',
            'sec-fetch-dest': 'empty',
            'referer': 'https://music.163.com/search/',
            'accept-language': 'zh-CN,zh;q=0.9',
        }

        if (type === 'music') {
            const res = (await axios({
                method: 'post',
                url: `https://music.163.com/weapi/v1/artist/${artistItem.id}?csrf_token=`,
                headers,
                data: paeData
            })).data;
            return {
                isEnd: true,
                data: res.hotSongs.filter(musicCanPlayFilter).map(formatMusicItem)
            }
        } else if (type === 'album') {
            const res = (await axios({
                method: 'post',
                url: `https://music.163.com/weapi/artist/albums/${artistItem.id}?csrf_token=`,
                headers,
                data: paeData
            })).data;
            return {
                isEnd: true,
                data: res.hotAlbums.map(formatAlbumItem)
            }
        }

    }

    async function getLyric(musicItem) {
        const headers = {
            'Referer': 'https://y.music.163.com/',
            'Origin': 'https://y.music.163.com/',
            'authority': 'music.163.com',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.135 Safari/537.36',
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        const data = { id: musicItem.id, lv: -1, tv: -1, csrf_token: '' }
        const pae = getParamsAndEnc(JSON.stringify(data));
        const paeData = qs.stringify(pae);

        const result = (await axios({
            method: 'post',
            url: `https://interface.music.163.com/weapi/song/lyric?csrf_token=`,
            headers,
            data: paeData
        })).data;

        return {
            rawLrc: result.lrc.lyric
        }
    }

    async function getAlbumInfo(albumItem) {
        const headers = {
            'Referer': 'https://y.music.163.com/',
            'Origin': 'https://y.music.163.com/',
            'authority': 'music.163.com',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.135 Safari/537.36',
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        const data = { "resourceType": 3, "resourceId": albumItem.id, "limit": 15, "csrf_token": "" }
        const pae = getParamsAndEnc(JSON.stringify(data));
        const paeData = qs.stringify(pae);

        const res = (await axios({
            method: 'post',
            url: `https://interface.music.163.com/weapi/v1/album/${albumItem.id}?csrf_token=`,
            headers,
            data: paeData
        })).data;


        return {
            ...albumItem,
            description: res.album.description,
            musicList: (res.songs || []).filter(musicCanPlayFilter).map(formatMusicItem)
        }

    }

    async function getValidMusicItems(trackIds) {
        const headers = {
            'Referer': 'https://y.music.163.com/',
            'Origin': 'https://y.music.163.com/',
            'authority': 'music.163.com',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.135 Safari/537.36',
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        try {
            const data = { csrf_token: '', ids: `[${trackIds.join(',')}]`, level: 'standard', encodeType: 'flac' }
            const pae = getParamsAndEnc(JSON.stringify(data));
            const urlencoded = qs.stringify(pae);
            const res = (await axios({
                method: 'post',
                url: `https://music.163.com/weapi/song/enhance/player/url/v1?csrf_token=`,
                headers,
                data: urlencoded
            })).data;

            const validTrackIds = res.data.filter(_ => _.url).map(_ => _.id);
            const songDetails = (await axios.get(`https://music.163.com/api/song/detail/?id=${validTrackIds[0]}&ids=[${validTrackIds.join(',')}]`, { headers })).data;
            const validMusicItems = songDetails.songs.filter(_ => ((_.fee === 0) || _.fee === 8)).map(formatMusicItem);
            return validMusicItems;
        } catch(e) {
            return []
         }

        
    }

    async function importMusicSheet(urlLike) {
        const matchResult = urlLike.match(/https:\/\/y\.music\.163.com\/m\/playlist\?id=([0-9]+)/);
        const id = matchResult[1];
        const headers = {
            'Referer': 'https://y.music.163.com/',
            'Origin': 'https://y.music.163.com/',
            'authority': 'music.163.com',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.135 Safari/537.36',
        };
        const sheetDetail = (await axios.get(`https://music.163.com/api/v3/playlist/detail?id=${id}&n=5000`, {
            headers
        })).data;
        const trackIds = sheetDetail.playlist.trackIds.map(_ => _.id);
        let result = [];
        let idx = 0;
        while((idx * 200) < trackIds.length) {
            const res = await getValidMusicItems(trackIds.slice(idx * 200, (idx + 1) * 200));
            result = result.concat(res);
            ++idx;
        }
        return result;
    }

    return {
        platform: '网易云',
        version: '0.0.5',
        srcUrl: 'https://gitee.com/maotoumao/MusicFreePlugins/raw/master/netease.js',
        cacheControl: 'no-store',
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
        getMediaSource(musicItem) {
            return {
                url: `https://music.163.com/song/media/outer/url?id=${musicItem.id}.mp3`
            };
        },
        getAlbumInfo,
        getLyric,
        getArtistWorks,
        importMusicSheet

    }
}