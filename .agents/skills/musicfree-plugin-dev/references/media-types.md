# 基本媒体类型

MusicFree 定义了以下基本媒体类型，插件需要将数据源的数据转换为这些格式。

## IMediaBase（基础类型）

所有媒体类型的基类。

| 字段       | 类型   | 必填 | 说明                                     |
| ---------- | ------ | ---- | ---------------------------------------- |
| `id`       | string | 是   | 媒体唯一标识                             |
| `platform` | string | 是   | 来源平台名（框架自动注入，插件无需设置） |

> 所有媒体类型都可以附加任意可序列化的扩展字段（`[k: string]: any`），
> 这些字段会在后续方法调用中被传入，可用于在方法间传递额外数据。

---

## IMusicItem（歌曲）

搜索结果、歌单内容、专辑曲目等所有涉及"歌曲"概念的场景都使用此类型。

| 字段       | 类型   | 必填 | 说明                                                    |
| ---------- | ------ | ---- | ------------------------------------------------------- |
| `id`       | string | 是   | 歌曲唯一标识                                            |
| `title`    | string | 是   | 歌曲标题                                                |
| `artist`   | string | 是   | 歌手/作者名                                             |
| `duration` | number | 否   | 时长（秒）                                              |
| `album`    | string | 否   | 专辑名                                                  |
| `artwork`  | string | 否   | 封面图 URL                                              |
| `url`      | string | 否   | 默认音源 URL（如有，`getMediaSource` 缺失时用此值播放） |
| `lrc`      | string | 否   | 歌词文件 URL                                            |
| `rawLrc`   | string | 否   | 歌词文本内容（LRC 格式）                                |

### 使用要点

- `id` + `platform` 构成唯一主键
- `search` 返回的 `IMusicItem` 会作为入参传给 `getMediaSource`、`getLyric` 等方法
- 建议在 `search` 中尽可能多地填充字段（如 `duration`、`artwork`），减少后续请求
- 可附加任意扩展字段，例如在 `search` 中附加 `fileHash`，在 `getMediaSource` 中通过 `musicItem.fileHash` 读取

---

## IArtistItem（歌手/作者）

搜索歌手、歌手详情页等涉及"歌手"概念的场景使用此类型。

| 字段          | 类型         | 必填 | 说明         |
| ------------- | ------------ | ---- | ------------ |
| `id`          | string       | 是   | 歌手唯一标识 |
| `name`        | string       | 是   | 歌手名       |
| `avatar`      | string       | 是   | 头像 URL     |
| `fans`        | number       | 否   | 粉丝数       |
| `description` | string       | 否   | 简介         |
| `musicList`   | IMusicItem[] | 否   | 歌曲列表     |
| `albumList`   | IAlbumItem[] | 否   | 专辑列表     |

---

## IAlbumItem（专辑）

搜索专辑、专辑详情页等涉及"专辑"概念的场景使用此类型。

| 字段          | 类型         | 必填 | 说明           |
| ------------- | ------------ | ---- | -------------- |
| `id`          | string       | 是   | 专辑唯一标识   |
| `title`       | string       | 是   | 专辑名         |
| `artwork`     | string       | 否   | 封面图 URL     |
| `artist`      | string       | 否   | 专辑艺术家     |
| `description` | string       | 否   | 专辑简介       |
| `worksNum`    | number       | 否   | 作品总数       |
| `playCount`   | number       | 否   | 播放次数       |
| `musicList`   | IMusicItem[] | 否   | 专辑内歌曲列表 |
| `createAt`    | number       | 否   | 创建时间戳     |

---

## IMusicSheetItem（歌单）

数据结构与 `IAlbumItem` 完全相同，但语义不同（`artist` 表示歌单创建者而非专辑作者）。
排行榜列表也使用此类型。

| 字段          | 类型         | 必填 | 说明           |
| ------------- | ------------ | ---- | -------------- |
| `id`          | string       | 是   | 歌单唯一标识   |
| `title`       | string       | 是   | 歌单标题       |
| `artwork`     | string       | 否   | 封面图 URL     |
| `artist`      | string       | 否   | 歌单创建者     |
| `description` | string       | 否   | 歌单简介       |
| `worksNum`    | number       | 否   | 歌曲总数       |
| `playCount`   | number       | 否   | 播放次数       |
| `musicList`   | IMusicItem[] | 否   | 歌单内歌曲列表 |
| `createAt`    | number       | 否   | 创建时间戳     |

---

## IComment（评论）

`getMusicComments` 方法返回的评论类型。

| 字段       | 类型       | 必填 | 说明                               |
| ---------- | ---------- | ---- | ---------------------------------- |
| `nickName` | string     | 是   | 用户昵称                           |
| `comment`  | string     | 是   | 评论内容                           |
| `id`       | string     | 否   | 评论 ID                            |
| `avatar`   | string     | 否   | 用户头像 URL                       |
| `like`     | number     | 否   | 点赞数                             |
| `createAt` | number     | 否   | 评论时间戳                         |
| `location` | string     | 否   | 地理位置                           |
| `replies`  | IComment[] | 否   | 回复评论列表（不含套娃 `replies`） |

---

## ILyricSource（歌词）

`getLyric` 方法的返回类型。

| 字段          | 类型   | 必填 | 说明                                      |
| ------------- | ------ | ---- | ----------------------------------------- |
| `rawLrc`      | string | 否   | 带时间戳的歌词，如 `[00:01.00]第一句歌词` |
| `lrc`         | string | 否   | 同 `rawLrc`，二选一即可                   |
| `translation` | string | 否   | 带时间戳的翻译歌词                        |

---

## IMusicSheetGroupItem（歌单/榜单分组）

`getTopLists` 和 `getRecommendSheetTags` 的返回元素类型，用于对歌单进行分类展示。

| 字段    | 类型              | 必填 | 说明                     |
| ------- | ----------------- | ---- | ------------------------ |
| `title` | string            | 否   | 分组名称（不填则不分组） |
| `data`  | IMusicSheetItem[] | 是   | 该分组下的歌单/榜单列表  |
