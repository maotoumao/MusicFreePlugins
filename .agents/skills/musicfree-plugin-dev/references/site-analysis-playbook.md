# 站点分析操作手册

本文档指导 AI 分析目标站点的数据源，以便编写 MusicFree 插件。
所有操作步骤均以 **AI 为执行者** 编写。需要用户配合的步骤会明确标注。

---

## 核心方法论：观察 → 分析 → 复现 → 验证

**插件开发的本质是：观察浏览器的实际行为，然后用 axios 精确复现。**

```
Phase 1: 观察 — 获取完整的数据快照，保存到本地
Phase 2: 分析 — 基于本地数据离线分析，不再发额外请求
Phase 3: 复现 — 写 axios 代码精确复现浏览器的请求（含完整 Headers）
Phase 4: 验证 — 在终端测试，失败时对比请求头差异而非盲目重试
```

### 禁止行为

1. **禁止盲猜 URL** — 不要凭空试 `/api/search`、`/v1/song` 等路径。每个 URL 必须来自观察到的实际数据
2. **禁止搜索网络寻找 API** — 不要搜索"XX音乐 API"、"免费音乐接口"等。数据来源只能是对目标站点的直接观察
3. **禁止批量探测** — 不要同时发多个请求试不同的参数组合
4. **禁止重复请求** — 每个 URL 只请求一次，结果保存到本地文件后基于本地数据分析
5. **禁止放弃说"需要浏览器环境"** — 如果 axios 失败但浏览器可以访问，差别在请求头，用 Playwright 捕获真实请求头后在 axios 中补全

**卡住时唯一正确的做法：用 Playwright 观察浏览器的真实行为。不要猜测，不要搜索，去观察。**

**不确定时必须询问用户**：当对 API 端点的用途、字段含义、所需认证方式不确定时，先向用户确认。

---

## 静态站点分析

适用于：页面内容直接包含在 HTML 中，无需 JS 渲染。

### 操作步骤

**1. 抓取页面并保存到本地**

```javascript
// probe.js — 在终端执行: node probe.js
const axios = require('axios');
const fs = require('fs');

async function probe() {
    const url = '目标URL';
    const res = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
    });
    fs.writeFileSync('page.html', res.data);
    console.log('页面已保存到 page.html，大小:', res.data.length, '字节');
}

probe().catch(console.error);
```

**2. 基于本地文件分析 HTML 结构**

读取 `page.html`，识别：

- 搜索结果的列表容器和各字段的 CSS 选择器
- 分页元素（下一页链接、总页数等）
- 页面中嵌入的 `<audio>`、`<source>` 等音频元素

**3. 编写 cheerio 选择器并在终端验证**

```javascript
const cheerio = require('cheerio');
const fs = require('fs');
const html = fs.readFileSync('page.html', 'utf-8');
const $ = cheerio.load(html);

$('.result-item').each((i, el) => {
    console.log({
        title: $(el).find('.song-name').text().trim(),
        artist: $(el).find('.artist').text().trim(),
        id: $(el).attr('data-id'),
    });
});
```

如果选择器提取不到数据 → 站点可能是 SPA，转入动态站点分析。

---

## 动态站点分析

适用于：SPA 应用、页面通过内部 API 加载数据、无公开 API 文档。

动态站点有两类关键任务，分析策略不同：

- **数据 API 发现**（搜索、歌单、专辑等）：分析页面加载和用户操作时的 XHR/Fetch 请求
- **音源发现**（getMediaSource）：分析播放操作时的所有网络请求（包括媒体资源请求）

### Phase 1：观察 — 用 Playwright 获取完整快照

**Playwright 是核心观察工具**，用它来看浏览器实际做了什么。

**环境准备**（应在步骤 1 已完成）：

Playwright 使用用户已安装的 Chrome 浏览器，无需下载 Chromium：

```bash
npm install -D playwright
```

所有 Playwright 脚本中使用 `channel: 'chrome'` 启动浏览器：

```javascript
const browser = await chromium.launch({ channel: 'chrome', headless: true });
```

如果用户没有 Chrome，可以尝试 `channel: 'msedge'`（Edge 浏览器）。

