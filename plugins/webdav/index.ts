import { AuthType, FileStat, createClient } from "webdav";

interface ICachedData {
  url?: string;
  username?: string;
  password?: string;
  searchPath?: string;
  searchPathList?: string[];
  cacheFileList?: FileStat[];
}
let cachedData: ICachedData = {};

function getClient() {
  const { url, username, password, searchPath } =
    env?.getUserVariables?.() ?? {};
  if (!(url && username && password)) {
    return null;
  }

  if (
    !(
      cachedData.url === url &&
      cachedData.username === username &&
      cachedData.password === password &&
      cachedData.searchPath === searchPath
    )
  ) {
    cachedData.url = url;
    cachedData.username = username;
    cachedData.password = password;
    cachedData.searchPath = searchPath;
    cachedData.searchPathList = searchPath?.split?.(",");
    cachedData.cacheFileList = null;
  }

  return createClient(url, {
    authType: AuthType.Password,
    username,
    password,
  });
}

async function searchMusic(query: string) {
  const client = getClient();
  if (!cachedData.cacheFileList) {
    const searchPathList = cachedData.searchPathList?.length
      ? cachedData.searchPathList
      : ["/"];
    let result: FileStat[] = [];

    for (let search of searchPathList) {
      try {
        const fileItems = (
          (await client.getDirectoryContents(search)) as FileStat[]
        ).filter((it) => it.type === "file" && it.mime.startsWith("audio"));
        result = [...result, ...fileItems];
      } catch {}
    }
    cachedData.cacheFileList = result;
  }

  return {
    isEnd: true,
    data: (cachedData.cacheFileList ?? [])
      .filter((it) => it.basename.includes(query))
      .map((it) => ({
        title: it.basename,
        id: it.filename,
        artist: '未知作者',
        album: '未知专辑'
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
  ],
  version: "0.0.0",
  supportedSearchType: ["music"],
  srcUrl:
    "https://gitee.com/maotoumao/MusicFreePlugins/raw/v0.1/dist/webdav/index.js",
  cacheControl: "no-cache",
  search(query, page, type) {
    if (type === "music") {
      return searchMusic(query);
    }
  },
  getMediaSource(musicItem) {
    const client = getClient();
    return {
      url: client.getFileDownloadLink(musicItem.id),

    };
  },
};
