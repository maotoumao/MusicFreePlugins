"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const webdav_1 = require("webdav");
let cachedData = {};
function getClient() {
    var _a, _b, _c;
    const { url, username, password, searchPath, searchMaxDepth } = (_b = (_a = env === null || env === void 0 ? void 0 : env.getUserVariables) === null || _a === void 0 ? void 0 : _a.call(env)) !== null && _b !== void 0 ? _b : {};
    if (!(url && username && password)) {
        return null;
    }
    if (!(cachedData.url === url &&
        cachedData.username === username &&
        cachedData.password === password &&
        cachedData.searchPath === searchPath &&
        cachedData.searchMaxDepth === Number.parseInt(searchMaxDepth))) {
        cachedData.url = url;
        cachedData.username = username;
        cachedData.password = password;
        cachedData.searchPath = searchPath;
        cachedData.searchPathList = (_c = searchPath === null || searchPath === void 0 ? void 0 : searchPath.split) === null || _c === void 0 ? void 0 : _c.call(searchPath, ",");
        cachedData.cacheFileList = null;
        cachedData.searchMaxDepth = Number.parseInt(searchMaxDepth) || null;
    }
    return (0, webdav_1.createClient)(url, {
        authType: webdav_1.AuthType.Password,
        username,
        password,
    });
}
async function traverseDirectory(dirPath, options = {}) {
    const { filterFn, maxDepth = 2 } = options;
    const client = getClient();
    if (!client)
        return [];
    const traverseDirectoryInner = async function (dirPath, allFiles, filterFn, maxDepth, currentDepth) {
        const client = getClient();
        if (currentDepth > maxDepth) {
            return allFiles;
        }
        const items = (await client.getDirectoryContents(dirPath));
        for (const item of items) {
            if (item.type === "directory") {
                await traverseDirectoryInner(item.filename, allFiles, filterFn, maxDepth, currentDepth + 1);
            }
            else {
                if (filterFn && !filterFn(item))
                    continue;
                allFiles.push(item);
            }
        }
        return allFiles;
    };
    return traverseDirectoryInner(dirPath, [], filterFn || (() => true), maxDepth, 0);
}
async function searchMusic(query) {
    var _a, _b;
    const client = getClient();
    if (!cachedData.cacheFileList) {
        const searchPathList = ((_a = cachedData.searchPathList) === null || _a === void 0 ? void 0 : _a.length)
            ? cachedData.searchPathList
            : ["/"];
        let result = [];
        for (let search of searchPathList) {
            try {
                const fileItems = await traverseDirectory(search, {
                    filterFn: (file) => { var _a; return (_a = file.mime) === null || _a === void 0 ? void 0 : _a.startsWith("audio"); },
                    maxDepth: cachedData.searchMaxDepth,
                });
                result = [...result, ...fileItems];
            }
            catch (_c) { }
        }
        cachedData.cacheFileList = result;
    }
    return {
        isEnd: true,
        data: ((_b = cachedData.cacheFileList) !== null && _b !== void 0 ? _b : [])
            .filter((it) => it.basename.includes(query))
            .map((it) => ({
            title: it.basename,
            id: it.filename,
            artist: "未知作者",
            album: "未知专辑",
        })),
    };
}
async function getTopLists() {
    getClient();
    const data = {
        title: "全部歌曲",
        data: (cachedData.searchPathList || []).map((it) => ({
            title: it,
            id: it,
        })),
    };
    return [data];
}
async function getTopListDetail(topListItem) {
    const client = getClient();
    const fileItems = await traverseDirectory(topListItem.id, {
        filterFn: (file) => { var _a; return (_a = file.mime) === null || _a === void 0 ? void 0 : _a.startsWith("audio"); },
        maxDepth: cachedData.searchMaxDepth,
    });
    return {
        musicList: fileItems.map((it) => ({
            title: it.basename,
            id: it.filename,
            artist: "未知作者",
            album: "未知专辑",
        })),
    };
}
module.exports = {
    platform: "WebDAV",
    author: "猫头猫",
    description: "使用此插件前先配置用户变量",
    userVariables: [
        {
            key: "url",
            name: "WebDAV地址",
        },
        {
            key: "username",
            name: "用户名",
        },
        {
            key: "password",
            name: "密码",
            type: "password",
        },
        {
            key: "searchPath",
            name: "存放歌曲的路径",
        },
        {
            key: "searchMaxDepth",
            name: "递归搜索最大深度",
        }
    ],
    version: "0.0.3",
    supportedSearchType: ["music"],
    srcUrl: "https://gitee.com/maotoumao/MusicFreePlugins/raw/v0.1/dist/webdav/index.js",
    cacheControl: "no-cache",
    search(query, page, type) {
        if (type === "music") {
            return searchMusic(query);
        }
    },
    getTopLists,
    getTopListDetail,
    getMediaSource(musicItem) {
        const client = getClient();
        return {
            url: client.getFileDownloadLink(musicItem.id),
        };
    },
};