#### 1a. 抓取搜索/列表页的 API 请求

```javascript
// observe-search.js
const { chromium } = require('playwright');
const fs = require('fs');

async function observeSearch() {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage();

    const allRequests = [];

    // 捕获所有网络响应（不仅限于 XHR）
    page.on('response', async (response) => {
        const url = response.url();
        const contentType = response.headers()['content-type'] || '';
        const request = response.request();
        try {
            const body = await response.text();
            allRequests.push({
                url,
                method: request.method(),
                requestHeaders: request.headers(),
                status: response.status(),
                contentType,
                bodyPreview: body.substring(0, 3000),
            });
        } catch (e) {
            /* 忽略无法读取的响应 */
        }
    });

    await page.goto('目标URL', { waitUntil: 'networkidle' });

    // 保存首页加载的请求
    fs.writeFileSync('requests-homepage.json', JSON.stringify(allRequests, null, 2));
    console.log('首页请求已保存，共', allRequests.length, '个');

    // 执行搜索操作
    allRequests.length = 0; // 清空，只记录搜索产生的新请求
    await page.fill('搜索框选择器', '测试关键词');
    await page.click('搜索按钮选择器');
    await page.waitForTimeout(3000);

    fs.writeFileSync('requests-search.json', JSON.stringify(allRequests, null, 2));
    console.log('搜索请求已保存，共', allRequests.length, '个');

    // 同时保存页面 HTML，可能包含有用信息
    const html = await page.content();
    fs.writeFileSync('page-rendered.html', html);

    await browser.close();
}

observeSearch().catch(console.error);
```

#### 1b. 抓取播放操作的音频请求

```javascript
// observe-playback.js
const { chromium } = require('playwright');
const fs = require('fs');

async function observePlayback() {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage();

    const allRequests = [];

    // 捕获所有网络响应 — 音频可能是任何类型的请求
    page.on('response', async (response) => {
        const url = response.url();
        const contentType = response.headers()['content-type'] || '';
        const request = response.request();

        const entry = {
            url,
            method: request.method(),
            requestHeaders: request.headers(),
            status: response.status(),
            contentType,
            resourceType: request.resourceType(),
        };

        // 标记可能的音频请求
        const isAudio =
            contentType.includes('audio') ||
            contentType.includes('octet-stream') ||
            /\.(mp3|m4a|flac|ogg|wav|aac|opus)(\?|$)/i.test(url) ||
            request.resourceType() === 'media';
        entry.isLikelyAudio = isAudio;

        // 对非音频请求保存 body 预览
        if (!isAudio) {
            try {
                entry.bodyPreview = (await response.text()).substring(0, 2000);
            } catch (e) {
                /* 忽略 */
            }
        }

        allRequests.push(entry);
    });

    // 导航到歌曲页面（或搜索后找到歌曲）
    await page.goto('目标歌曲页URL', { waitUntil: 'networkidle' });

    // 触发播放 — 根据实际页面结构调整选择器
    await page.click('播放按钮选择器');
    await page.waitForTimeout(5000); // 等待音频请求

    fs.writeFileSync('requests-playback.json', JSON.stringify(allRequests, null, 2));
    console.log('播放请求已保存，共', allRequests.length, '个');
    console.log(
        '疑似音频请求:',
        allRequests.filter((r) => r.isLikelyAudio).map((r) => r.url),
    );

    await browser.close();
}

observePlayback().catch(console.error);
```

### Phase 2：分析 — 基于本地数据离线研究

**所有分析都基于 Phase 1 保存的本地文件，不再发额外请求。**

#### 2a. 分析搜索 API

读取 `requests-search.json`，筛选：

- 响应体包含音乐关键词（歌名、歌手名、专辑名）的请求
- `content-type` 为 JSON 的请求
- URL 中包含 `search`、`query`、`keyword` 等词的请求

找到关键请求后，记录其 **完整 URL、请求方法、所有请求头**。

#### 2b. 分析音频来源

读取 `requests-playback.json`，关注所有 `isLikelyAudio: true` 的条目：

