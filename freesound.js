function freesound(packages) {
    const {axios, cheerio} = packages;

    async function search(query, page, type) {
        if(type === 'music') {// 我们能搜索的只有音乐，因此判断下类型
            // 获取网站的html
            const rawHtml = (await axios.get('https://freesound.org/search', {
                q: query,
                page
            })).data

            // 接下来解析html
            const $ = cheerio.load(rawHtml);
            // 存储搜索结果 
            const searchResults = [];
            // 找到所有的音频元素
            const audioElements = $('.sample_player_small');
            // 解析每一个音频元素
            audioElements.each((index, element) => {
                // id
                const id = $(element).attr('id');
                // 音频名
                const title = $(element).find('.sound_filename').children('a').attr('title');
                // 封面
                const artwork = $(element).find('.background').css('background-url');
                // 作者
                const artist = $(element).find('.sample_information').children('.user').text();
                // 专辑名，这里就随便写个了，不写也没事
                const album = '来自FreeSound的音频';
                // 源mp3
                const url = $(element).find('.metadata').children('.mp3_file').attr('href');
                // 接下来拼装成musicItem格式，并拼接结果中
                searchResults.push({
                    id,
                    title,
                    artist,
                    artwork,
                    album,
                    yourName: url
                })
            });
            // 总页码
            const totalPage = parseInt($('.pagination').children('.last-page').text().trim());

            // 最后，按照search方法的返回结果格式返回就好了
            return {
                isEnd: page >= totalPage, // 当当前页码比总页码更多时，搜索结束
                data: searchResults // 本页的搜索结果
            }

        }
    }

    function getMediaSource(musicItem) {
        return {
            url: musicItem.yourName
        }
    }

    return {
        platform: 'FreeSound', // 插件名
        version: '0.0.0', // 版本号
        srcUrl: 'https://gitee.com/maotoumao/MusicFreePlugins/raw/master/freesound.js', // 更新链接；当在app更新插件后会自动用此地址的插件覆盖
        cacheControl: 'no-store', // 我们可以直接解析出musicItem的结构，因此选取no-store就好了，当然也可以不写这个字段
        search, // 在这里写上search方法，此时插件就会出现在搜索结果页了
        getMediaSource, // 由于搜索结果中没有了url字段，需要指定如何获取音源
    }
}