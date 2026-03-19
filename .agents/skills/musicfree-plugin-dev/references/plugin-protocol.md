# 插件方法协议

完整的方法签名、参数说明、返回值结构和示例代码。
所有方法均为 `async`，返回 `Promise`。遇到错误应直接 `throw`。

---

## search（搜索）

用户在应用内搜索时调用。未实现此方法的插件不会出现在搜索结果中。

**签名**：

```javascript
async search(query, page, type)
```

**参数**：

| 参数    | 类型   | 说明                                                                 |
| ------- | ------ | -------------------------------------------------------------------- |
| `query` | string | 搜索关键词                                                           |
| `page`  | number | 页码，从 1 开始                                                      |
| `type`  | string | 搜索类型：`"music"` / `"album"` / `"artist"` / `"sheet"` / `"lyric"` |

**返回值**：

```javascript
{
  isEnd: boolean,  // 是否最后一页（不填默认 true）
  data: []         // 搜索结果数组，类型与 type 对应：
                   //   music  → IMusicItem[]
                   //   album  → IAlbumItem[]
                   //   artist → IArtistItem[]
                   //   sheet  → IMusicSheetItem[]
                   //   lyric  → IMusicItem[]（歌词搜索也返回歌曲）
}
```

**示例**：

```javascript
async search(query, page, type) {
  if (type === "music") {
    const res = await axios.get("https://api.example.com/search", {
      params: { keyword: query, page, pageSize: 30 }
    });
    return {
      isEnd: page * 30 >= res.data.total,
      data: res.data.list.map(item => ({
        id: String(item.id),
        title: item.name,
        artist: item.singer,
        album: item.albumName,
        artwork: item.cover,
        duration: item.duration
      }))
    };
  }
  return { isEnd: true, data: [] };
}
```

**要点**：

- 不支持的 `type` 应返回 `{ isEnd: true, data: [] }`
- 配合 `supportedSearchType` 属性声明支持的搜索类型，避免不必要的调用
- `data` 中每个元素的 `id` 字段必须是有效字符串
- 可在搜索结果中附加扩展字段，后续方法会收到这些字段

---

## getMediaSource（获取播放链接）

用户点击播放或下载时调用。未实现时，会使用 `musicItem.url` 作为播放链接。

**签名**：

```javascript
async getMediaSource(musicItem, quality)
```

**参数**：

| 参数        | 类型       | 说明                                                |
| ----------- | ---------- | --------------------------------------------------- |
| `musicItem` | IMusicItem | 歌曲对象（来自 search 等方法的返回值）              |
| `quality`   | string     | 音质：`"low"` / `"standard"` / `"high"` / `"super"` |

**返回值**：

```javascript
{
  url: string,                         // 音频真实 URL（必填）
  headers: Record<string, string>,     // 请求音频时附加的 HTTP 头（可选）
  userAgent: string                    // 自定义 User-Agent（可选，建议写进 headers）
}
```

**示例**：

```javascript
async getMediaSource(musicItem, quality) {
  const res = await axios.get("https://api.example.com/song/url", {
    params: { id: musicItem.id, quality }
  });
  if (!res.data.url) throw new Error("该歌曲暂无音源");
  return {
    url: res.data.url,
    headers: { "Referer": "https://example.com" }
  };
}
```

**要点**：

- 无法获取音源时应 `throw`，框架会自动进行音质降级重试
- 如果未对 `quality` 参数做判断，则所有音质都返回同一音源
- `cacheControl` 属性影响此方法返回值的缓存策略

---

## getLyric（获取歌词）

切换歌曲时或搜索歌词时调用。

**签名**：

```javascript
async getLyric(musicItem)
```

**参数**：

| 参数        | 类型       | 说明     |
| ----------- | ---------- | -------- |
| `musicItem` | IMusicItem | 歌曲对象 |

**返回值**：

```javascript
{
  rawLrc: string,       // LRC 格式歌词文本，如 "[00:01.00]第一句歌词\n[00:05.00]第二句"
  translation: string   // LRC 格式翻译歌词（可选）
}
```

