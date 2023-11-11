const axios = require("axios");
const cheerio = require('cheerio');

module.exports = {
    platform: "FreeSound", // 插件名
    version: "0.0.0", // 版本号
    cacheControl: "no-store", // 我们可以直接解析出musicItem的结构，因此选取no-store就好了，当然也可以不写这个字段
    async search(query, page, type) {
        if (type === "music") {
            // 我们能搜索的只有音乐，因此判断下类型
            // 获取网站的html
            const rawHtml = (
                await axios.get("https://freesound.org/search", {
                    q: query,
                    page,
                })
            ).data;

            // 接下来解析html 
            const $ = cheerio.load(rawHtml);
            // 存储搜索结果 
            const searchResults = [];
            // 获取所有的结果
            const resultElements = $('.bw-search__result');
            // 解析每一个结果
            resultElements.each((index, element) => {
                const playerElement = $(element).find('.bw-player');
                // id
                const id = playerElement.data('sound-id');
                // 音频名
                const title = playerElement.data('title');
                // 作者
                const artist = $(element).find('.col-12.col-lg-12.middle a').text();
                // 专辑封面
                const artwork = playerElement.data('waveform');
                // 音源
                const url = playerElement.data('mp3');
                // 专辑名，这里就随便写个了，不写也没事
                const album = '来自FreeSound的音频';

                searchResults.push({
                    // 一定要有一个 id 字段
                    id,
                    title,
                    artist,
                    artwork,
                    album,
                    url
                })
            });
            return {
                isEnd: true,
                data: searchResults
            }
        }
    },
};