- 可能有多个音频请求（广告、试听片段、正式音频）→ 通过 URL 路径和请求时序区分
- 音频 URL 也可能在某个 JSON API 的响应中返回 → 检查所有 JSON 响应体中是否包含 `.mp3`、`.m4a`、`audio` 等关键词
- 音频 URL 也可能直接嵌在 HTML 中 → 检查 `page-rendered.html`

#### 2c. 分析页面内嵌数据

读取 `page-rendered.html`，搜索：

- `window.__INITIAL_STATE__`、`window.__DATA__`、`window.__NEXT_DATA__` 等服务端注入的数据
- `<script>` 标签中的 API 基础路径（如 `apiBaseUrl`、`baseURL`）
- `<audio>`、`<source>` 标签中的直接音频 URL

### Phase 3：复现 — 用 axios 精确复现

关键：**复现时必须带上完整的请求头**。从 Playwright 捕获数据中提取 `requestHeaders`。

```javascript
const axios = require('axios');

// 从 Playwright 捕获的请求中提取的真实 Headers
const res = await axios.get('发现的API端点', {
    params: { keyword: query, page: page },
    headers: {
        'User-Agent': 'Playwright捕获到的UA',
        Referer: 'Playwright捕获到的Referer',
        Cookie: '如需要，通过 userVariables 提供',
        // ... 其他从捕获数据中看到的必要 Headers
    },
});
```

### Phase 4：验证与调试

如果 axios 请求失败但 Playwright 可以成功：

1. **逐项对比请求头**：将 Playwright 捕获的 `requestHeaders` 与 axios 发出的请求头逐项对比
2. **逐个添加 Header 测试**：先不带任何额外 Header → 加 `User-Agent` → 加 `Referer` → 加 `Cookie` → 找到最小必要 Header 集合
3. **检查 Cookie 是否必需**：如果需要 Cookie 才能访问，使用 `userVariables` 让用户提供

**注意**：不要反复重试同一请求。每次修改 Header 配置后只试一次，观察结果，理性分析差异。

---

## 用户辅助抓包（后备方案）

仅当 Playwright 不可用或无法安装时使用。

**向用户发送的操作指令模板**：

> 请按照以下步骤操作：
>
> 1. 用浏览器打开 `[目标网站URL]`
> 2. 按键盘上的 `F12` 键，会弹出一个面板（开发者工具）
> 3. 在面板顶部找到 **"Network"**（或"网络"）标签，点击它
> 4. 在页面上执行操作（例如搜索一首歌）
> 5. 面板中会出现很多条目。在面板上方的筛选框中，选择 **"Fetch/XHR"** 或 **"XHR"**
> 6. 在列表中找到看起来和搜索相关的请求（名称里通常包含 search、query、api 等词）
> 7. 点击该请求，右侧会显示详情
> 8. 点击 **"Response"**（或"响应"）标签页，**复制全部内容**粘贴给我
> 9. 然后点击 **"Headers"**（或"标头"）标签页，找到 **"Request URL"** 那一行，也复制给我
>
> 如果不确定是哪个请求，可以把筛选后的列表截图发给我。

**收到用户数据后**：将数据保存到本地文件，然后按 Phase 2 的流程分析。

---

## API 参数分析

### 分页参数推断

对比多次请求（可从 Playwright 触发翻页操作后捕获）：

```
请求1: /api/search?q=test&page=1&size=20
请求2: /api/search?q=test&page=2&size=20
```

→ 分页参数为 `page`，每页 `size=20`

常见分页模式：

- `page` + `pageSize` / `size` / `limit`
- `offset` + `limit`（offset = (page-1) \* limit）
- `cursor` / `nextToken`（不适合简单分页，需存储 cursor）

### 认证参数分析

常见模式：

- **Cookie 认证**：请求头中有 `Cookie` 字段 → 使用 `userVariables` 让用户提供
- **Token 认证**：请求参数或头中有 `token` / `authorization` → 分析 token 来源
- **签名参数**：如 `sign`、`timestamp`、`nonce` → 需要分析签名算法（见下节）

### 签名/加密参数处理

