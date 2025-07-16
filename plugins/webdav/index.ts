import { AuthType, FileStat, createClient } from "webdav";

interface ICachedData {
  url?: string;
  username?: string;
  password?: string;
  searchPath?: string;
  searchPathList?: string[];
  searchMaxDepth?: number;
  cacheFileList?: FileStat[];
}
let cachedData: ICachedData = {};

function getClient() {
  const { url, username, password, searchPath, searchMaxDepth } =
    env?.getUserVariables?.() ?? {};
  if (!(url && username && password)) {
    return null;
  }

  if (
    !(
      cachedData.url === url &&
      cachedData.username === username &&
      cachedData.password === password &&
      cachedData.searchPath === searchPath &&
      cachedData.searchMaxDepth === Number.parseInt(searchMaxDepth)
    )
  ) {
    cachedData.url = url;
    cachedData.username = username;
    cachedData.password = password;
    cachedData.searchPath = searchPath;
    cachedData.searchPathList = searchPath?.split?.(",");
    cachedData.cacheFileList = null;
    cachedData.searchMaxDepth = Number.parseInt(searchMaxDepth) || null;
  }

  return createClient(url, {
    authType: AuthType.Password,
    username,
    password,
  });
}

async function traverseDirectory(
  dirPath: string,
  options: {
    filterFn?: (file: FileStat) => boolean;
    maxDepth?: number;
  } = {}
): Promise<FileStat[]> {
  const { filterFn, maxDepth = 2 } = options;
  const client = getClient();
  if (!client) return [];

  const traverseDirectoryInner = async function (
    dirPath: string,
    allFiles: FileStat[],
    filterFn: (file: FileStat) => boolean,
    maxDepth: number,
    currentDepth: number
  ): Promise<FileStat[]> {
    const client = getClient();

    if (currentDepth > maxDepth) {
      return allFiles;
    }

    const items = (await client.getDirectoryContents(dirPath)) as FileStat[];

    for (const item of items) {
      if (item.type === "directory") {
        // 递归遍历子目录，深度 +1
        await traverseDirectoryInner(
          item.filename,
          allFiles,
          filterFn,
          maxDepth,
          currentDepth + 1
        );
      } else {
        if (filterFn && !filterFn(item)) continue;
        allFiles.push(item);
      }
    }

    return allFiles;
  };
  return traverseDirectoryInner(
    dirPath,
    [],
    filterFn || (() => true),
    maxDepth,
    0
  );
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
        const fileItems = await traverseDirectory(search, {
          filterFn: (file) => file.mime?.startsWith("audio"),
          maxDepth: cachedData.searchMaxDepth,
        });

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

async function getTopListDetail(topListItem: IMusicSheet.IMusicSheetItem) {
  const client = getClient();
  const fileItems = await traverseDirectory(topListItem.id, {
    filterFn: (file) => file.mime?.startsWith("audio"),
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
  srcUrl:
    "https://gitee.com/maotoumao/MusicFreePlugins/raw/v0.1/dist/webdav/index.js",
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
