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

async function searchFiles(query: string, type: string) {
  if (!cachedData.cacheFileList) {
    const searchPathList = cachedData.searchPathList?.length
      ? cachedData.searchPathList
      : ["/"];
    let result: FileStat[] = [];

    for (let search of searchPathList) {
      try {
        const fileItems = await traverseDirectory(search, {
          filterFn: (file) => {
            if (type === "music") {
              return file.mime?.startsWith("audio");
            } else if (type === "lyric") {
              return file.basename.endsWith(".lrc");
            }
            return false;
          },
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

function tryDetectAndDecodeBuffer(buffer) {
  // 常见的LRC文件编码
  const encodingsToTry = ["utf8", "gbk", "gb18030", "big5", "utf16le"];

  for (const encoding of encodingsToTry) {
    try {
      const decoder = new TextDecoder(encoding, { fatal: true });
      return decoder.decode(buffer);
    } catch (e) {
      continue;
    }
  }

  // 如果所有编码都失败，最后尝试utf8并忽略错误（可能会有乱码但不会崩溃）
  return new TextDecoder("utf8", { fatal: false }).decode(buffer);
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
    },
  ],
  version: "0.0.3",
  supportedSearchType: ["music", "lyric"],
  srcUrl:
    "https://gitee.com/maotoumao/MusicFreePlugins/raw/v0.1/dist/webdav/index.js",
  cacheControl: "no-cache",
  search(query, page, type) {
    if (type === "music" || type === "lyric") {
      return searchFiles(query, type);
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
  async getLyric(musicItem) {
    const client = getClient();
    // 替换后缀格式为lrc文件格式
    if (!musicItem.id.endsWith(".lrc")) {
      musicItem.id = musicItem.id.replace(/\.[^.]+$/, ".lrc");
    }
    // 获取lrc文件内容
    try {
      const buffer = await client.getFileContents(musicItem.id, {
        format: "binary",
      });

      // 尝试检测编码并解码
      const rawLrc = tryDetectAndDecodeBuffer(buffer);
      return { rawLrc };
    } catch (error) {
      return { rawLrc: `Failed to read or decode LRC file: ${error}` }; // 返回空歌词或抛出错误，根据你的需求决定
    }
  },
};
