# 什么是FiberRootNode？

代表整个 fiber 结构的根节点。它持有对当前 Fiber 树 (`current`) 的引用，以及渲染的目标容器 (`container`)。它还管理着更新的优先级 (`pendingLanes`, `finishedLane`) 和待处理的副作用 (`pendingPassiveEffects`)，这与 React 的并发特性和调度有关。

可以将FiberRootNode理解为特殊的FiberNode(fiber)，FiberRootNode通过cuurrent属性引用自己的FiberNode。
