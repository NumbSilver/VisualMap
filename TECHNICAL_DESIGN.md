# VisualMap 技术方案：Flipbook 逆向分析与可落地实现

## 1. 背景

VisualMap 希望实现一种不是传统网页的产品形态：用户打开后看到的是一张完整、fancy、可点击、可下钻的视觉知识地图。

Flipbook 给出的启发是“image-is-the-UI”：每一页都是一张完整生成图，用户点击图中任意区域后，再生成下一张更深入的视觉页面。

但 VisualMap 和 Flipbook 的目标不同：

- Flipbook 更像开放式视觉浏览器，强调生成惊喜。
- VisualMap 是长内容视觉解析器，必须强调文字准确、来源可信、结构可控和可分享。

所以 VisualMap 不应该完全复刻“所有内容都是图片像素”的做法，而应该采用混合渲染：

```text
AI 生成视觉背景和整体风格
+ 结构化布局引擎生成节点与坐标
+ SVG / DOM / Canvas 渲染精确文字
+ 图片模型负责氛围、构图、图像质感
```

## 2. 对 Flipbook 的逆向判断

### 2.0 结论先行

Flipbook 的 demo 看起来文字正确，不代表它使用了稳定的网页文本渲染。更合理的判断是：

```text
它把整页当作一张图生成
+ 使用更擅长信息图和短文字的图像 / 视频模型
+ 控制 demo 文本密度和版式
+ 通过固定风格 prompt 提升一致性
+ 可能使用低清先出、高质量后台替换
+ 公开展示样本经过一定选择
```

也就是说，Flipbook 的文字正确性更像是“高概率生成正确”，而不是“程序保证正确”。

VisualMap 不能把关键文字交给概率。因为 VisualMap 的核心内容包括原文引用、数字、专有名词、Explain / Explore 边界、Add 批注和分享权限。这些信息必须结构化，必须可验证，必须可复制和复用。

最终设计决策：

```text
体验借鉴 Flipbook：
  打开就是完整画面，点击就下钻，视觉像一张生成图。

实现不完全复刻 Flipbook：
  关键文字、引用、节点、批注、热点和权限全部结构化渲染。
```

### 2.1 它如何做到文字图片还原度高？

公开资料显示，Flipbook 或其开源复刻采用“一页一图”的方式：整页视觉由图像模型直接生成，文字也是图像里的像素，而不是 HTML 文本。

这种方式的优点是：

- 页面整体感极强。
- 字体、插画、背景、布局天然融合。
- 不需要传统网页布局系统。
- 视觉上像一本完整生成的图解书。

但它也有明显问题：

- 文字不是文本对象，而是“像文字的图案”。
- 英文、中文、数字、专有名词都可能变形。
- 同一个词在不同页面可能写法不一致。
- 无法选中、复制、搜索或无障碍读取。

因此 Flipbook 的“还原度高”主要是视觉整体还原度高，不等于文字准确度高。

用户在 demo 里看到文字很准，可能来自这些因素：

- 文本短：标题、标签和栏目名比长句更容易生成正确。
- 版式固定：信息图模板越稳定，模型越容易按预期绘制。
- 模型强：新一代图像 / 视频模型对短文字有明显提升。
- 质量分层：先显示低质量版本，后台生成更好的版本后替换。
- 样本选择：对外展示通常会避开失败样本。

这些策略可以借鉴，但不能成为 VisualMap 的唯一文字保障。

对 VisualMap 来说，不能完全依赖图片模型生成文字。推荐策略是：

```text
图片模型生成：
  - 背景
  - 插画
  - 节点容器
  - 视觉隐喻
  - 空间关系

程序渲染生成：
  - 标题
  - 摘要
  - 节点文字
  - 引用
  - 数字
  - 来源位置
  - Explain / Explore / Add 标识
```

### 2.2 它如何保持文字图片风格一致？

公开复刻方案里有一个关键机制：所有页面共用同一段 style description，并在父图基础上生成子图。

也就是说，风格一致不靠模型“记忆”，而靠三件事：

```text
固定风格协议
+ 父图作为 reference image
+ 子页 prompt 明确要求继承父图线条、色彩、纸张、标题风格
```

VisualMap 应该把这个机制产品化为 Style Contract。

Style Contract 是每张 Map 的视觉契约，在地图创建时生成并冻结：