**示例**：

```javascript
async getLyric(musicItem) {
  const res = await axios.get("https://api.example.com/lyric", {
    params: { id: musicItem.id }
  });
  return {
    rawLrc: res.data.lrc,
    translation: res.data.translation
  };
}
```

---

## getMusicInfo（获取歌曲详情）

播放时调用，用于补全搜索结果中缺失的歌曲信息（如封面图）。

**签名**：

```javascript
async getMusicInfo(musicItem)
```

**参数**：

| 参数        | 类型       | 说明                     |
| ----------- | ---------- | ------------------------ |
| `musicItem` | IMusicItem | 歌曲对象（仅含主键字段） |

**返回值**：`Partial<IMusicItem>` — 返回需要补充的字段即可，会与现有数据合并。

**示例**：

```javascript
async getMusicInfo(musicItem) {
  const res = await axios.get("https://api.example.com/song/detail", {
    params: { id: musicItem.id }
  });
  return {
    artwork: res.data.coverUrl,
    album: res.data.albumName
  };
}
```

---

## getAlbumInfo（获取专辑详情）

用户进入专辑详情页时调用。

**签名**：

```javascript
async getAlbumInfo(albumItem, page)
```

**参数**：

| 参数        | 类型       | 说明            |
| ----------- | ---------- | --------------- |
| `albumItem` | IAlbumItem | 专辑对象        |
| `page`      | number     | 页码，从 1 开始 |

**返回值**：

```javascript
{
  isEnd: boolean,                   // 是否最后一页
  musicList: IMusicItem[],          // 该页的歌曲列表
  albumItem: Partial<IAlbumItem>    // 补充的专辑信息（仅 page=1 时可选返回）
}
```

**示例**：

```javascript
async getAlbumInfo(albumItem, page) {
  const res = await axios.get("https://api.example.com/album", {
    params: { id: albumItem.id, page }
  });
  const result = {
    isEnd: page * 30 >= res.data.total,
    musicList: res.data.songs.map(s => ({
      id: String(s.id),
      title: s.name,
      artist: s.singer,
      duration: s.duration
    }))
  };
  if (page === 1) {
    result.albumItem = {
      description: res.data.description,
      artwork: res.data.cover
    };
  }
  return result;
}
```

---

## getMusicSheetInfo（获取歌单详情）

用户进入歌单详情页时调用。结构与 `getAlbumInfo` 类似。

**签名**：

```javascript
async getMusicSheetInfo(sheetItem, page)
```

**参数**：

| 参数        | 类型            | 说明     |
| ----------- | --------------- | -------- |
| `sheetItem` | IMusicSheetItem | 歌单对象 |
| `page`      | number          | 页码     |

**返回值**：

```javascript
{
  isEnd: boolean,
  musicList: IMusicItem[],
  sheetItem: Partial<IMusicSheetItem>  // 仅 page=1 时可选返回
}
```

---

## getArtistWorks（获取歌手作品）

用户进入歌手详情页时调用。

**签名**：

```javascript
async getArtistWorks(artistItem, page, type)
```

**参数**：

| 参数         | 类型        | 说明                   |
| ------------ | ----------- | ---------------------- |
| `artistItem` | IArtistItem | 歌手对象               |
| `page`       | number      | 页码                   |
| `type`       | string      | `"music"` 或 `"album"` |

**返回值**：

```javascript
{
  isEnd: boolean,
  data: []  // type="music" → IMusicItem[]，type="album" → IAlbumItem[]
}
```

---

## importMusicItem（导入单曲）

用户在插件管理页点击"导入单曲"并输入 URL 时调用。未实现则不显示该按钮。

**签名**：

```javascript
async importMusicItem(urlLike)
```

**参数**：

| 参数      | 类型   | 说明                        |
| --------- | ------ | --------------------------- |
| `urlLike` | string | 用户输入的文本（URL 或 ID） |

**返回值**：`IMusicItem` — 解析出的歌曲对象

**示例**：

