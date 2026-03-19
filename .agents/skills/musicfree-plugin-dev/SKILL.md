---
name: musicfree-plugin-dev
description: >
    从零开始开发 MusicFree 音乐播放器插件的完整指南。
    当用户要求编写、创建、开发 MusicFree 插件，或要求将某个音乐网站、API 适配为 MusicFree 插件时触发。
    涵盖：插件协议、媒体类型定义、方法签名、沙箱环境、站点分析、本地调试、发布更新等完整流程。
    本 Skill 面向 AI 执行，指导 AI 与零基础用户协作完成插件开发。
---

# MusicFree 插件开发

## 严格行为准则

以下规则在整个插件开发过程中**始终生效**，违反将导致开发失败：

1. **禁止盲猜 URL**：不要凭空试 `/api/search`、`/v1/song` 等路径。每个 URL 必须来自页面内容或 Playwright 捕获的网络请求
2. **禁止搜索网络寻找 API**：不要搜索"XX音乐 API"、"免费音乐接口"等。所有数据来源必须通过对目标站点的直接观察获得，不能来自网络搜索
3. **禁止批量探测**：不要同时发多个请求试不同的参数组合
4. **禁止重复请求**：每个 URL 只请求一次，结果保存到本地文件后基于本地数据分析
5. **禁止放弃说"需要浏览器环境"**：axios 失败但浏览器可以访问，差别一定在请求头上，用 Playwright 捕获真实请求头后在 axios 中补全

**当遇到困难时，唯一正确的做法是：用 Playwright 观察浏览器的真实行为。不要猜测，不要搜索，去观察。**

## 角色与协作模式

- **AI（你）**：分析目标站点、编写插件代码、编写并执行测试脚本、迭代修复
- **用户**：提供目标站点/API 信息，仅在 AI 无法独立完成时执行辅助操作

### 核心原则：最小化用户操作

**能自己做的，绝不让用户做。** 遵循以下优先级：

1. **AI 独立完成**：直接用工具抓取页面、分析 HTML/JS、在终端运行脚本
2. **AI 做 + 用户确认**：AI 分析后给出结论，请用户确认是否正确
3. **用户操作（最后手段）**：仅当 AI 的工具无法获取到所需数据时，才让用户在浏览器中操作

### 与用户交互原则

- 用户可能是零基础，**不要使用未解释的技术术语**
- 需要用户操作时，给出**精确到按键级别的逐步指令**，每次只下达一个操作
- 主动告知用户当前进度和下一步计划
- **不确定时必须询问**：当对站点行为、API 含义、数据字段映射不确定时，先问再做

## 工作流程

```
1. 收集信息 → 2. 判断路径 → 3. 分析数据源 → 4. 确定方法集合
→ 5. 逐个实现 → 6. 测试验证 → 7. 迭代修复 → 8. 输出最终插件
```

### 步骤 1：收集信息并检查环境

**先检查开发环境**（在做任何其他事之前）：

1. 检查 Node.js 是否可用：`node --version`
2. 询问用户：电脑上是否安装了 Chrome 或 Edge 浏览器？安装路径是什么？（Playwright 可以复用已安装的浏览器，避免下载）
3. 安装 Playwright：`npm install -D playwright`（不需要下载 Chromium，后续用 `channel: 'chrome'` 复用用户的 Chrome）

**然后收集需求**：

- 目标是什么？（某个音乐网站？已有的 API 文档？自建的服务？）
- 插件作者名？（会写入插件的 `author` 字段）

### 步骤 2：判断路径

根据收集到的信息，选择对应路径：

**路径 A：用户提供了 API 文档或接口规格**
→ 阅读文档 → 将端点映射到插件方法 → 直接编写代码

**路径 B：用户提供了网站 URL（页面内容直接可抓取）**
→ 用工具抓取页面 HTML → 分析 DOM 结构 → 用 cheerio 编写解析逻辑
→ 详见 [references/site-analysis-playbook.md](references/site-analysis-playbook.md) "静态站点分析"

**路径 C：用户提供了网站 URL（需逆向分析内部 API）**
页面通过内部 API 异步加载数据，没有公开文档。需要**观察浏览器的实际行为，然后用 axios 精确复现**。

核心方法论——**观察 → 分析 → 复现 → 验证**：

1. **观察**：用 Playwright 加载页面，捕获所有网络请求，保存到本地
2. **分析**：基于本地缓存的数据做离线分析，找到关键的 API 端点和音频请求
3. **复现**：用 axios 复现相同的请求（包括完整的 Headers）
4. **验证**：在终端测试，如果失败则对比 Playwright 捕获的请求头与 axios 请求头的差异