```json
{
  "style_id": "style_01",
  "tone": "cinematic visual knowledge poster",
  "palette": ["warm paper", "deep ink", "soft cyan", "muted coral"],
  "typography": {
    "title_font": "serif-display",
    "body_font": "humanist-sans",
    "label_font": "mono-small"
  },
  "line_style": "thin dark ink connectors",
  "background": "layered paper texture with subtle depth",
  "forbidden": ["marketing hero", "dashboard card layout", "neon clutter"]
}
```

后续每一次节点下钻，都必须引用同一个 Style Contract。

## 3. 对四个关键问题的设计回答

## 3A. VisualMap 对 Flipbook 的取舍

### 3A.1 必须学习 Flipbook 的部分

- image-first：第一眼是完整视觉画面，不是网页布局。
- click-to-drill：用户点击画面中的视觉对象继续深入。
- progressive generation：先让用户看到画面，再逐步增强质量。
- style continuity：每一层下钻都像同一本视觉书的一页。
- permalink：每个生成结果都可以保存、返回和分享。

### 3A.2 不能照搬 Flipbook 的部分

- 不能让关键文字只存在于图片像素里。
- 不能让点击语义完全由视觉模型临时猜测。
- 不能让 Explain 和 Explore 混在同一张无法校验的图里。
- 不能让 Add 批注成为图片上的不可编辑涂层。
- 不能让分享态缺少权限快照。

### 3A.3 VisualMap 的最终实现范式

```text
Image-first shell
  -> 用户看到的是一张完整 fancy 画面

Structured core
  -> 系统内部保存 Source / Node / View / Trail / Annotation / Share Snapshot

Hybrid rendering
  -> AI 负责视觉氛围，程序负责文字和交互准确性

Progressive quality
  -> preview 先出，final 后台替换，缓存命中秒开
```

### 3.1 如何做到文字图片还原度高？

VisualMap 采用“两层画面”：

```text
底层：AI Visual Layer
上层：Precise Text Layer
```

底层是一张高质感视觉图，负责 fancy。

上层是可控文本层，负责准确。

渲染顺序：

```text
Source 解析
  -> LLM 抽取结构化节点
  -> Layout Engine 生成节点坐标和文字区域
  -> Image Prompt Builder 生成无关键文字的背景图
  -> Text Renderer 用 SVG / DOM / Canvas 叠加精确文字
  -> Hotspot Engine 绑定点击区域
```

这样可以达到：

- 视觉上像完整图片。
- 文字准确度接近网页文本。
- 节点位置、点击区域和文本内容可复用。
- 分享图可导出为一张合成 PNG。

关键规则：

- 长文本不交给图像模型。
- 专有名词、数字、引用、时间戳必须由程序渲染。
- 图像模型最多生成装饰性伪文字、纹理或模糊背景字。
- 生成前给图片模型明确要求：leave clean empty panels for text overlays。

### 3.2 如何保持文字图片风格一致？

VisualMap 需要三层一致性机制。

第一层：Map 级 Style Contract。

每张地图生成时确定一次风格，后续所有节点继承。

第二层：组件级 Visual Grammar。

定义节点、路径、标签、引用、批注的视觉规则：

```text
Explain 节点：稳定、清晰、带来源锚点
Explore 节点：更开放，有外部连接感
Add 节点：像手写批注或贴纸，但仍可读
分享模式：隐藏编辑控件，保留路径和节点高亮
```

第三层：Reference Image。

下钻生成子页时，把父页缩略图或标记图作为参考输入，让模型延续纸张、色彩、空间感和插画风格。

最终生成策略：

```text
Style Contract
+ Parent Reference Image
+ Node Semantic Plan
+ Fixed Layout Slots
+ Text Overlay Theme
```

### 3.3 如何保障生成速度？

Flipbook 的速度很可能依赖四类策略：

- 低质量图先出，高质量图后台生成。
- WebSocket 或流式方式让用户感知画面正在出现。
- 点击坐标做归一化和缓存。
- 每个生成页都有 permalink，返回时不重新生成。

VisualMap 应该采用类似但更稳的 Pipeline。

#### 3.3.1 双阶段生成

```text
Stage A: Fast Preview
  - 低分辨率背景图
  - 简化布局
  - 先渲染核心节点文字
  - 目标 2-5 秒可见

Stage B: Final Render
  - 高分辨率背景图
  - 完整节点和连接线
  - 完整引用与批注
  - 完成后无感替换
```

