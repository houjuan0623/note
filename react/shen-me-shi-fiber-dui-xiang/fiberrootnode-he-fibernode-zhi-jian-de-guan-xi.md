# FiberRootNode和FiberNode之间的关系

`FiberRootNode` 和 `FiberNode` 是 React Fiber 架构中两个重要的数据结构，它们之间类似于树根和树枝/树叶的关系。`FiberRootNode` 代表整个 Fiber 树的根节点，而 `FiberNode` 代表 Fiber 树中的一个节点。

## 为什么需要FiberRootNode这个数据结构？

1.  **它是双缓存机制（Double Buffering）的“锚点”。**&#x52;eact 在渲染时会同时维护两棵 Fiber 树：一个是当前屏幕上正在显示的 current 树，另一个是正在内存中构建的 workInProgress (WIP) 树。 FiberRootNode 中有一个非常核心的属性 current：&#x20;

    ```typescript
    this.current = hostRootFiber;
    ```

    在一次完整的更新流程（Render 阶段和 Commit 阶段）结束后，React 只需要执行 `root.current = finishedWork`，就能瞬间把正在构建的树切换成当前显示的树。FiberRootNode 作为一个永远不会被替换的顶级对象，为这两棵树的互相替换提供了一个稳定的外部引用（锚点）。
2.  **管理全局的调度（Scheduling）与优先级（Lanes）状态。**

    React 的更新是可以被打断、有不同优先级的（并发模式）。这些优先级状态是属于“整个应用”的，而不是属于某个具体组件的。 在 FiberRootNode 中维护了这些全局调度信息：

    1. pendingLanes: 记录整个应用中当前所有待处理更新的优先级集合。有了它，React 才知道接下来还需要去处理哪些优先级的任务。
    2. finishedLane: 记录最近一次成功完成构建的这棵树所代表的优先级。
    3. callbackNode / callbackPriority: 记录当前正在 Scheduler（调度器）中被调度的任务信息，用来判断是否需要中断或复用当前任务。
3.  连接宿主环境（Host Environment）与 React 内部的桥梁。

    React 可以运行在不同的环境（浏览器、React Native 等）。FiberRootNode 负责保存宿主环境提供的顶级“容器”。 例如，在代码中：

    ```javascript
    this.container = container;
    ```

    在浏览器 DOM 环境下，这个 container 就是我们在 index.html 里写的`<div id="root"></div>`对应的真实 DOM 节点。通过 FiberRootNode，React 知道最终要把生成的真实 DOM 挂载到哪里。
4.  保存 Render 阶段和 Commit 阶段之间的“中间产物”。

    React 的工作流程分为可以被打断的 Render 阶段（计算差异），和不可被打断的 Commit 阶段（把差异应用到真实 DOM）。

    1. finishedWork: 当 Render 阶段完成，构建出完整的 WIP 树后，会把这棵树的根节点挂载到 FiberRootNode.finishedWork 上。随后的 Commit 阶段就会直接从这里获取构建好的树来进行副作用处理和 DOM 更新。
    2. pendingPassiveEffects: 收集整个应用中所有待执行的 useEffect 的回调（包含挂载、卸载）。因为 useEffect 是在 DOM 渲染完成后异步执行的，所以需要一个全局的地方把它们暂存起来。

## FiberNode

**`FiberNode` 作为构建块：** `FiberNode` 实例是构成 Fiber 树的基本单元。每个 `FiberNode` 对应一个 React 元素（例如一个组件、一个 DOM 元素、一个文本节点等等），它们通过指针连接在一起，形成一个树形结构，表示整个 UI 的层级关系。

