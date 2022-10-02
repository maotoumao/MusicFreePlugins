function netease(packages) {
    const { axios, CryptoJs, qs, bigInt } = packages;

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

    async function searchMusic(query, page) {
        const data = {
            's': query,
            'limit': 30,
            'type': 1,
            'offset': 0,
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
        })).data

        const songs = res.result.songs.filter(_ => ((_.fee === 0) || _.fee === 8) && _.privilege.st >= 0).map(_ => ({
            id: _.id,
            artwork: _.al.picUrl,
            title: _.name,
            artist: _.ar[0].name,
            album: _.al.name
        }))

        return {
            data: songs
        }

    }


    return {
        platform: '网易云',
        version: '1.0.0',
        cacheControl: 'no-store',
        async search(query, page, type) {
            if (type === 'music') {
                return await searchMusic(query, page);
            }
        },
        getMediaSource(musicItem) {
            return {
                url: `https://music.163.com/song/media/outer/url?id=${musicItem.id}.mp3`
            };
        },

    }
}