→ 详见 [references/site-analysis-playbook.md](references/site-analysis-playbook.md)

### 步骤 3：分析数据源

**快速预判站点类型**：用工具抓取目标 URL 的 HTML，检查内容：

- 如果 HTML 中包含完整的数据内容（歌曲列表、歌手名等文本） → 静态站点，用 cheerio 解析
- 如果 HTML 很小（骨架 HTML）、包含大量 `<script>` 标签、或核心内容区域为空 → SPA 站点，**直接使用 Playwright**，不要在 axios 上浪费时间

遵循"**观察-分析-复现-验证**"方法论（详见 [references/site-analysis-playbook.md](references/site-analysis-playbook.md)）。

关键规则：

- **所有抓取内容先保存到本地文件**，后续基于本地文件分析，避免重复请求
- **不要盲猜 URL**——每个 API 端点必须来自页面内容或网络请求的实际观察
- 推断出的 API 和数据结构不确定时 → **向用户确认**

### 步骤 4-8：实现循环

确定数据源后：

1. 根据站点分析结果，自动识别站点支持的功能（搜索、排行榜、歌单、歌词等），**能适配的全部实现，适配不了的不写入插件**——不需要询问用户实现哪些功能
2. 从 `search` 和 `getMediaSource` 开始（最核心的两个方法）
3. 每完成一个方法，编写测试脚本并在终端中执行验证
4. 通过后再实现下一个方法
5. 全部完成后，添加元数据，输出最终 `.js` 文件

## 插件骨架

```javascript
// 引入需要的模块（均为沙箱内置，无需安装）
const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
    // ===== 必填属性 =====
    platform: '插件名称',

    // ===== 可选属性 =====
    version: '0.0.1', // 语义化版本号
    author: '作者名',
    description: '插件说明',
    srcUrl: 'https://example.com/plugin.js', // 远程更新地址
    cacheControl: 'no-cache', // "cache" | "no-cache" | "no-store"
    supportedSearchType: ['music', 'album', 'artist', 'sheet'],
    userVariables: [{ key: 'cookie', name: 'Cookie', hint: '请输入你的 Cookie' }],
    hints: {
        importMusicSheet: ['支持以下格式的链接：...', 'https://example.com/playlist/123'],
    },

    // ===== 方法 =====
    async search(query, page, type) {
        /* ... */
    },
    async getMediaSource(musicItem, quality) {
        /* ... */
    },
    // ... 更多方法
};
```

### 属性速查

| 属性                  | 必填 | 说明                                                     |
| --------------------- | ---- | -------------------------------------------------------- |
| `platform`            | 是   | 插件名称，不可为"本地"                                   |
| `version`             | 否   | 语义化版本号，默认 `"0.0.0"`                             |
| `author`              | 否   | 插件作者                                                 |
| `description`         | 否   | 说明文字                                                 |
| `srcUrl`              | 否   | 远程 `.js` 文件直链，用于应用内更新                      |
| `cacheControl`        | 否   | `getMediaSource` 结果的缓存策略                          |
| `supportedSearchType` | 否   | 声明支持的搜索类型数组，不填则认为全部支持               |
| `userVariables`       | 否   | 用户可配置变量数组，每项含 `key`（必填）、`name`、`hint` |
| `hints`               | 否   | 提示文案，键为方法名，值为字符串数组                     |

### `userVariables` 用法

定义：

```javascript
userVariables: [{ key: 'cookie', name: 'Cookie', hint: '在浏览器登录后获取' }];
```

运行时读取：

```javascript
const cookie = env.getUserVariables().cookie;
```

## 方法速查

所有方法均为 `async`，遇到错误应直接 `throw`。
完整签名、参数与返回值详见 [references/plugin-protocol.md](references/plugin-protocol.md)。
基本媒体类型字段详见 [references/media-types.md](references/media-types.md)。

