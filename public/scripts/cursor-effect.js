// 鼠标特效脚本 - 支持 Swup 页面切换后重新初始化
// 从 MouseEffects.astro 迁移而来，封装为可复用的 initCursor 函数

let trailingCursorInstance = null;
let rippleInstance = null;
let animationFrameId = null;
let mousemoveHandler = null;

/**
 * 清理现有的鼠标特效实例
 */
function destroyCursorEffects() {
  // 停止动画循环
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  // 移除 mousemove 事件监听器
  if (mousemoveHandler) {
    document.removeEventListener("mousemove", mousemoveHandler);
    mousemoveHandler = null;
  }

  // 清理拖尾光标 DOM 元素
  if (trailingCursorInstance) {
    const { dot, rings, styleElement } = trailingCursorInstance;
    if (dot && dot.parentNode) dot.parentNode.removeChild(dot);
    rings.forEach((ring) => {
      if (ring.el && ring.el.parentNode) ring.el.parentNode.removeChild(ring.el);
    });
    if (styleElement && styleElement.parentNode) {
      styleElement.parentNode.removeChild(styleElement);
    }
    document.body.classList.remove("__trailing-cursor");
    trailingCursorInstance = null;
  }

  // 清理波纹效果实例（如果有 destroy 方法）
  if (rippleInstance && typeof rippleInstance.destroy === "function") {
    rippleInstance.destroy();
    rippleInstance = null;
  }

  // 兜底清理残留的波纹元素
  document.querySelectorAll(".__ma-ripple-el").forEach((el) => el.remove());
}

/**
 * 创建拖尾光标效果
 */
function createTrailingCursor() {
  const PURPLE_RGB = "167, 139, 250";
  const DOT_SIZE = 10; // 内圆点直径 px
  const RING_SIZE = 46; // 首个外圈直径 px
  const RING_COUNT = 7; // 拖尾圈数量
  const EASE = 0.33; // 追逐系数（越小尾巴越长越柔）

  // 隐藏系统指针
  const styleElement = document.createElement("style");
  styleElement.textContent =
    "body.__trailing-cursor, body.__trailing-cursor * { cursor: none !important; }";
  document.head.appendChild(styleElement);
  document.body.classList.add("__trailing-cursor");

  // 创建圆形元素：固定定位，初始隐藏，收到首次 mousemove 才显示
  const createElement = (size, css) => {
    const el = document.createElement("div");
    el.style.cssText = `position:fixed;top:0;left:0;width:${size}px;height:${size}px;border-radius:50%;pointer-events:none;z-index:1000000;visibility:hidden;will-change:transform;${css}`;
    document.body.appendChild(el);
    return el;
  };

  const dot = createElement(DOT_SIZE, `background:rgb(${PURPLE_RGB});`);

  // 拖尾圈：越靠后透明度越低、尺寸越小
  const rings = Array.from({ length: RING_COUNT }, (_, i) => {
    const t = (i + 1) / (RING_COUNT + 1); // 0→1 衰减进度
    const size = RING_SIZE * (1 - t * 0.25);
    const alpha = (0.55 * (1 - t) + 0.08).toFixed(2);
    return {
      el: createElement(size, `border:2px solid rgba(${PURPLE_RGB},${alpha});`),
      size,
      x: 0,
      y: 0,
    };
  });

  let targetX = 0;
  let targetY = 0;
  let firstMove = false;

  mousemoveHandler = (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
    if (!firstMove) {
      firstMove = true;
      // 首帧把所有圈放到指针处，避免从左上角"飞入"
      for (const ring of rings) {
        ring.x = targetX;
        ring.y = targetY;
      }
      dot.style.visibility = "visible";
      for (const ring of rings) ring.el.style.visibility = "visible";
    }
  };
  document.addEventListener("mousemove", mousemoveHandler);

  // 居中位移：transform 由 GPU 合成，动画流畅
  const moveTo = (el, x, y, size) => {
    el.style.transform = `translate3d(${x - size / 2}px, ${y - size / 2}px, 0)`;
  };

  const loop = () => {
    if (firstMove) {
      moveTo(dot, targetX, targetY, DOT_SIZE);
      let prevX = targetX;
      let prevY = targetY;
      // 每个圈追逐前一个圈的位置，形成链式拖尾
      for (const ring of rings) {
        ring.x += (prevX - ring.x) * EASE;
        ring.y += (prevY - ring.y) * EASE;
        moveTo(ring.el, ring.x, ring.y, ring.size);
        prevX = ring.x;
        prevY = ring.y;
      }
    }
    animationFrameId = requestAnimationFrame(loop);
  };
  animationFrameId = requestAnimationFrame(loop);

  // 保存实例引用以便后续清理
  trailingCursorInstance = { dot, rings, styleElement };
}

/**
 * 初始化鼠标特效
 * 可在页面加载时调用，也可在 Swup 页面切换后重新调用
 */
function initCursor() {
  // 先清理现有实例，防止重复创建
  destroyCursorEffects();

  // 手机端/触屏（无精确指针）或用户偏好减弱动态效果时禁用
  if (!window.matchMedia("(pointer: fine)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  try {
    // 波纹：点击位置扩散的半透明圆圈 (使用 mouse-animations 库的 Ripple)
    // 动态导入避免在不支持的环境下报错
    import("mouse-animations").then(({ Ripple }) => {
      rippleInstance = new Ripple({
        color: "rgba(167, 139, 250, 0.35)",
        duration: 600,
        maxSize: 120,
      });

      // Swup 页面切换时清理残留波纹：动画未触发时 animationend 不会执行，
      // 库不会移除元素，此处兜底清理，防止泄漏堆积
      document.addEventListener("swup:content:replace", () => {
        document.querySelectorAll(".__ma-ripple-el").forEach((el) => el.remove());
      });
    }).catch((error) => {
      console.error("[CursorEffect] Failed to load mouse-animations:", error);
    });

    // 拖尾圈光标（自定义实现，替代原 Trail + CustomCursor 组合）
    createTrailingCursor();
  } catch (error) {
    console.error("[CursorEffect] init failed:", error);
  }
}

// 暴露到全局，供 Layout.astro 中的 Swup 事件监听器调用
window.initCursor = initCursor;

// 页面首次加载时自动初始化
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCursor);
} else {
  initCursor();
}