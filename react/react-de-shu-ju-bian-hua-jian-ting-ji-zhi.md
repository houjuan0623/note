# React的数据变化监听机制

> React的核心机制**从来没有**直接使用`Object.defineProperty`的`get`/`set`拦截器或者`Proxy`/`Reflect`来实现对数据变化的监听和响应。

## 数据变化监听源

setState和useContext

## setState变化的流程

在函数组件中，`useState` 的返回函数实际上是 `dispatchSetState`。

当开发者调用 `setCount(c => c + 1)` 时，内部逻辑首先定位到该 Hook 对应的 Fiber 节点。React 会创建一个 `Update` 对象，其结构包含了本次更新的动作（Action）以及对应的优先级（Lane） 。

$$Update = \{ lane: Lane, action: any, hasEagerState: boolean, eagerState: any, next: Update \}$$

这个 `Update` 对象会被推入 Hook 的 `pending` 队列中。值得注意的是，React 使用了环形链表来存储更新，这使得 React 可以高效地获取队列中的最后一个元素，并能以常数时间复杂度完成新更新的追加 。

在将更新任务提交给调度器之前，React 尝试进行一次性能优化：`eagerState` 计算。如果当前更新队列为空，且不处于渲染阶段，React 会尝试使用当前的 Reducer 预先计算出新状态 。

通过 `Object.is` 算法，React 将计算出的 `eagerState` 与 Fiber 节点上的 `memoizedState` 进行对比。如果两者完全相同，React 将认为这次状态更新不会对 UI 产生任何改变，从而直接跳过后续的调度流程。这种机制能有效减少不必要的性能损耗，但也意味着对于引用类型的数据，如果未能保持不可变性（Immutability），这种避让机制将失效 。

一旦确定需要执行更新，React 会调用 `scheduleUpdateOnFiber`。该函数承载了两个核心使命：

* 向上冒泡（Bubble up）：通过 `markUpdateLaneFromFiberToRoot` 逻辑，从当前 Fiber 节点向上遍历至 `FiberRoot`。在遍历过程中，React 会将当前更新的 Lane 合并到沿途所有祖先节点的 `childLanes` 属性中 。这种标记行为如同信号灯，告知根节点在哪一条分支上存在待处理的逻辑。
* 调度请求：通知调度器（Scheduler），有一个新的任务需要被执行。调度器会根据 Lane 的紧急程度，通过 `requestIdleCallback` 或 `MessageChannel` 在合适的时机触发 `workLoop` （递，归，commit）。

## useContext变化的流程

暂时没有阅读过这部分源码。这里先不进行笔记。

## Question

### 父组件渲染，子组件也会重新渲染，但是有时候，即使父组件渲染了，子组件是不需要重新渲染的，怎么办？

可以使用优化手段来避免这种不必要的子组件重新渲染。

1. `React.memo` (用于函数组件):

`React.memo` 是一个高阶组件 (Higher-Order Component, HOC)。

它会对传递给组件的 `props` 进行浅比较 (shallow comparison)。只有当 `props` 发生变化时，被 `React.memo` 包裹的函数组件才会重新渲染。

