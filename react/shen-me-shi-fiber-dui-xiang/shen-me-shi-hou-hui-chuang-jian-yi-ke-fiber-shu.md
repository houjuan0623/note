# 什么时候会创建一颗Fiber树？

**有很多情况会创建一颗新的Fiber树。**

“创建一棵新的 Fiber 树”通常指的是在内存中初始化并构建一棵全新的 workInProgress (WIP) 树。

## 创建新树的三个场景

首先来看创建新树的核心代码：

```typescript
if (wipRootRenderLane !== lane) {
  // 初始化一棵全新的 workInProgress 树
  prepareFreshStack(root, lane);
}
```

只要当前正在渲染的优先级 (wipRootRenderLane) 和本次需要处理的任务优先级 (lane) 不一致，React 就会调用 prepareFreshStack 推倒重来，创建一棵新树。基于这个原则，衍生出了以下三种情况：

1. 首次渲染：这是应用生命周期中的第一次树创建。
   1.  当第一次调用 `root.render()` 或者底层第一次调用 `updateContainer` 时。

       在应用刚启动时，全局变量 wipRootRenderLane 的初始值是 NoLane（代表当前没有任何渲染工作）。 当第一个任务（比如同步优先级 SyncLane）进入 renderRoot 调度时，React 进行比对：NoLane !== SyncLane。条件成立！于是 React 会调用 prepareFreshStack，以屏幕上的空节点（root.current）为基础，克隆出整棵应用的第一棵 workInProgress 树的根节点。
2. 一次完整渲染结束后的常规更新：这是日常开发中最常遇到的场景。
   1.  用户点击按钮触发了 setState，或者接口请求成功后调用了 setState 更新数据。

       当 React 成功把一棵树渲染并挂载到屏幕上（进入 Commit 阶段）后，在代码 performConcurrentWorkOnRoot 或 performSyncWorkOnRoot 中，有这样一步非常关键的重置操作：

       ```typescript
       if (existStatus === RootCompleted) {
         // ...
         wipRootRenderLane = NoLane; // 渲染完成，重置状态
         commitRoot(root);
       }
       ```

       因为上一次渲染结束时把状态清空成了 NoLane，所以当用户再次触发更新时，新任务带着它的优先级（比如 DefaultLane）进入 renderRoot。 React 再次比对：NoLane !== DefaultLane。条件成立！React 知道这是一次全新的更新周期，于是基于当前屏幕上正在显示的树（current 树），创建一棵全新的 WIP 树来计算最新的差异。
3. 高优先级任务插队打断：这是 React 并发模式最精华的场景。
   1.  React 正在后台默默地、分片地（Time Slicing）渲染一个非常耗时的长列表（低优先级任务）。突然，用户在输入框里敲击了键盘（高优先级任务）。

       此时，React 内存中正有一棵建了一半的半成品 WIP 树，且当前的 wipRootRenderLane 记录着低优先级（例如 DefaultLane）。 由于用户的输入触发了更高优先级的 SyncLane，调度器立刻打断了低优先级的工作，并带着 SyncLane 重新进入 renderRoot。 React 进行比对：DefaultLane !== SyncLane。条件成立！React 发现来了一个更紧急的 VIP 任务，于是它会毫不留情地抛弃那棵建了一半的低优先级 WIP 树，再次调用 prepareFreshStack，为这个高优先级的用户输入立刻创建一棵全新的 WIP 树。