#### 3.3.2 并行生成

用户看到总览页时，后台提前生成可能点击的子节点：

```text
当前页生成完成
  -> 根据节点权重选 Top 3-5 个可能点击节点
  -> 预生成子页 plan
  -> 预生成低清背景
  -> 用户点击时秒开预览
```

#### 3.3.3 缓存策略

缓存 key：

```text
hash(
  source_id,
  node_id,
  mode,
  style_id,
  layout_version,
  content_version
)
```

点击坐标如果用于自由探索，需要归一化：

```text
x = round(click_x / width, 2)
y = round(click_y / height, 2)
```

这样相邻点击不会制造大量重复生成。

#### 3.3.4 渐进式加载

页面状态：

```text
empty canvas
  -> source parsed
  -> skeleton map
  -> preview visual
  -> final visual
  -> enhanced subnodes cached
```

用户不应该等所有内容生成完才看到画面。

### 3.4 文字是否使用 SVG？

Flipbook 或开源复刻的公开描述更倾向于“文字在图片里，是 rasterized，不是 HTML”。这意味着它不一定用 SVG 来保证文字准确。

VisualMap 应该主动使用 SVG / DOM / Canvas 文本层。

推荐规则：

```text
交互态：优先 DOM + SVG
导出态：合成 Canvas / PNG
复杂路径和连接线：SVG
大段文本：HTML DOM
短标签和节点标题：SVG text 或 foreignObject
最终分享缩略图：Canvas rasterize
```

为什么不全部用 SVG：

- 大段文本换行、选择、可访问性不如 DOM。
- 多语言字体 fallback 更复杂。
- 移动端性能可能不稳定。

为什么不能全部用 DOM：

- fancy 的地图连线、曲线、发光、路径动画更适合 SVG / Canvas。
- 导出完整视觉图时需要统一合成。

所以最佳方案是：

```text
DOM：正文、引用、详情抽屉
SVG：节点标签、路径、热点边界、模式徽标
Canvas/WebGL：背景、粒子、模糊、整体合成
AI Image：风格化背景和插画
```

## 4. VisualMap 推荐架构

```text
Client
  -> URL Parser
  -> Canvas Shell
  -> Mode Controller
  -> Hotspot Layer
  -> Text Overlay Renderer
  -> Detail Drawer
  -> Progressive Image Loader
  -> Share Readonly Runtime

API
  -> Source Fetcher
  -> Content Parser
  -> Structure Planner
  -> Layout Engine
  -> Prompt Builder
  -> Image Generation Queue
  -> Reference Image Composer
  -> Preview / Final Render Orchestrator
  -> OCR / Visual QA
  -> Cache Manager
  -> Share Snapshot Service

Storage
  -> Source Store
  -> Node Graph Store
  -> Asset Store
  -> Annotation Store
  -> Share Snapshot Store
```

### 4.1 关键模块职责

#### Canvas Shell

负责全屏画布、缩放、节点点击、动效和视觉状态切换。它是用户感知里的“产品本体”，不应该出现传统网页布局感。

#### Structure Planner

把原始内容拆成稳定节点，包括总览、章节、论点、证据、引用和可探索概念。它输出 JSON，不输出 UI。

#### Layout Engine

把节点转成视觉坐标、层级、连线和文字槽位。Layout Engine 的输出必须可复现，不能依赖图片模型临场决定。

#### Prompt Builder

根据 Style Contract、节点语义和布局槽位生成图片 prompt。Prompt 的核心约束是：生成 fancy 背景和视觉容器，但为真实文字留出干净区域。

#### Reference Image Composer

借鉴 Flipbook 的“父图 reference”能力。用户点击下钻时，系统把父页、点击节点高亮、当前 Style Contract 合成为一张 reference image，交给图像模型保持风格一致。

#### Text Overlay Renderer

负责真实文字层。它可以输出 DOM、SVG 和 Canvas 合成结果。所有关键文字都由它渲染。

#### Preview / Final Render Orchestrator

负责双阶段生成。Preview 快速可见，Final 后台替换。

#### Hotspot Layer

负责点击语义。优先使用结构化节点区域，不依赖视觉模型猜用户点了什么。自由点击时才使用视觉模型识别点击区域。

