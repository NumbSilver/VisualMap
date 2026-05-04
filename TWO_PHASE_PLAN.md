# VisualMap 双阶段实施方案

## 1. 核心判断

VisualMap 不需要一开始就实现完整的确定性知识地图系统。

更好的路线是两步走：

```text
第一阶段：用 Flipbook 的直接生成方式，快速验证产品魔法感。
第二阶段：如果测试发现文字、可信度、批注和分享不可控，再切到 VisualMap 的确定性方案。
```

这样做的好处是：

- 第一阶段工程更简单。
- 更快看到完整 fancy 效果。
- 更容易验证用户是否喜欢“打开即画面、点击即下钻”的体验。
- 第二阶段保留可信、结构化和可运营能力的升级路径。

## 2. 第一阶段：Flipbook 直接生成方案

### 2.1 阶段目标

第一阶段的目标不是做最终产品，而是验证核心体验：

```text
用户输入一个链接
  -> 系统生成一张完整视觉图
  -> 用户点击图中某个区域
  -> 系统继续生成下一张深入图
  -> 用户感受到“这不是传统网页，而是一个视觉浏览器”
```

### 2.2 产品范围

第一阶段只做最小闭环：

- URL 后拼链接或 query 参数输入。
- 无链接时展示中心输入框。
- 生成一张完整视觉图。
- 图上不叠加复杂 DOM / SVG 文字层。
- 用户点击图片任意位置后继续生成下一页。
- 记录浏览路径。
- 支持返回上一步。
- 支持分享当前生成结果。

暂不做：

- 精确引用。
- 复杂 Add 批注。
- 完整 Explain / Explore 数据分层。
- 多人协作。
- 可编辑结构化节点。
- 严格的文字校验。

### 2.3 技术流程

```text
用户输入 url
  -> Source Fetcher 抓取内容
  -> LLM 生成页面生成 prompt
  -> Model Provider 生成整张图
  -> 前端全屏展示图片
  -> 用户点击坐标
  -> 后端把父图 + 点击位置 + 上下文发给 VLM / LLM
  -> 生成下一页 prompt
  -> Model Provider 生成下一张图
  -> 缓存并展示
```

### 2.3.1 OpenAPI / Model Provider 抽离规则

为了后续开源，所有外部模型调用必须单独抽离到 Provider 文件或模块中，业务代码不能直接调用具体厂商 API。

第一阶段建议先建立统一接口：

```text
src/server/model-providers/
  -> index.ts
  -> types.ts
  -> openai-image-provider.ts
  -> openai-vision-provider.ts
  -> openai-text-provider.ts
  -> custom-image-provider.example.ts
```

业务层只能调用统一接口：

```text
generateImage(input)
describeClickedRegion(input)
planNextPage(input)
```

不能在页面生成、点击下钻、分享逻辑里直接写具体 OpenAPI 请求。

开源用户替换模型时，只需要新增或替换 provider 文件：

```text
src/server/model-providers/my-image-provider.ts
```

并通过环境变量切换：

```text
OPENAI_API_KEY=...
IMAGE_PROVIDER=custom
VISION_PROVIDER=custom
TEXT_PROVIDER=custom
```

Demo 阶段默认可以使用 OpenAI Provider，但真实密钥必须由运行者自己提供，不能写入代码或提交到仓库。Provider 设计细节见 `MODEL_PROVIDERS.md`。

### 2.4 页面模型

第一阶段的核心数据结构很简单：

```json
{
  "id": "page_1",
  "source_id": "source_1",
  "parent_page_id": null,
  "prompt": "...",
  "image_url": "...",
  "click": null,
  "created_at": "2026-05-04T10:00:00Z"
}
```

点击后的子页：

```json
{
  "id": "page_2",
  "source_id": "source_1",
  "parent_page_id": "page_1",
  "prompt": "...",
  "image_url": "...",
  "click": {
    "x": 0.42,
    "y": 0.36
  },
  "created_at": "2026-05-04T10:02:00Z"
}
```

### 2.5 点击解析

第一阶段可以使用 Flipbook 式方式：

```text
父图 + 点击坐标
  -> 在父图上绘制点击标记
  -> VLM 判断用户点到的对象或区域
  -> LLM 根据该对象生成下一页内容 prompt
```

点击坐标需要归一化：

```text
x = click_x / image_width
y = click_y / image_height
```

缓存时坐标保留两位小数，避免相邻像素重复生成：

```text
x = round(x, 2)
y = round(y, 2)
```

### 2.6 风格一致性

第一阶段用一个全局 Style Prompt 保持一致。

示例：

```text
A cinematic interactive visual knowledge poster, full screen, richly illustrated,
clean readable infographic layout, consistent visual system, elegant labels,
layered depth, not a traditional website, no navigation bar, no marketing layout.
```

每次生成都传入：

```text
global_style_prompt
+ source_summary
+ current_path
+ parent_image_reference
+ clicked_region_description
```

