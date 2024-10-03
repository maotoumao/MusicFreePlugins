const plugin = require('../plugins/kuaishou');


async function run() {
    // 搜索歌曲
    const res = await plugin.search('七里香', 1,'music');

    console.log(res);

    if (res.data.length > 0) {
        const musicItem = res.data[0];
        const sourceResult = await plugin.getMediaSource(musicItem, 'standard');
        console.log(sourceResult);
    }
}

run();

