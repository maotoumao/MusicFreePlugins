const plugin = require('../plugins/geciqianxun');


async function run() {
    // 测试搜索歌词
    const searchResult = await plugin.search('七里香', 1, 'lyric');
    console.log(searchResult);

    if (searchResult.data.length > 0) {
        const musicItem = searchResult.data[0];
        const lyricResult = await plugin.getLyric(musicItem);
        console.log(lyricResult);
    }
}

run();