## 5. 核心生成 Pipeline

### 5.1 首屏生成

```text
1. 用户打开 /?url=...
2. Source Fetcher 抓取正文
3. Content Parser 清洗正文
4. Structure Planner 抽取章节、观点、证据
5. Layout Engine 生成节点图和坐标
6. Prompt Builder 生成背景图 prompt
7. Image Model 生成无关键文字背景
8. Text Renderer 叠加标题、节点、引用标识
9. Hotspot Layer 绑定点击区域
10. Cache Manager 存储 map snapshot
```

### 5.2 点击下钻

```text
1. 用户点击节点或坐标
2. Hotspot Layer 判断 node_id
3. Mode Controller 判断 Explain / Explore / Add
4. 读取缓存
5. 如无缓存，生成 child node plan
6. 先返回 Fast Preview
7. 后台生成 Final Render
8. 完成后替换并缓存
```

### 5.2.1 点击语义解析策略

VisualMap 支持两类点击。

第一类是结构化节点点击：

```text
用户点击已知节点区域
  -> 直接得到 node_id
  -> 根据当前 mode 生成或读取对应视图
```

这是 MVP 的默认方式，速度最快、准确性最高。

第二类是自由区域点击：

```text
用户点击非节点区域
  -> 系统在父图上绘制点击标记
  -> 交给 VLM 识别用户想探索的对象
  -> 生成临时 exploration node
```

这类能力更接近 Flipbook，但第一版不作为主路径。原因是自由点击更容易引入不确定性和生成成本。

### 5.3 分享模式

```text
1. 创建者点击分享
2. Share Snapshot Service 冻结当前 map graph
3. 记录公开批注范围
4. 生成 read_only token
5. 访问者打开分享链接
6. 只能读取节点、下钻、查看公开内容
```

## 6. 数据结构

### 6.1 Map

```json
{
  "id": "map_1",
  "source_id": "source_1",
  "style_id": "style_1",
  "root_node_id": "node_root",
  "status": "ready",
  "created_at": "2026-05-04T10:00:00Z"
}
```

### 6.2 Node

```json
{
  "id": "node_1",
  "map_id": "map_1",
  "type": "argument",
  "title": "核心论点",
  "summary": "该节点的简短解释",
  "mode_support": ["explain", "explore", "add"],
  "sources": [
    {
      "text": "原文片段",
      "location": "paragraph_4"
    }
  ],
  "layout": {
    "x": 0.42,
    "y": 0.38,
    "w": 0.18,
    "h": 0.12
  },
  "children": []
}
```

### 6.3 Render Asset

```json
{
  "id": "asset_1",
  "node_id": "node_1",
  "mode": "explain",
  "quality": "preview",
  "background_url": "r2://...",
  "overlay_svg_url": "r2://...",
  "composited_png_url": "r2://...",
  "status": "ready"
}
```

### 6.4 Style Contract

```json
{
  "id": "style_1",
  "prompt_string": "A cinematic interactive knowledge poster...",
  "palette": ["#F4E8D0", "#20232A", "#4E8EA2", "#D36B5D"],
  "font_tokens": {
    "title": "serif-display",
    "body": "sans-readable",
    "meta": "mono"
  },
  "layout_rules": {
    "max_nodes_per_view": 9,
    "min_text_contrast": 4.5,
    "safe_margin": 0.08
  }
}
```

## 7. 文字准确性保障

### 7.0 文字渲染总原则

VisualMap 的文字分为三类：

```text
Critical Text：
  标题、节点名、引用、数字、来源、时间戳、模式标签
  -> 必须程序渲染

Decorative Text：
  背景中的模糊笔记、纹理、非关键信息
  -> 可以交给图片模型

Generated Suggestion：
  Explore 问题、推荐阅读、类比、争议
  -> LLM 生成，程序渲染，并标注来源状态
```

Flipbook 可以接受文字偶发错误，因为它偏探索和视觉体验。VisualMap 的 Explain 模式不能接受这种错误。

### 7.1 生成前约束

- LLM 输出结构化 JSON，不直接输出视觉图。
- 所有可见文字先经过 spellcheck 和引用校验。
- 长标题自动压缩。
- 节点最多显示 2 行短文字。

### 7.2 渲染时约束

- 文本由程序渲染。
- 自动测量文本宽度。
- 超出则换行、缩短或进入详情抽屉。
- 多语言使用稳定字体 fallback。