### 2.7 速度保障

第一阶段也要做基础速度优化：

- 先生成低质量 preview。
- 后台生成高质量 final。
- 缓存每个 page。
- 返回上一页不重新生成。
- 分享链接直接读取缓存。

最低目标：

```text
1s 内展示画布壳
3s 内展示生成中状态
10s 内展示第一张 preview 图
final 图完成后替换
```

### 2.8 第一阶段验收标准

第一阶段是否成功，看这些指标：

- 用户打开后觉得它不是传统网站。
- 第一张图有完整视觉冲击力。
- 点击图片后能自然进入下一层。
- 用户愿意连续点击 3 次以上。
- 分享出去的图别人能理解并继续看。
- 生成速度没有明显打断体验。

### 2.9 第一阶段失败信号

如果出现以下问题，说明需要进入第二阶段：

- 文字错误频繁出现。
- 中文、数字、专有名词不稳定。
- 用户看不懂图里到底哪些内容可信。
- 点击后生成内容经常偏题。
- Explain 和 Explore 混在一起。
- 分享后内容无法被稳定复看。
- 用户想批注，但图片态无法支持。

## 3. 第二阶段：VisualMap 确定性方案

### 3.1 触发条件

第二阶段不是一开始就做，而是在第一阶段验证后按需启动。

触发条件：

```text
当 Flipbook 式方案的视觉体验被验证，
但文字准确性、可信解释、批注或分享权限成为瓶颈时，
启动 VisualMap 确定性方案。
```

### 3.2 阶段目标

第二阶段目标是把第一阶段的视觉浏览器升级成可信知识地图：

```text
保留 image-first 的体验
但把节点、文字、引用、批注和分享权限结构化
```

### 3.3 技术升级

从：

```text
整页图片生成
```

升级为：

```text
AI 背景图
+ 结构化节点
+ DOM / SVG 精确文字
+ Hotspot 点击区域
+ 引用和批注数据
+ 分享快照权限
```

第二阶段继续沿用第一阶段的 Model Provider 抽象，不允许把新的 LLM、VLM、OCR 或图片模型调用写进业务流程里。

### 3.4 新增能力

第二阶段新增：

- Source / Node / View / Trail 数据模型。
- Layout Engine。
- Text Overlay Renderer。
- Explain 引用链。
- Explore 外部来源标注。
- Add 批注系统。
- Share Snapshot 只读权限。
- OCR / screenshot QA。

### 3.5 第二阶段验收标准

- 关键文字完全由程序渲染。
- Explain 节点都有来源引用。
- Explore 节点标注和原文关系。
- Add 批注可编辑、可删除、可设权限。
- 分享链接只读但可下钻。
- 背景仍然保持 fancy。
- 用户仍然感觉它是视觉画面，而不是传统网页。

## 4. 两阶段之间的兼容设计

为了避免第一阶段推倒重来，第一阶段也要保留一些未来接口。

### 4.0 Provider 兼容开源替换

第一阶段就必须把模型调用当成可插拔能力，而不是产品内部实现细节。

```text
Business Logic
  -> Model Provider Interface
  -> Concrete Provider
  -> External API
```

这样第二阶段增加 OCR、视觉 QA、文本重写或不同生图模型时，不需要改业务核心。

### 4.1 Page 兼容 Node

第一阶段的 Page 后续可以迁移成 View：

```text
Page.image_url -> View.background_url
Page.prompt -> View.generation_prompt
Page.click -> Trail step
```

### 4.2 坐标兼容 Hotspot

第一阶段点击坐标后续可以转成 Hotspot：

```text
click.x / click.y
  -> hotspot center
  -> node candidate
  -> child node relation
```

### 4.3 Prompt 兼容 Style Contract

第一阶段的 global_style_prompt 后续升级成 Style Contract。

```text
global_style_prompt
  -> style_id
  -> palette
  -> typography
  -> layout_rules
  -> forbidden_styles
```

### 4.4 分享兼容 Snapshot

第一阶段的分享链接只需要存 page path。

第二阶段升级为完整 Share Snapshot。

```text
share_url
  -> page_path
  -> map_snapshot
  -> read_only permission
```

## 5. 推荐实现顺序

```text
Step 1：搭建全屏图片画布
Step 2：支持 query url 输入
Step 3：生成第一张图
Step 4：支持点击坐标生成下一张图
Step 5：支持路径、返回、缓存
Step 6：支持分享当前路径
Step 7：观察文字和点击质量
Step 8：决定是否进入确定性方案
```

## 6. 最终建议

第一阶段不要追求系统完美，追求体验成立。

第二阶段不要放弃视觉魔法，补上可信和结构化。

推荐原则：

```text
先用 Flipbook 方式验证魔法感
再用 VisualMap 方式补确定性
```

这会让产品既跑得快，又不会把未来锁死在纯图片生成的局限里。
