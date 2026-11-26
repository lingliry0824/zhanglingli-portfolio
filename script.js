/* ============================================================
   张伶俐 · 作品集 v2 —— 交互脚本（Ground-Up Rebuild）
   1. 星野画布 / 阅读进度 / 入场动画 / 数字计数
   2. 能力星图：SVG 星座连线、星群聚焦、遥测预览、详情抽屉
   3. 实习档案：标签切换 + 展开全部
   4. Ask AI：本地知识库问答（3 预设问题 + 悬浮球 + 面板）
   5. 邮箱一键复制
   ============================================================ */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── 1. 星野画布 ───────────────────────────────── */
  var canvas = document.getElementById("stars");
  if (canvas) {
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0;
    var H = 0;
    var stars = [];
    var raf = 0;
    var running = true;

    function buildStars() {
      var count = Math.min(140, Math.round((W * H) / 16000));
      stars = [];
      for (var i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: Math.random() * 1.15 + 0.3,
          a: Math.random() * 0.45 + 0.14,
          p: Math.random() * Math.PI * 2,
          s: Math.random() * 0.0007 + 0.0002,
          z: Math.random() * 0.7 + 0.2,
        });
      }
    }

    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildStars();
    }

    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      var drift = window.scrollY * 0.04;

      for (var i = 0; i < stars.length; i++) {
        var st = stars[i];
        var twinkle = st.a + Math.sin(t * st.s + st.p) * 0.18;
        var alpha = Math.max(0, Math.min(1, twinkle));
        var y = st.y - drift * st.z;
        y = ((y % H) + H) % H;

        ctx.beginPath();
        ctx.arc(st.x, y, st.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(198, 226, 255," + alpha.toFixed(3) + ")";
        ctx.fill();
      }

      if (running) raf = window.requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize, { passive: true });

    if (reduce) {
      draw(0);
      running = false;
    } else {
      raf = window.requestAnimationFrame(draw);
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
          running = false;
          window.cancelAnimationFrame(raf);
        } else {
          running = true;
          raf = window.requestAnimationFrame(draw);
        }
      });
    }
  }

  /* ── 2. 阅读进度 ───────────────────────────────── */
  var bar = document.getElementById("progressBar");
  var ticking = false;

  function updateProgress() {
    if (!bar) return;
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var p = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
    bar.style.width = (p * 100).toFixed(2) + "%";
    ticking = false;
  }

  window.addEventListener(
    "scroll",
    function () {
      if (!ticking) {
        window.requestAnimationFrame(updateProgress);
        ticking = true;
      }
    },
    { passive: true }
  );
  updateProgress();

  /* ── 3. 入场动画 ───────────────────────────────── */
  var reveals = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  var groups = new Map();
  reveals.forEach(function (el) {
    var parent = el.parentElement;
    if (!groups.has(parent)) groups.set(parent, []);
    groups.get(parent).push(el);
  });
  groups.forEach(function (list) {
    list.forEach(function (el, i) {
      el.style.setProperty("--d", Math.min(i * 70, 280) + "ms");
    });
  });

  if (reduce || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -5% 0px" }
    );
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ── 4. 导航高亮 ───────────────────────────────── */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav-links a[href^='#']"));
  var sections = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);

  function updateActiveNav() {
    if (!sections.length) return;
    var probe = window.scrollY + window.innerHeight * 0.4;
    var current = sections[0];

    sections.forEach(function (s) {
      var top = s.getBoundingClientRect().top + window.scrollY;
      if (top <= probe) current = s;
    });

    var atBottom =
      window.innerHeight + window.scrollY >=
      document.documentElement.scrollHeight - 4;
    if (atBottom) current = sections[sections.length - 1];

    navLinks.forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("href") === "#" + current.id);
    });
  }

  window.addEventListener("scroll", updateActiveNav, { passive: true });
  updateActiveNav();

  /* ── 5. 数字计数 ───────────────────────────────── */
  function formatCount(value, el) {
    var decimals = parseInt(el.dataset.decimals || "0", 10);
    var out = value.toFixed(decimals);
    if (el.dataset.format === "comma") {
      var parts = out.split(".");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      out = parts.join(".");
    }
    return out + (el.dataset.suffix || "");
  }

  function animateCount(el) {
    var target = parseFloat(el.dataset.count);
    if (isNaN(target)) return;
    var duration = 1400;
    var start = performance.now();

    function step(now) {
      var t = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = formatCount(target * eased, el);
      if (t < 1) window.requestAnimationFrame(step);
      else el.textContent = formatCount(target, el);
    }
    window.requestAnimationFrame(step);
  }

  var counters = Array.prototype.slice.call(document.querySelectorAll("[data-count]"));
  if (!reduce && "IntersectionObserver" in window) {
    counters.forEach(function (el) { el.textContent = formatCount(0, el); });
    var countIO = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            countIO.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.55 }
    );
    counters.forEach(function (el) { countIO.observe(el); });
  }

  /* ═══════════════════════════════════════════
     6. 能力星图 + 星座连线 + 遥测 + 详情抽屉
     ═══════════════════════════════════════════ */
  var CLUSTERS = {
    product: { code: "01", name: "产品方法" },
    tech: { code: "02", name: "AI 与数据" },
    medical: { code: "03", name: "医疗与背景" },
    practice: { code: "04", name: "实践与状态" },
  };

  var DETAILS = {
    "ai-product": {
      cluster: "product",
      label: "AI 产品",
      title: "以产品的方式做 AI",
      meta: "2026.05 — 2026.11 · 三段 0→1 实习",
      intro: "三段实习都不是「参与」，而是从 0 到 1：调研、PRD、原型、验收，完整走一遍。",
      items: [
        "丛容地健康科技：女性运动健康穿戴设备，搭建五大指标体系，已进入 iOS 产品验证。",
        "益耳康科技：耳石症居家康复 AI 动作监测，45 项硬件验收 + 15 项算法验收，获百万级融资。",
        "国健智算：医疗 Agent 知识库，458,684 条机构数据入库。",
      ],
      link: "#experience",
      linkText: "查看完整实习经历",
    },
    research: {
      cluster: "product",
      label: "需求调研",
      title: "先搞清楚问题，再谈方案",
      meta: "200+ 份问卷 · 医生访谈 · 权威标准",
      intro: "她的调研不是收集信息，是把模糊需求翻译成可以验收的指标。",
      items: [
        "耳石症项目：回收 200+ 份用户问卷，深度访谈耳鼻喉科医生。",
        "对照 WHO、USDA、Nutri-Score 及 Oura Ring / Whoop，定义五项核心指标。",
        "输出需求优先级清单，作为 MVP 边界的依据。",
      ],
      link: "#experience",
      linkText: "查看完整实习经历",
    },
    metrics: {
      cluster: "product",
      label: "指标体系",
      title: "把感受变成可以验收的数字",
      meta: "健康评分 · 营养口径 · 算法验收",
      intro: "医疗与健康产品里，最难的是「说不清」。她的方法是先建指标，再建方案。",
      items: [
        "女性运动健康：热量缺口、健康结构、营养质量、肌肉支持、皮肤五项指标。",
        "设计健康结构评分权重与新版 Nutri-Score 计算口径。",
        "定义动作识别准确率、纠错响应时延等验收指标。",
      ],
      link: "#experience",
      linkText: "查看完整实习经历",
    },
    prototype: {
      cluster: "product",
      label: "原型设计",
      title: "先做出来，再讨论",
      meta: "Figma · 高保真交互",
      intro: "高保真原型是她和算法、硬件、设计对齐的共同语言。",
      items: [
        "五大指标模块的高保真交互原型。",
        "耳石症 AI 动作监测：6 大功能模块 + 用户旅程图。",
        "用原型固定 MVP 边界，避免范围蔓延。",
      ],
      link: "#experience",
      linkText: "查看完整实习经历",
    },
    prd: {
      cluster: "product",
      label: "PRD 撰写",
      title: "把讨论变成可以执行的文档",
      meta: "输入输出 · 边界 · 交付标准",
      intro: "每一份 PRD 都直接服务于算法、硬件与开发落地。",
      items: [
        "五大指标模块 PRD，写清输入输出与优先级。",
        "耳石症项目完整 PRD 与 MVP 能力边界。",
        "知识库建设：7 个核心环节与交付标准。",
      ],
      link: "#experience",
      linkText: "查看完整实习经历",
    },
    mvp: {
      cluster: "product",
      label: "MVP 规划",
      title: "先验证最危险的那一步",
      meta: "边界控制 · 一期优先级",
      intro: "克制需求范围，先把核心闭环跑通。",
      items: [
        "划定 MVP 核心能力边界与一期需求优先级。",
        "规划 AI 智能分析等功能的优先级。",
        "把「以后再说」明确写进文档。",
      ],
      link: "#experience",
      linkText: "查看完整实习经历",
    },
    "zero-to-one": {
      cluster: "product",
      label: "0→1",
      title: "三段从零到一",
      meta: "从 0 搭建 · 完整闭环",
      intro: "不是维护存量，而是把不存在的东西做出来。",
      items: [
        "丛容地健康科技：从 0 搭建女性运动健康指标体系。",
        "益耳康科技：从 0 定义 AI 动作监测产品。",
        "国健智算：从 0 建设医疗 Agent 知识库。",
      ],
      link: "#experience",
      linkText: "查看完整实习经历",
    },
    agent: {
      cluster: "tech",
      label: "Agent",
      title: "把 Agent 当成一个系统来设计",
      meta: "AI Native 长篇小说创作 Agent · 独立开发者",
      intro: "从运行框架到记忆策略，再到效果评测，她关心的是「它为什么会失败」。",
      items: [
        "七阶段可控生成工作流，替代单轮续写模式。",
        "基于 nano-cc Harness 落地状态管理、工具调用、流程编排、运行日志。",
        "人物一致性 78.4% → 95.0%，Token 消耗下降 34.5%。",
      ],
      link: "#project",
      linkText: "查看完整项目",
    },
    rag: {
      cluster: "tech",
      label: "RAG",
      title: "知识库的胜负在数据质量",
      meta: "34 个省级行政区 · 34 类医疗关键词 · 458,684 条",
      intro: "她做的不是「接一个向量库」，而是从采集、清洗到检索可用性的整条链路。",
      items: [
        "基于高德地图 API 设计医疗机构 POI 采集与结构化方案。",
        "定义 5 类核心字段口径与机构标签体系。",
        "458,684 条标准化数据入库，沉淀可复用的 SOP。",
      ],
      link: "#experience",
      linkText: "查看完整实习经历",
    },
    prompt: {
      cluster: "tech",
      label: "Prompt 工程",
      title: "用评测驱动提示词，而不是靠感觉",
      meta: "50 组评测任务 · LLM-as-a-Judge",
      intro: "建立自动化 + 人工交叉评测集，把 Prompt 优化变成可度量工程。",
      items: [
        "构建 50 组连续生成评测任务集，标注约束条件与判定标准。",
        "LLM-as-a-Judge 结合人工抽检交叉验证，从 4 个维度量化。",
        "约束执行率 84.0% → 98.0%。",
      ],
      link: "#project",
      linkText: "查看完整项目",
    },
    data: {
      cluster: "tech",
      label: "数据入库",
      title: "45 万条数据背后的工程耐心",
      meta: "规则筛查 + 人工抽样",
      intro: "高质量知识库依赖严格的字段规范与持续的规则迭代。",
      items: [
        "458,684 条标准化医疗机构数据入库。",
        "归纳 4 类典型数据问题，迭代清洗规则与字段匹配逻辑。",
        "沉淀数据处理 SOP 与字段规范文档。",
      ],
      link: "#experience",
      linkText: "查看完整实习经历",
    },
    health: {
      cluster: "medical",
      label: "医疗健康",
      title: "三段实习，都在医疗健康",
      meta: "临床理解 · 健康管理 · 医疗 Agent",
      intro: "生物医学工程背景与三段一线医疗产品实践相互印证。",
      items: [
        "女性运动健康（穿戴设备）",
        "耳石症居家康复（AI 动作监测）",
        "医疗 Agent 机构检索（RAG 知识库）",
      ],
      link: "#experience",
      linkText: "查看完整实习经历",
    },
    "women-health": {
      cluster: "medical",
      label: "女性健康",
      title: "从真实的身体感受出发",
      meta: "丛容地健康科技 · 2026.09 — 2026.11",
      intro: "女性运动场景下的无感健康记录，是她最近一段实习的核心命题。",
      items: [
        "调研运动穿戴设备与饮食管理类竞品。",
        "搭建五项核心指标 + AI 智能分析规划。",
        "相关功能已进入 iOS 产品验证阶段。",
      ],
      link: "#experience",
      linkText: "查看完整实习经历",
    },
    polyu: {
      cluster: "medical",
      label: "香港理工大学",
      title: "计算机与软件 · 硕士",
      meta: "2027.09 — 2028.11",
      intro: "面向工程与算法深造的全英文研究生项目。",
      items: ["计算机与软件专业硕士。", "全英文授课项目。"],
      link: "#education",
      linkText: "查看完整教育背景",
    },
    szu: {
      cluster: "medical",
      label: "深圳大学",
      title: "生物医学工程 · 本科",
      meta: "2023.09 — 2027.06",
      intro: "医学与工程的交叉训练，奠定医疗健康产品与数据分析基础。",
      items: [
        "核心课程：机器学习、深度学习、信号与系统、统计学、Python、数据分析。",
        "医学与工程的交叉背景，是后来做医疗产品的基础。",
      ],
      link: "#education",
      linkText: "查看完整教育背景",
    },
    heidelberg: {
      cluster: "medical",
      label: "海德堡",
      title: "海德堡大学 & ZI 精神卫生研究所",
      meta: "2026.02 — 2026.05 · 公费交换",
      intro: "海外高强度全英文科研与课程交流经历。",
      items: ["公费交换生，德国。", "在全英文环境里做研究与课程学习。"],
      link: "#education",
      linkText: "查看完整教育背景",
    },
    ielts: {
      cluster: "medical",
      label: "雅思 7.5",
      title: "语言能力",
      meta: "全英文学习与研究工作流",
      intro: "具备顺畅阅读英文一手论文、文档与全英文协作能力。",
      items: ["雅思 7.5。", "香港理工大学硕士为全英文授课项目。", "海德堡交换期间为英文环境。"],
      link: "#skills",
      linkText: "查看技能与荣誉",
    },
    bci: {
      cluster: "medical",
      label: "BCI",
      title: "脑机接口 · 世界机器人大赛",
      meta: "竞赛与科创项目荣誉",
      intro: "在信号处理与跨学科工程落地方面获得权威竞赛认可。",
      items: ["世界机器人大赛 BCI 全国前十五。", "深圳科创学院优秀项目银奖（第 2 名）。"],
      link: "#skills",
      linkText: "查看技能与荣誉",
    },
    cyberboss: {
      cluster: "practice",
      label: "CyberBoss",
      title: "微信里的 AI 生活助理",
      meta: "个人实践 · 基于开源项目的本地部署与配置",
      intro: "把 Codex / Claude Code 接进微信，让 Agent 拥有时间感、行踪感与主动唤醒能力。我在本地完成了部署、人格配置与工具链调试。",
      items: [
        "绝对时间感 + 随机唤醒：每条消息带时间戳，checkin 在随机区间主动出现。",
        "生活时间轴与 Zero-Token 日记：从聊天碎片重构事件，并生成本地日记。",
        "行踪感 whereabouts MCP：接收定位、电量与触发原因，可查停留与移动。",
        "提醒队列与 MCP 工具：发文件、表情包、系统消息、时间轴截图。",
        "基于开源项目 WenXiaoWendy/cyberboss（AGPL-3.0）的本地部署与配置实践。",
      ],
      link: "#project",
      linkText: "查看完整项目介绍",
      demoLink: "cyberboss.html",
      demoText: "打开交互演示",
    },
    availability: {
      cluster: "practice",
      label: "可实习 6 个月",
      title: "现在可以聊",
      meta: "AI 产品实习 · 坐标深圳",
      intro: "目前在找 AI 产品方向的实习机会。",
      items: ["可实习 6 个月。", "坐标深圳。", "邮箱 2120198920@qq.com"],
      link: "#contact",
      linkText: "前往联系方式",
    },
  };

  /* ── 星图元素选取 ──────────────────────────────── */
  var cloud = document.getElementById("cloud");
  var cloudSvg = document.getElementById("cloudSvg");
  var starNodes = Array.prototype.slice.call(document.querySelectorAll(".star-node"));
  var mobileStarBtns = Array.prototype.slice.call(document.querySelectorAll(".ms-btn"));
  var cLabels = Array.prototype.slice.call(document.querySelectorAll(".c-label[data-cluster-anchor]"));
  var clusterBtns = Array.prototype.slice.call(document.querySelectorAll(".cluster-btn[data-cluster-filter]"));
  var mobileGroups = Array.prototype.slice.call(document.querySelectorAll(".ms-group[data-cluster-group]"));

  var teleTag = document.getElementById("teleTag");
  var teleMeta = document.getElementById("teleMeta");
  var teleTitle = document.getElementById("teleTitle");
  var teleDesc = document.getElementById("teleDesc");

  var activeFilter = "all";
  var arcLines = [];

  function parseCoord(el) {
    return {
      x: parseFloat(el.style.getPropertyValue("--x")) || 50,
      y: parseFloat(el.style.getPropertyValue("--y")) || 50,
    };
  }

  /* 绘制主题星群连线（SVG arcs） */
  function buildConstellationArcs() {
    if (!cloudSvg || !starNodes.length) return;
    var byCluster = {};
    starNodes.forEach(function (btn) {
      var c = btn.dataset.cluster;
      if (!byCluster[c]) byCluster[c] = [];
      byCluster[c].push(btn);
    });

    Object.keys(byCluster).forEach(function (c) {
      var list = byCluster[c];
      var hub = list.find(function (b) { return b.dataset.hub === c; }) || list[0];
      var hp = parseCoord(hub);

      list.forEach(function (node) {
        if (node === hub) return;
        var np = parseCoord(node);
        var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", hp.x);
        line.setAttribute("y1", hp.y);
        line.setAttribute("x2", np.x);
        line.setAttribute("y2", np.y);
        line.setAttribute("class", "c-arc");
        line.dataset.cluster = c;
        cloudSvg.appendChild(line);
        arcLines.push(line);
      });
    });
  }

  function applyClusterState(focusCluster) {
    var target = focusCluster || activeFilter;
    var isAll = target === "all";

    starNodes.forEach(function (el) {
      var match = el.dataset.cluster === target;
      el.classList.toggle("is-on", !isAll && match);
      el.classList.toggle("is-dim", !isAll && !match);
    });

    arcLines.forEach(function (line) {
      var match = line.dataset.cluster === target;
      line.classList.toggle("is-on", !isAll && match);
      line.classList.toggle("is-dim", !isAll && !match);
    });

    cLabels.forEach(function (a) {
      var match = a.dataset.clusterAnchor === target;
      a.classList.toggle("is-on", !isAll && match);
      a.classList.toggle("is-dim", !isAll && !match);
    });
  }

  function resetTelemetry() {
    if (!teleTag || !teleTitle || !teleMeta) return;
    if (activeFilter === "all") {
      teleTag.textContent = "CONSTELLATION · READY";
      teleMeta.textContent = "20 NODES";
      teleTitle.textContent = "点击右侧星点，展开经历档案";
      if (teleDesc) teleDesc.textContent = "悬停任意关键词可在此实时预览摘要，或直接切换左侧星群聚焦。";
    } else {
      var info = CLUSTERS[activeFilter];
      var count = starNodes.filter(function (k) { return k.dataset.cluster === activeFilter; }).length;
      teleTag.textContent = info.code + " · " + info.name;
      teleMeta.textContent = count + " NODES IN CLUSTER";
      teleTitle.textContent = "当前聚焦「" + info.name + "」星群，点击节点查看详情";
      if (teleDesc) teleDesc.textContent = "";
    }
  }

  buildConstellationArcs();
  resetTelemetry();

  /* 星群导航切换 */
  clusterBtns.forEach(function (tab) {
    tab.addEventListener("click", function () {
      activeFilter = tab.dataset.clusterFilter || "all";
      clusterBtns.forEach(function (t) {
        t.classList.toggle("is-active", t === tab);
      });

      mobileGroups.forEach(function (g) {
        var show = activeFilter === "all" || g.dataset.clusterGroup === activeFilter;
        g.classList.toggle("is-hidden", !show);
      });

      applyClusterState(null);
      resetTelemetry();
    });
  });

  /* 桌面星点交互：悬停遥测 + 点击抽屉 */
  starNodes.forEach(function (el) {
    el.addEventListener("mouseenter", function () {
      var d = DETAILS[el.dataset.key];
      applyClusterState(el.dataset.cluster);
      if (d && teleTag && teleTitle && teleMeta) {
        var cl = CLUSTERS[d.cluster];
        teleTag.textContent = cl.code + " · " + d.label;
        teleMeta.textContent = "CLICK TO OPEN →";
        teleTitle.textContent = d.title;
        if (teleDesc) teleDesc.textContent = d.intro || "";
      }
    });

    el.addEventListener("focus", function () {
      var d = DETAILS[el.dataset.key];
      applyClusterState(el.dataset.cluster);
      if (d && teleTag && teleTitle) {
        var cl = CLUSTERS[d.cluster];
        teleTag.textContent = cl.code + " · " + d.label;
        teleTitle.textContent = d.title;
        if (teleDesc) teleDesc.textContent = d.intro || "";
      }
    });

    el.addEventListener("mouseleave", function () {
      applyClusterState(null);
      resetTelemetry();
    });

    el.addEventListener("blur", function () {
      applyClusterState(null);
      resetTelemetry();
    });

    el.addEventListener("click", function () {
      openDrawer(el.dataset.key);
    });
  });

  /* 移动端星群按钮 */
  mobileStarBtns.forEach(function (el) {
    el.addEventListener("click", function () {
      openDrawer(el.dataset.key);
    });
  });

  /* ── 抽屉逻辑 ───────────────────────────────── */
  var drawer = document.getElementById("drawer");
  var drawerBody = document.getElementById("drawerBody");
  var drawerOverlay = document.getElementById("drawerOverlay");
  var drawerClose = document.getElementById("drawerClose");
  var lastFocused = null;

  function openDrawer(key) {
    var d = DETAILS[key];
    if (!d || !drawer) return;

    lastFocused = document.activeElement;
    starNodes.forEach(function (k) { k.classList.toggle("is-selected", k.dataset.key === key); });

    var cl = CLUSTERS[d.cluster];
    var html =
      '<span class="drawer-cluster">' + cl.code + " / " + cl.name + "</span>" +
      '<span class="drawer-label">' + d.label + "</span>" +
      '<h2 class="drawer-title">' + d.title + "</h2>";
    if (d.meta) html += '<p class="drawer-meta">' + d.meta + "</p>";
    if (d.intro) html += '<p class="drawer-intro">' + d.intro + "</p>";
    html +=
      '<ul class="drawer-list">' +
      d.items.map(function (x) { return "<li>" + x + "</li>"; }).join("") +
      "</ul>";

    html += '<div class="drawer-actions">';
    html += '<a class="drawer-link" href="' + d.link + '">' + (d.linkText || "查看完整内容") + " →</a>";
    if (d.demoLink) {
      html += '<a class="drawer-link" href="' + d.demoLink + '">' + d.demoText + " →</a>";
    }
    html += "</div>";

    var siblings = Object.keys(DETAILS).filter(function (k) {
      return k !== key && DETAILS[k].cluster === d.cluster;
    });
    if (siblings.length) {
      html += '<div class="drawer-related">';
      html += '<span class="drawer-related-title">SAME CLUSTER · 同星群节点</span>';
      html += '<div class="drawer-related-list">';
      siblings.forEach(function (sk) {
        html += '<button type="button" class="drawer-rel-btn" data-rel-key="' + sk + '">' + DETAILS[sk].label + "</button>";
      });
      html += "</div></div>";
    }

    drawerBody.innerHTML = html;
    drawer.classList.add("open");
    drawerOverlay.classList.add("show");
    drawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("lock");
    drawer.scrollTop = 0;

    drawerBody.querySelectorAll(".drawer-link[href^='#']").forEach(function (a) {
      a.addEventListener("click", function () { closeDrawer(false); });
    });

    drawerBody.querySelectorAll("[data-rel-key]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openDrawer(btn.getAttribute("data-rel-key"));
      });
    });

    window.setTimeout(function () {
      if (drawerClose) drawerClose.focus({ preventScroll: true });
    }, 50);
  }

  function closeDrawer(restoreFocus) {
    if (!drawer) return;
    drawer.classList.remove("open");
    drawerOverlay.classList.remove("show");
    drawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("lock");
    starNodes.forEach(function (k) { k.classList.remove("is-selected"); });
    if (restoreFocus !== false && lastFocused && lastFocused.focus) {
      lastFocused.focus({ preventScroll: true });
    }
  }

  if (drawerClose) drawerClose.addEventListener("click", function () { closeDrawer(); });
  if (drawerOverlay) drawerOverlay.addEventListener("click", function () { closeDrawer(); });

  /* ═══════════════════════════════════════════
     6b. 实习档案 · 标签切换 + 展开全部
     ═══════════════════════════════════════════ */
  var expTabs = Array.prototype.slice.call(document.querySelectorAll(".exp-tab[data-exp-tab]"));
  var expPanels = Array.prototype.slice.call(document.querySelectorAll(".exp-panel[data-exp-panel]"));
  var expConsole = document.getElementById("expConsole");
  var expToggleAll = document.getElementById("expToggleAll");

  expTabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      var idx = tab.dataset.expTab;
      expTabs.forEach(function (t) {
        var on = t.dataset.expTab === idx;
        t.classList.toggle("is-active", on);
        t.setAttribute("aria-selected", on ? "true" : "false");
      });
      expPanels.forEach(function (p) {
        p.classList.toggle("is-active", p.dataset.expPanel === idx);
      });
    });
  });

  if (expToggleAll && expConsole) {
    expToggleAll.addEventListener("click", function () {
      var isAll = expConsole.classList.toggle("is-all");
      expToggleAll.classList.toggle("is-on", isAll);
      expToggleAll.setAttribute("aria-pressed", isAll ? "true" : "false");
      expToggleAll.textContent = isAll ? "切回逐条查看" : "展开全部对比";
    });
  }

  /* ═══════════════════════════════════════════
     7. Ask AI · 本地知识库
     ═══════════════════════════════════════════ */
  var KB = [
    {
      keys: ["关键词", "三个词", "标签", "概括", "一句话"],
      a:
        "如果只用三个词概括，是这三个：\n" +
        "**结构化** —— 把模糊需求拆成指标、流程和验收标准。\n" +
        "**共情力** —— 三段实习都在医疗健康，习惯先理解人，再设计功能。\n" +
        "**落地感** —— 从 PRD 到原型到测试验收，最后都能落到可量化的数字上。",
    },
    {
      keys: ["长处", "优点", "优势", "能力", "擅长", "强项", "厉害"],
      a:
        "可以分三层看：\n" +
        "**产品层**：需求调研、PRD、原型、MVP 规划、跨端协作与版本迭代。\n" +
        "**AI 层**：Agent 产品设计、RAG 知识库、Prompt 工程、内容质量评测。\n" +
        "**数据层**：Python、SQL、数据清洗与字段口径定义。\n" +
        "比较稀缺的一点是：她既能把指标定义清楚，也能自己写脚本把数据跑出来。",
    },
    {
      keys: ["缺点", "不足", "短板", "弱点", "改进"],
      a:
        "说两点比较客观的：\n" +
        "一是**先拆细再动手**。方案会更严谨，但前期调研容易投入偏多，有时可以更早做最小验证。\n" +
        "二是**表达偏书面**。PRD 写得很顺，临场口头汇报还在练。",
    },
    {
      keys: ["教育", "学历", "学校", "大学", "专业", "硕士", "本科", "读书", "毕业"],
      a:
        "**本科**：深圳大学 · 生物医学工程（2023.09 — 2027.06），核心课程有机器学习、深度学习、信号与系统、统计学、Python、数据分析。\n" +
        "**硕士**：香港理工大学 · 计算机与软件（2027.09 — 2028.11）。\n" +
        "**交换**：2026.02 — 2026.05，海德堡大学 & ZI 精神卫生研究所，公费交换。",
    },
    {
      keys: ["实习", "工作", "经历", "公司", "企业"],
      a:
        "三段 0→1 的实习：\n" +
        "1. **丛容地健康科技**（2026.09 — 2026.11）：女性运动健康穿戴设备，五大指标体系 + PRD + 高保真原型，已进入 iOS 验证。\n" +
        "2. **益耳康科技**（2026.07 — 2026.09）：耳石症居家康复 AI 动作监测，45 项硬件验收 + 15 项算法验收，获百万级融资。\n" +
        "3. **国健智算**（2026.05 — 2026.07）：医疗 Agent 知识库，458,684 条机构数据入库。",
    },
    {
      keys: ["项目", "agent", "小说", "作品", "创作"],
      a:
        "**AI Native 长篇小说创作 Agent**（独立开发者，2025.05 — 2026.08）。\n" +
        "针对「设定遗忘、事实冲突、上下文膨胀」，设计七阶段可控生成工作流，基于 nano-cc Harness 落地状态管理、工具调用、流程编排、运行日志四个模块。\n" +
        "效果：人物一致性 78.4% → 95.0%，事实保持率 71.2% → 93.7%，约束执行率 84.0% → 98.0%，Token 消耗下降 34.5%。",
    },
    {
      keys: ["cyberboss", "生活助理", "赛博老板", "微信"],
      a:
        "**CyberBoss** 是一个接入微信的本地生活 Agent Bridge，让 Codex / Claude Code 拥有时间感、行踪感和主动唤醒能力。\n" +
        "核心能力：消息时间戳、随机 checkin、生活时间轴、Zero-Token 日记、行踪 MCP、提醒队列、文件与表情包、共享线程。\n" +
        "伶俐基于开源项目 WenXiaoWendy/cyberboss（AGPL-3.0）在本地完成了部署、人格配置与工具链调试。",
    },
    {
      keys: ["技能", "工具", "会什么", "技术栈", "软件", "figma", "python", "sql"],
      a:
        "**产品**：需求调研 / PRD 撰写 / 原型设计 / MVP 规划 / 跨端协作 / 版本迭代。\n" +
        "**AI**：Agent 产品设计 / RAG 知识库 / Prompt 工程 / 内容质量评测 / LLM API 应用。\n" +
        "**工具**：Figma / Excel / SQL / Python / PPT / Midjourney / Runway / 剪映 AI。",
    },
    {
      keys: ["联系", "邮箱", "电话", "手机", "怎么找", "微信", "联系方式"],
      a:
        "邮箱：2120198920@qq.com\n" +
        "电话：+86 137 9880 2151\n" +
        "坐标：深圳，可实习 6 个月。\n" +
        "页面底部也可以直接下载 PDF 简历。",
    },
    {
      keys: ["实习多久", "时长", "到岗", "求职", "意向", "招聘", "岗位", "几个月", "什么时候", "offer"],
      a:
        "方向：AI 产品实习，也接受产品经理 / 用户研究方向。\n" +
        "时长：可实习 6 个月。\n" +
        "地点：深圳。\n" +
        "到岗：随时可以聊。",
    },
    {
      keys: ["英语", "雅思", "语言", "英文"],
      a: "雅思 7.5。香港理工大学硕士是全英文授课项目，海德堡交换也是英文环境。",
    },
    {
      keys: ["荣誉", "奖", "比赛", "竞赛", "获奖"],
      a: "深圳科创学院优秀项目银奖（第 2 名）；世界机器人大赛 BCI 全国前十五。",
    },
    {
      keys: ["医疗", "健康", "临床", "医生"],
      a:
        "三段实习都在医疗健康方向：女性运动健康穿戴设备、耳石症居家康复、医疗 Agent 机构检索。\n" +
        "本科是生物医学工程，对临床场景不陌生。",
    },
    {
      keys: ["为什么", "适合", "介绍", "是谁", "背景", "自我"],
      a:
        "生物医学工程本科 + 计算机硕士，让她同时懂「人的信号」和「模型的输出」。\n" +
        "三段 0→1 实习都在医疗健康，既定义过指标，也自己用 Python 处理过 45 万条数据。",
    },
    {
      keys: ["数据", "rag", "知识库", "入库"],
      a:
        "国健智算实习：基于高德地图 API 做医疗机构 POI 采集与结构化，覆盖 34 个省级行政区、34 类医疗关键词，最终 458,684 条数据入库。",
    },
  ];

  var FALLBACK =
    "这个我还没学会。你可以换个问法，或者直接问她本人：2120198920@qq.com。\n" +
    "也可以试试：\n" +
    "「伶俐的三个关键词是什么？」\n" +
    "「总结一下伶俐的长处和能力」\n" +
    "「伶俐有什么小缺点？」";

  var SUGGESTS = [
    "伶俐的三个关键词是什么？",
    "总结一下伶俐的长处和能力",
    "伶俐有什么小缺点？",
  ];

  var aiPanel = document.getElementById("aiPanel");
  var aiBody = document.getElementById("aiBody");
  var aiForm = document.getElementById("aiForm");
  var aiInput = document.getElementById("aiInput");
  var aiClose = document.getElementById("aiClose");
  var aiOrb = document.getElementById("aiOrb");
  var aiSeeded = false;
  var aiBusy = false;

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function fmt(text) {
    return escapeHtml(text)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br>");
  }

  function scrollChat() {
    if (aiBody) aiBody.scrollTop = aiBody.scrollHeight;
  }

  function addMsg(role, text) {
    if (!aiBody) return null;
    var el = document.createElement("div");
    el.className = "msg msg--" + role;
    el.innerHTML = fmt(text);
    aiBody.appendChild(el);
    scrollChat();
    return el;
  }

  function addTyping() {
    if (!aiBody) return null;
    var el = document.createElement("div");
    el.className = "msg msg--bot";
    el.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
    aiBody.appendChild(el);
    scrollChat();
    return el;
  }

  function seedChat() {
    if (aiSeeded || !aiBody) return;
    aiSeeded = true;

    addMsg("bot", "你好，我是伶俐的数字分身。简历里的问题都可以问我——教育、实习、项目、技能、联系方式都行。");

    var wrap = document.createElement("div");
    wrap.className = "ai-suggests";
    SUGGESTS.forEach(function (q) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = q;
      b.addEventListener("click", function () { sendQuestion(q); });
      wrap.appendChild(b);
    });
    aiBody.appendChild(wrap);
  }

  function matchAnswer(q) {
    var s = q.toLowerCase().replace(/[\s，。？！,.?!、；;：:（）()「」【】]/g, "");
    var best = null;
    var bestScore = 0;

    for (var i = 0; i < KB.length; i++) {
      var item = KB[i];
      var score = 0;
      for (var j = 0; j < item.keys.length; j++) {
        var k = item.keys[j].toLowerCase();
        if (s.indexOf(k) !== -1) score += k.length * 2;
      }
      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    }

    return bestScore >= 2 ? best.a : FALLBACK;
  }

  function sendQuestion(q) {
    var text = (q || "").trim();
    if (!text || !aiBody || aiBusy) return;

    aiBusy = true;
    aiInput.value = "";
    seedChat();
    addMsg("user", text);

    var sugg = aiBody.querySelector(".ai-suggests");
    if (sugg) sugg.remove();

    var typing = addTyping();
    var answer = matchAnswer(text);

    window.setTimeout(function () {
      if (typing && typing.parentNode) typing.parentNode.removeChild(typing);
      addMsg("bot", answer);
      aiBusy = false;
      scrollChat();
    }, reduce ? 50 : 520 + Math.min(answer.length * 6, 700));
  }

  function openAI(focusInput) {
    if (!aiPanel) return;
    seedChat();
    aiPanel.classList.add("open");
    aiPanel.setAttribute("aria-hidden", "false");
    if (aiOrb) {
      aiOrb.classList.remove("show");
      aiOrb.setAttribute("aria-expanded", "true");
    }
    scrollChat();
    if (focusInput !== false) {
      window.setTimeout(function () {
        if (aiInput) aiInput.focus({ preventScroll: true });
      }, 280);
    }
  }

  function closeAI() {
    if (!aiPanel) return;
    aiPanel.classList.remove("open");
    aiPanel.setAttribute("aria-hidden", "true");
    if (aiOrb) aiOrb.setAttribute("aria-expanded", "false");
    updateOrb();
  }

  if (aiForm) {
    aiForm.addEventListener("submit", function (e) {
      e.preventDefault();
      sendQuestion(aiInput.value);
    });
  }
  if (aiClose) aiClose.addEventListener("click", closeAI);
  if (aiOrb) aiOrb.addEventListener("click", function () { openAI(true); });

  document.querySelectorAll("[data-open-ai]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      openAI(true);
    });
  });

  document.querySelectorAll("[data-ask]").forEach(function (el) {
    el.addEventListener("click", function () {
      openAI(true);
      window.setTimeout(function () { sendQuestion(el.dataset.ask); }, 100);
    });
  });

  function updateOrb() {
    if (!aiOrb) return;
    var past = window.scrollY > window.innerHeight * 0.45;
    aiOrb.classList.toggle("show", past && !(aiPanel && aiPanel.classList.contains("open")));
  }

  window.addEventListener("scroll", updateOrb, { passive: true });
  updateOrb();

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (drawer && drawer.classList.contains("open")) closeDrawer();
    else if (aiPanel && aiPanel.classList.contains("open")) closeAI();
  });

  /* ── 8. 复制邮箱 ───────────────────────────────── */
  var toast = document.getElementById("toast");
  var toastTimer = 0;

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("show");
    }, 2200);
  }

  var copyBtn = document.querySelector(".copy-btn");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var text = copyBtn.dataset.copy || "";

      function done() {
        showToast("邮箱已复制到剪贴板");
        var label = copyBtn.querySelector("span");
        if (label) {
          label.textContent = "已复制";
          window.setTimeout(function () { label.textContent = "复制"; }, 1800);
        }
      }

      function fallback() {
        try {
          var ta = document.createElement("textarea");
          ta.value = text;
          ta.setAttribute("readonly", "");
          ta.style.position = "fixed";
          ta.style.top = "-9999px";
          document.body.appendChild(ta);
          ta.select();
          var ok = document.execCommand("copy");
          document.body.removeChild(ta);
          if (ok) {
            done();
          } else {
            showToast("请手动复制邮箱");
          }
        } catch (err) {
          showToast("复制失败，请手动选择");
        }
      }

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done, fallback);
      } else {
        fallback();
      }
    });
  }
})();