| 方法                      | 功能           | 核心入参                   | 核心返回值                         |
| ------------------------- | -------------- | -------------------------- | ---------------------------------- |
| `search`                  | 搜索           | `(query, page, type)`      | `{ isEnd, data: [] }`              |
| `getMediaSource`          | 获取播放链接   | `(musicItem, quality)`     | `{ url, headers? }`                |
| `getLyric`                | 获取歌词       | `(musicItem)`              | `{ rawLrc?, translation? }`        |
| `getAlbumInfo`            | 专辑详情       | `(albumItem, page)`        | `{ isEnd, musicList, albumItem? }` |
| `getMusicSheetInfo`       | 歌单详情       | `(sheetItem, page)`        | `{ isEnd, musicList, sheetItem? }` |
| `getArtistWorks`          | 歌手作品       | `(artistItem, page, type)` | `{ isEnd, data: [] }`              |
| `getMusicInfo`            | 补全歌曲信息   | `(musicItem)`              | `Partial<IMusicItem>`              |
| `importMusicItem`         | 导入单曲       | `(urlLike)`                | `IMusicItem`                       |
| `importMusicSheet`        | 导入歌单       | `(urlLike)`                | `IMusicItem[]`                     |
| `getTopLists`             | 排行榜列表     | 无                         | `[{ title?, data: [] }]`           |
| `getTopListDetail`        | 排行榜详情     | `(topListItem, page)`      | `{ isEnd, musicList }`             |
| `getRecommendSheetTags`   | 推荐歌单标签   | 无                         | `{ pinned?, data: [] }`            |
| `getRecommendSheetsByTag` | 按标签获取歌单 | `(tag, page)`              | `{ isEnd, data: [] }`              |
| `getMusicComments`        | 歌曲评论       | `(musicItem, page)`        | `{ isEnd, data: [] }`              |

### 关键约定

- **分页**：`page` 从 1 开始；`isEnd` 为 `true` 表示到达最后一页，不填默认 `true`
- **`platform` 自动注入**：返回的媒体项无需设置 `platform`，框架会自动添加
- **`id` 必须有**：每个媒体项必须包含 `id` 字段
- **可扩展字段**：`IMusicItem` 等类型支持任意可序列化的扩展字段，这些字段会在后续方法调用时被传入。利用这一特性在 `search` 中附带后续方法所需的额外数据
- **错误处理**：遇到错误直接 `throw`，不要返回 `null`

## 沙箱环境

插件运行在隔离沙箱中（`vm.createContext`），有 10 秒执行超时。

### 可用模块（通过 `require` 引入）

| 模块          | 用途                        |
| ------------- | --------------------------- |
| `axios`       | HTTP 请求                   |
| `cheerio`     | HTML 解析（类 jQuery 语法） |
| `crypto-js`   | 加解密                      |
| `dayjs`       | 日期时间处理                |
| `big-integer` | 大整数运算                  |
| `qs`          | URL 参数序列化              |
| `he`          | HTML 实体编码/解码          |
| `webdav`      | WebDAV 操作                 |

**注意**：不在此列表中的模块无法 `require`。如需使用其它库（如 lodash），必须用 webpack 等工具将源码打包到插件文件中。

### 全局可用 API

- `fetch`, `URL`, `URLSearchParams`, `AbortController`
- `Buffer`, `TextEncoder`, `TextDecoder`
- `btoa`, `atob`, `encodeURIComponent`, `decodeURIComponent`
- `JSON`, `console.log/warn/error`
- `setTimeout`, `setInterval`, `Promise`
- `env.getUserVariables()` — 读取用户变量
- `env.os` — 操作系统
- `env.appVersion` — 应用版本
- `env.lang` — 当前语言

## 开发模式示例

### 模式一：JSON API 对接

已知某服务的 API 接口，直接请求并转换数据格式：

```javascript
const axios = require('axios');

module.exports = {
    platform: '示例API源',
    version: '0.0.1',
    supportedSearchType: ['music'],

    async search(query, page, type) {
        if (type !== 'music') return { isEnd: true, data: [] };

        const res = await axios.get('https://api.example.com/search', {
            params: { keyword: query, page, limit: 20 },
        });

        const list = res.data.songs || [];
        return {
            isEnd: list.length < 20,
            data: list.map((item) => ({
                id: item.songId,
                title: item.songName,
                artist: item.singerName,
                album: item.albumName,
                artwork: item.coverUrl,
                duration: item.duration,
                // 扩展字段：后续 getMediaSource 会用到
                extraId: item.fileHash,
            })),
        };
    },

    async getMediaSource(musicItem, quality) {
        const res = await axios.get('https://api.example.com/play', {
            params: { hash: musicItem.extraId, quality },
        });
        if (!res.data.url) throw new Error('无法获取播放链接');
        return { url: res.data.url };
    },
};
```

### 模式二：HTML 页面解析

