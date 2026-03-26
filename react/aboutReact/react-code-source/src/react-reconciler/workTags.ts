/**
 * 定义了 React Fiber 节点的类型（WorkTag）。
 * 不同的组件类型（如函数组件、原生 DOM 节点、文本节点等）在 Fiber 架构中对应不同的 WorkTag，
 * 以便在 Reconciler（协调器）阶段（如 beginWork 和 completeWork）执行不同的处理逻辑。
 */
export type WorkTag =
  | typeof FunctionComponent
  | typeof HostRoot
  | typeof HostComponent
  | typeof HostText
  | typeof Fragment;

/**
 * 函数组件 (Function Component)
 *
 * 例如: `function App() { return <div>App</div> }` 或 `<App />`
 */
export const FunctionComponent = 0;

/**
 * 宿主环境的根节点 (Host Root)
 *
 * 即应用挂载的根节点，例如 `ReactDOM.createRoot(container)` 中的 `container` 所关联的内部 Fiber 节点。
 */
export const HostRoot = 3;

/**
 * 宿主环境的普通元素节点 (Host Component)
 *
 * 在浏览器环境（DOM）中，指的是原生的 HTML 元素，例如 `<div>`, `<span>` 等。
 */
export const HostComponent = 5;

/**
 * 宿主环境的文本节点 (Host Text)
 *
 * 在浏览器环境（DOM）中，指的是纯文本节点，例如 `<div>123</div>` 中的 `123`。
 */
export const HostText = 6;

/**
 * Fragment 节点 (React.Fragment)
 *
 * 用于包裹多个子节点而不会在 DOM 树中产生额外的真实父节点元素。例如 `<>...</>` 或 `<React.Fragment>...</React.Fragment>`。
 */
export const Fragment = 7;