### 7.3 生成后校验

- OCR 检测背景图里是否出现错误关键文字。
- Pixel QA 检测文字遮挡、对比度、超出边界。
- 引用 QA 检查 Explain 节点是否都有 source。
- Screenshot QA 检查不同窗口尺寸下文字不重叠、不溢出。
- Share QA 检查只读模式不会出现 Add 控件。

### 7.4 SVG / DOM / Canvas 的分工

```text
DOM：
  详情抽屉、大段引用、批注列表、输入框模式。

SVG：
  节点标题、短标签、连线、热点边界、模式徽标、路径动画。

Canvas / WebGL：
  背景合成、光效、纹理、转场、最终 PNG 导出。

AI Image：
  插画、氛围、空间构图、非关键装饰文本。
```

实现上，首版可以先用 DOM + SVG 完成精确文字，再用 CSS / Canvas 做视觉融合。等核心链路稳定后，再加入更强的 Canvas 合成和导出。

## 8. 风格一致性保障

每张 Map 只允许一个 Style Contract。

每次生成必须包含：

```text
style_contract.prompt_string
parent_reference_image
layout_slots
forbidden_style_list
```

禁止每次让模型重新发明风格。

## 9. 速度保障方案

### 9.1 用户感知目标

```text
0-1s：显示画布 shell
1-3s：显示结构 skeleton
3-6s：显示 preview map
6-15s：替换 final map
```

### 9.1.1 Flipbook 式速度策略的 VisualMap 版本

Flipbook 的“快”不是一次性生成最终完美画面，而是让用户先进入体验：

```text
先给低质量可用版本
后台生成高质量版本
完成后提示或无感替换
```

VisualMap 采用同样的感知策略，但 preview 阶段必须保证文字准确：

```text
Preview：
  结构准确、文字准确、视觉较简化

Final：
  视觉更 fancy、背景更丰富、动效更完整
```

这意味着 preview 可以没有完美背景，但不能有错误文字。

### 9.2 后端策略

- 使用任务队列处理图像生成。
- preview 和 final 分开队列。
- 热门节点预生成。
- 失败时返回结构化地图，不阻塞阅读。
- 所有生成结果写入对象存储。
- permalink 命中缓存时不重新生成。

### 9.3 前端策略

- 首屏 skeleton 立即出现。
- 节点文字先出现，背景后替换。
- 图片渐进加载。
- 点击后先进入已有结构页，再等待视觉增强。

### 9.4 缓存层级

```text
L1 Client Cache：
  当前会话访问过的节点、图片、overlay。

L2 Edge Cache：
  分享链接、公开地图、静态合成图。

L3 Object Storage：
  所有 preview / final render asset。

L4 Semantic Cache：
  相同 source + style + node plan 的生成结果。
```

缓存命中时，用户应该直接看到最终版本，不再经历生成动画。

## 10. 为什么 VisualMap 不应完全复刻 Flipbook

完全复刻 Flipbook 会带来三个风险：

- 文字错误不可控。
- 来源引用不可验证。
- Add 批注和分享权限难以结构化。

VisualMap 的正确方向是：

```text
借鉴 Flipbook 的 image-first 体验
但不要继承它的 text-as-pixels 风险
```

也就是说，VisualMap 要看起来像一张完整生成图，但底层必须是结构化、可验证、可编辑、可分享的知识系统。

## 11. 实施路线

### Phase 0：本地原型骨架

目标：先证明 VisualMap 不是传统网页，而是打开即画布。

任务：

- 搭建全屏 Canvas Shell。
- 支持中心输入框模式。
- 支持 URL query 参数读取。
- 用 mock 数据渲染一张视觉知识地图。
- 用 SVG 渲染节点、连线和热点。
- 用 DOM 渲染详情抽屉。
- 支持点击节点进入下一层 mock 页面。

验收：

- 打开页面第一眼是完整画布。
- 没有传统 landing page 感。
- 节点文字清晰准确。
- 点击节点可以下钻。

### Phase 1：结构化内容 MVP

目标：把真实文章变成结构化地图。

任务：

- 支持文章 URL 输入。
- 抓取和清洗正文。
- 调用 LLM 生成 Source / Node / View JSON。
- Layout Engine 生成节点坐标。
- 前端按 JSON 渲染地图。
- Explain 节点显示引用。
- 支持路径返回。