当请求中包含疑似加密参数（如 `sign`、`encData`）时：

**1. AI 先尝试自主获取 JS 源码**

首先尝试直接抓取页面中引用的 JS 文件，搜索加密相关代码。
如果 JS 文件被混淆或无法定位加密逻辑，再要求用户协助：

> 请在浏览器开发者工具的 Network 面板中，找到之前那个请求，
> 点击 **"Initiator"**（或"启动器"）列中的链接，
> 会跳转到一段代码。请搜索关键词 **"sign"** 或 **"encrypt"**，
> 然后把包含这个关键词的那段函数复制给我。

**2. 分析加密逻辑**

阅读 JS 源码，识别加密算法（常见：MD5、SHA256、AES、DES）。
MusicFree 插件沙箱提供了 `crypto-js` 模块，可以复现大部分加密逻辑：

```javascript
const CryptoJS = require('crypto-js');

function generateSign(params) {
    const sorted = Object.keys(params)
        .sort()
        .map((k) => k + '=' + params[k])
        .join('&');
    return CryptoJS.MD5(sorted + '固定密钥').toString();
}
```

**3. 验证复现结果**

在终端执行测试脚本，对比自己计算的签名与用户抓包看到的签名是否一致。

---

## 响应数据映射

拿到 API 响应后，将数据映射为 MusicFree 媒体类型：

### 映射检查清单

对每个响应字段进行映射：

```
API 响应字段          →  MusicFree 字段
─────────────────────────────────────
songId / id / rid    →  id（转为字符串）
songName / name      →  title
singerName / artist  →  artist
albumName            →  album
imgUrl / cover       →  artwork
length / duration    →  duration（注意单位：毫秒需除以 1000）
playUrl / url        →  url
```

### 注意事项

- `id` 必须转为字符串：`String(item.id)`
- `duration` 应为秒数，如果源数据是毫秒需要 `Math.floor(item.duration / 1000)`
- 图片 URL 可能是相对路径，需要拼接完整 URL
- 某些字段可能嵌套在子对象中，如 `item.album.name`
- 找不到直接对应的字段时，可以使用合理的默认值（如 `artist: "未知"` ）

---

## 常见问题排查

### 请求返回 403 / 401

- 对比 Playwright 捕获的请求头，逐项检查：`Referer`、`User-Agent`、`Cookie`、`Origin`
- 用 Playwright 捕获成功时的完整 Headers，在 axios 中完整复现

### axios 请求失败但浏览器正常

**这不是"需要浏览器环境"，而是 Headers 不完整。** 处理步骤：

1. 用 Playwright 执行相同操作并捕获请求
2. 对比 Playwright 的 `requestHeaders` 与 axios 默认 Headers 的差异
3. 在 axios 中逐个补全缺失的 Header，找到最小必要集合

### 请求返回 HTML 而非 JSON

- 确认 API 端点是否正确（应来自 Playwright 捕获，而非猜测）
- 可能需要设置 `Accept: application/json` 请求头
- 站点可能需要 Cookie 才能返回 JSON → 使用 `userVariables` 让用户提供

### 请求返回空数据

- 参数名可能不对（大小写、拼写），与 Playwright 捕获的原始请求逐项对比
- 可能有必需的隐含参数（如 `appId`、`platform`），从捕获的请求中提取

### cheerio 解析不到数据

- HTML 可能是 JS 动态渲染的 → 转入动态站点分析，使用 Playwright
- 确认选择器是否正确（检查 class 名、标签层级）
- 某些站点会做反爬（如 class 名随机化），需要用其他特征定位元素

### 找到多个音频请求

播放操作可能产生多个音频相关的网络请求（广告、试听片段、完整音轨等）：

- 按时序排列，通常正式音频是最后加载的、体积最大的
- 检查 URL 路径中是否包含歌曲 ID 或相关标识
- 对比不同歌曲的音频 URL，找出 URL 模式中的变化部分（通常是歌曲 ID）
- 确认选择器是否正确（检查 class 名、标签层级）
- 某些站点会做反爬（如 class 名随机化），需要用其他特征定位元素
