function kugou(packages) {
    const { axios } = packages;
    const pageSize = 20;


    function formatMusicItem(_) {
        return {
            id: _.hash,
            title: _.songname,
            artist: _.singername,
            album: _.album_name,
            album_id: _.album_id,
            album_audio_id: _.album_audio_id
        }
    }

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'zh-CN,zh;q=0.9',
    }

    async function searchMusic(query, page) {
        const res = (await axios.get('http://mobilecdn.kugou.com/api/v3/search/song', {
            headers,
            params: {
                format: 'json',
                keyword: query,
                page,
                pagesize: pageSize,
                showtype: 1,
            }
        })).data;
        const songs = res.data.info.filter(_ => _.privilege === 0 || _.privilege === 8).map(formatMusicItem);
        return {
            isEnd: page * pageSize >= res.data.total,
            data: songs
        }
    }



    async function getMediaSource(musicItem) { 
        const res = (await axios.get('https://wwwapi.kugou.com/yy/index.php', {
            headers,
            params: {
                r: 'play/getdata',
                hash: musicItem.id,
                appid: '1014',
                mid: '56bbbd2918b95d6975f420f96c5c29bb',
                album_id: musicItem.album_id,
                album_audio_id: musicItem.album_audio_id,
                _: Date.now()
            }
        })).data.data;
        
        return {
            url: res.play_url || res.play_backup_url,
            rawLrc: res.lyrics,
            artwork: res.img
        };
    }

    return {
        platform: '酷狗',
        version: '0.0.0',
        srcUrl: 'https://gitee.com/maotoumao/MusicFreePlugins/raw/master/kugou.js',
        cacheControl: 'no-cache',
        primaryKey: ['id', 'album_id', 'album_audio_id'],
        async search(query, page, type) {
            if (type === 'music') {
                return await searchMusic(query, page);
            }
        },
        getMediaSource,
        getLyric: getMediaSource,

    }
}