验收：

- 输入文章后能生成总览地图。
- 每个 Explain 节点有原文引用。
- 地图不依赖图片模型也能完整可用。

### Phase 2：Flipbook 式视觉层

目标：让地图从“结构化图谱”升级成“fancy 生成画面”。

任务：

- 定义 Style Contract。
- Prompt Builder 生成无关键文字背景图 prompt。
- 生成 preview 背景图。
- 叠加 SVG / DOM 文字层。
- 将父图作为 reference image 生成子页背景。
- 支持节点高亮 reference。

验收：

- 背景和节点风格一致。
- 子页和父页像同一套视觉系统。
- 关键文字仍由程序渲染，不能出现在背景图中被误写。

### Phase 3：高速体验

- 引入 Style Contract。
- 支持 parent reference image。
- 加入 preview / final 双阶段生成。
- 加入节点预生成。
- 加入缓存和 permalink。

验收：

- 3 秒内出现结构化可点击地图。
- 6 秒内出现 preview visual。
- final visual 完成后可无感替换。
- 返回已访问节点不重新生成。

### Phase 4：Add 与分享模式

目标：完成个人批注和只读传播。

任务：

- Annotation Store。
- Add 模式右侧批注面板。
- 节点批注标识。
- 批注 visibility。
- Share Snapshot Service。
- 只读分享 runtime。
- 分享链接缓存和权限校验。

验收：

- 创建者可以添加批注。
- 分享访问者可以下钻但不能编辑。
- 私有批注不会出现在分享链接里。

### Phase 5：质量保障

- OCR 检测。
- 文本溢出检测。
- 引用完整性检测。
- 分享快照权限测试。
- Playwright 截图检测。
- 不同视口尺寸布局检测。

### Phase 6：更强的视觉浏览器形态

- 支持上传图片作为起点。
- 支持视频 / PDF / 论文。
- 支持动效背景。
- 支持导出完整 PNG 或交互分享页。

## 11A. MVP 技术验收标准

第一版不能只看“能不能生成图”，而要看下面这些指标：

```text
入口：
  /?url=... 可以直接进入生成流程
  无 url 时进入输入框模式

画面：
  第一屏是全屏视觉画布
  没有传统网站首页结构
  节点、连线、背景形成完整视觉图

文字：
  关键文字由 DOM / SVG 渲染
  引用、数字、专有名词不交给图片模型
  移动端和桌面端不溢出

点击：
  节点 hotspot 和 node_id 绑定
  点击后进入对应子节点
  返回路径可用

模式：
  Explain / Explore / Add 可切换
  分享模式只读

速度：
  skeleton <= 1s
  结构地图 <= 3s
  preview visual <= 6s
  final visual 可后台替换

可信：
  Explain 节点必须有 source
  Explore 节点必须有 relation_to_source
  Add 内容必须和系统内容分层
```

## 12. 参考资料

- Flipbook public site: https://flipbook.run/
- OpenFlipbook article: https://imtaqin.id/openflipbook-open-source-flipbook
- R2 Clickthrough analysis: https://www.r2clickthrough.com/illustrated-explainer-spec-red-circle-trick/
- VISK Flipbook test: https://visk.co.jp/blog/%E3%80%8Cai%E3%81%8C%E7%94%BB%E9%9D%A2%E3%81%AE%E5%85%A8%E3%83%94%E3%82%AF%E3%82%BB%E3%83%AB%E3%82%92%E6%8F%8F%E3%81%8F%E3%80%8D%E3%81%A3%E3%81%A6%E6%9C%AC%E5%BD%93%EF%BC%9F%E8%A9%B1%E9%A1%8C%E3%81%AEflipbook%E3%82%92%E5%AE%9F%E6%B8%AC%E3%81%97%E3%81%A6%E3%81%BF%E3%81%9F

## 13. 最终建议

VisualMap 的技术策略应该是：

```text
体验上像 Flipbook：
  打开就是完整画面，点击就下钻，视觉足够 fancy。

实现上不要像 Flipbook：
  不把关键文字交给图片模型，不把结构藏进像素里。

底层要像知识系统：
  节点、引用、批注、分享、权限、缓存全部结构化。
```

这条路线能同时保留 Flipbook 最迷人的部分和 VisualMap 最需要的可信度。
