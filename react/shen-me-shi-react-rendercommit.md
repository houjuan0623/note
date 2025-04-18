# 什么是react render，commit？

render可以被翻译为渲染，这个属于在react中是什么含义呢？commit又到底做了什么？

**React 更新流程（Render + Commit 阶段）:**

1. **触发更新**: 由 `setState`, `useState` 更新函数调用、props 变化、根节点的 `render` 调用等触发。
2. **Render 阶段 (可中断):**
   * React 从触发更新的 Fiber Node 开始，遍历 Fiber 树。
   * 对于遍历到的每个 Fiber Node，如果它是组件节点，React 会调用其函数或 `render` 方法，**获取新的 React Elements**。
   * **Diffing**: React 将新生成的 Elements 与该 Fiber Node 在**上一次渲染时对应的旧 Fiber Node**（或者说“当前” Fiber 树中的节点）进行比较。
   * **构建 Work-in-Progress Fiber 树**: 根据比较结果，React 会创建或更新一个“工作进行中”的 Fiber 树。这个新树反映了更新后的状态。
     * 如果 Element 类型和 key 匹配，则复用并更新 Fiber Node 的 props。
     * 如果不匹配，则标记旧 Fiber Node 为删除，并创建新的 Fiber Node。
     * **标记副作用 (Side Effects)**: 在这个过程中，React 会在需要进行 DOM 操作（增、删、改）或调用生命周期/Effect 的 Fiber Node 上**打上标记 (flags)**。
   * **这个阶段是异步且可中断的**，React 可以根据优先级暂停、恢复或放弃这个阶段的工作。它**不会（因为至此所有的操作都是react内部数据结构的变化，并没有操作任何DOM对象）**&#x4EA7;生任何用户可见的变化（比如修改 DOM）。
   * **用户提到的“比较render前后fiber数据结构的变化”**: 更准确地说，是比较新生成的 **Elements** 和**旧的 Fiber 节点**，这个比较的结果被用来**构建新的 Fiber 树**并标记变化（副作用）。
3. **Commit 阶段 (同步，不可中断):**
   * 一旦 Render 阶段完成并且生成了完整的“工作进行中” Fiber 树，React 就进入 Commit 阶段。
   * React 将“工作进行中”的 Fiber 树**切换**为“当前” Fiber 树。
   * React **遍历**这个新的 Fiber 树中所有**被标记了副作用**的节点。
   * **执行 DOM 更新**: 根据标记执行实际的 DOM 操作（`appendChild`, `removeChild`, `setAttribute` 等）。**这是用户提到的“将变化更新在HTML界面中”**。
   * **调用生命周期方法 / Hooks**: 调用 `componentDidMount`, `componentDidUpdate` 等生命周期方法，以及 `useEffect` 的 effect 函数（和之前的 cleanup 函数）。