目标网站没有公开 API，直接抓取 HTML 并用 cheerio 解析：

```javascript
const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
    platform: '示例HTML源',
    version: '0.0.1',
    supportedSearchType: ['music'],

    async search(query, page, type) {
        if (type !== 'music') return { isEnd: true, data: [] };

        const rawHtml = (
            await axios.get('https://example.com/search', {
                params: { q: query, page },
            })
        ).data;

        const $ = cheerio.load(rawHtml);
        const results = [];

        $('.search-result-item').each((i, el) => {
            results.push({
                id: $(el).attr('data-id'),
                title: $(el).find('.song-title').text().trim(),
                artist: $(el).find('.artist-name').text().trim(),
                artwork: $(el).find('img').attr('src'),
                url: $(el).find('audio').attr('src'), // 如果页面直接包含音源
            });
        });

        return {
            isEnd: $('.next-page').length === 0,
            data: results,
        };
    },
};
```

### 模式三：直接拼接（无需网络请求）

音源 URL 可直接由已知信息拼接得出：

```javascript
module.exports = {
    platform: '示例拼接源',
    version: '0.0.1',
    cacheControl: 'no-store',

    async getMediaSource(musicItem, quality) {
        return {
            url: 'https://cdn.example.com/audio/' + musicItem.id + '.mp3',
        };
    },
};
```

## 测试流程

完成插件编写后，创建一个测试脚本在终端中运行：

```javascript
// test-plugin.js
const plugin = require('./my-plugin.js');

async function test() {
    console.log('=== 测试 search ===');
    try {
        const searchResult = await plugin.search('测试关键词', 1, 'music');
        console.log('搜索结果数量:', searchResult.data.length);
        console.log('是否最后一页:', searchResult.isEnd);
        if (searchResult.data.length > 0) {
            console.log('第一条结果:', JSON.stringify(searchResult.data[0], null, 2));

            console.log('\n=== 测试 getMediaSource ===');
            const source = await plugin.getMediaSource(searchResult.data[0], 'standard');
            console.log('播放链接:', source?.url ? '✓ 获取成功' : '✗ 获取失败');
            console.log('详细信息:', JSON.stringify(source, null, 2));
        }
    } catch (e) {
        console.error('测试失败:', e.message);
    }
}

test();
```

执行方式：

```bash
node test-plugin.js
```

**测试要点**：

- 每个方法单独测试，确认返回值结构正确
- 验证 `id` 字段存在且有效
- 验证分页逻辑（测试 page=1 和 page=2）
- 验证 `getMediaSource` 返回的 URL 可访问

**注意**：本地 Node.js 测试时，`env.getUserVariables()` 不可用。如果插件使用了 `userVariables`，需要在测试脚本中模拟：

```javascript
// 在 require 插件之前模拟 env
global.env = {
    getUserVariables: () => ({ cookie: '测试用cookie值' }),
    os: 'win32',
    appVersion: '0.0.1',
    lang: 'zh-CN',
};
const plugin = require('./my-plugin.js');
```

## 发布与更新

### 托管到 GitHub

1. 创建一个 GitHub 仓库（或使用已有仓库）
2. 将插件 `.js` 文件上传到仓库
3. 获取文件的 raw 链接（格式：`https://raw.githubusercontent.com/用户名/仓库名/分支/文件名.js`）
4. 将此链接填入插件的 `srcUrl` 字段

### 用户安装

用户在 MusicFree 中通过 "从 URL 安装插件" 功能，粘贴插件的 raw 链接即可安装。

### 版本更新

1. 修改 `version` 字段（遵循语义化版本，如 `"0.0.1"` → `"0.0.2"`）
2. 更新代码并推送到 GitHub
3. 用户在应用内点击"更新插件"即可自动获取新版本

## 注意事项

- **错误处理**：方法遇到错误应直接 `throw`，不要 `return null`
- **语法兼容**：优先使用 ES8 及以下语法。`async/await` 可放心使用，`?.`、`??` 在桌面版可用，但移动端可能需要 babel 转译
- **网络请求**：移动端 axios 会自带默认 headers（包括 `User-Agent: okhttp/4.10.0`），某些服务器可能因此返回异常，可手动设置 `headers` 覆盖
- **安全**：不要在插件中修改内置 npm 包的全局属性
- **超时**：每次方法调用有 10 秒超时限制，避免做过多请求或大量计算

## Skill 更新

本 Skill 的最新版本托管在官方仓库：https://github.com/maotoumao/musicfree-skills
