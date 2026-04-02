# useEffect工作流

在 React 中，`useEffect` 产生的副作用被称为 **Passive Effects（被动副作用）**。 `useEffect` 的设计初衷是**不阻塞浏览器绘制 DOM**，它的执行时机是在真实的 DOM 挂载和更新完毕、并且浏览器完成绘制之后，**异步**执行的。

#### 完整工作流

1. **Render 阶段打标记**： 当函数组件重新渲染，执行到内部的 `useEffect` 时，React 会将这个 Effect 挂载到组件自己（`FiberNode`）的 `updateQueue` 上，并给这个 Fiber 节点打上一个叫 `PassiveEffect` 的标签（`Flags`）。
2. **Commit 阶段收集（入站）**： 在 `src/react-reconciler/commitWork.ts` 的 `commitMutaitonEffectsOnFiber` 函数中，React 会把 DOM 操作给做了。同时，它看到了带有 `PassiveEffect` 标签的节点，就会调用 `commitPassiveEffect`：
   1.  ```typescript
       // 把组件身上的 Effect 取出来，塞进全局大老板 root 的 pendingPassiveEffects 对应队列中
       root.pendingPassiveEffects[type].push(updateQueue.lastEffect as Effect);
       ```

       **注意：** 此时只是“收集”，并没有真正执行你写的 `useEffect` 代码。接着，React 会向调度器（Scheduler）发起一个异步的宏任务申请：`scheduleCallback(NormalPriority, () => flushPassiveEffects(...))`。
3. **异步执行阶段（出站）**： 等 DOM 操作完，React 让出执行权，浏览器愉快地把新的 UI 绘制到屏幕上。 绘制完成后，浏览器空闲了，执行刚刚 React 申请的那个宏任务（也就是 `flushPassiveEffects` 函数）。在这个函数里，React 才会真正遍历 `root.pendingPassiveEffects.unmount` 和 `root.pendingPassiveEffects.update` 数组，挨个执行里面的清理函数和你的回调函数。执行完后，把这两个数组清空。