```javascript
async importMusicItem(urlLike) {
  // 从用户输入中提取 ID
  const match = urlLike.match(/song\/(\d+)/);
  if (!match) throw new Error("无法识别的链接格式");
  const id = match[1];

  const res = await axios.get("https://api.example.com/song/" + id);
  return {
    id: String(res.data.id),
    title: res.data.name,
    artist: res.data.singer,
    artwork: res.data.cover
  };
}
```

---

## importMusicSheet（导入歌单）

用户在插件管理页点击"导入歌单"并输入 URL 时调用。未实现则不显示该按钮。

**签名**：

```javascript
async importMusicSheet(urlLike)
```

**参数**：

| 参数      | 类型   | 说明           |
| --------- | ------ | -------------- |
| `urlLike` | string | 用户输入的文本 |

**返回值**：`IMusicItem[]` — 歌单中的歌曲列表

---

## getTopLists（获取排行榜列表）

用户进入排行榜页面时调用。未实现则不显示该插件的排行榜标签。

**签名**：

```javascript
async getTopLists()
```

**无参数**

**返回值**：`IMusicSheetGroupItem[]` — 排行榜分组数组

**示例**：

```javascript
async getTopLists() {
  return [
    {
      title: "热门榜单",
      data: [
        { id: "hot", title: "热歌榜", artwork: "https://..." },
        { id: "new", title: "新歌榜", artwork: "https://..." }
      ]
    },
    {
      title: "流派榜单",
      data: [
        { id: "rock", title: "摇滚榜", artwork: "https://..." }
      ]
    }
  ];
}
```

**要点**：

- 排行榜数据如果不常变化，可以直接硬编码
- 点击某个排行榜后调用的是 `getTopListDetail`，不是 `getMusicSheetInfo`

---

## getTopListDetail（获取排行榜详情）

用户点击某个具体排行榜时调用。

**签名**：

```javascript
async getTopListDetail(topListItem, page)
```

**参数**：

| 参数          | 类型            | 说明                               |
| ------------- | --------------- | ---------------------------------- |
| `topListItem` | IMusicSheetItem | `getTopLists` 返回的某个排行榜条目 |
| `page`        | number          | 页码                               |

**返回值**：

```javascript
{
  isEnd: boolean,
  musicList: IMusicItem[],
  topListItem: IMusicSheetItem  // 补充的排行榜信息（可选）
}
```

---

## getRecommendSheetTags（获取推荐歌单标签）

用户进入推荐歌单页时调用。

**签名**：

```javascript
async getRecommendSheetTags()
```

**无参数**

**返回值**：

```javascript
{
  pinned: [{ id, title }],  // 固定在顶部的标签（可选）
  data: [                   // 标签分组
    {
      title: "分组名",
      data: [{ id: "tag1", title: "标签名" }, ...]
    }
  ]
}
```

**要点**：

- 每个标签至少包含 `id` 和 `title`
- 点击标签后会调用 `getRecommendSheetsByTag`

---

## getRecommendSheetsByTag（按标签获取推荐歌单）

用户点击某个推荐标签时调用。

**签名**：

```javascript
async getRecommendSheetsByTag(tag, page)
```

**参数**：

| 参数   | 类型   | 说明                           |
| ------ | ------ | ------------------------------ |
| `tag`  | object | 标签对象（含 `id` 和 `title`） |
| `page` | number | 页码                           |

**返回值**：

```javascript
{
  isEnd: boolean,
  data: IMusicSheetItem[]  // 歌单列表
}
```

**要点**：

- 应用有一个默认标签其 `id` 为空字符串，需要兼容
- 点击某个歌单后会调用 `getMusicSheetInfo` 获取详情

---

## getMusicComments（获取歌曲评论）

查看歌曲评论时调用。

**签名**：

```javascript
async getMusicComments(musicItem, page)
```

**参数**：

| 参数        | 类型       | 说明     |
| ----------- | ---------- | -------- |
| `musicItem` | IMusicItem | 歌曲对象 |
| `page`      | number     | 页码     |

**返回值**：

```javascript
{
  isEnd: boolean,
  data: IComment[]  // 评论列表
}
```
