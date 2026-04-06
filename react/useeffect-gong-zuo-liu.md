# useEffect工作流

在 React 中，`useEffect` 产生的副作用被称为 **Passive Effects（被动副作用）**。 `useEffect` 的设计初衷是**不阻塞浏览器绘制 DOM**，它的执行时机是在真实的 DOM 挂载和更新完毕、并且浏览器完成绘制之后，**异步**执行的。

### 完整工作流

1. **Render 阶段打标记**： 当函数组件重新渲染，执行到内部的 `useEffect` 时，React 会将这个 Effect 挂载到组件自己（`FiberNode`）的 `updateQueue` 上，并给这个 Fiber 节点打上一个叫 `PassiveEffect` 的标签（`Flags`）。
2. **Commit 阶段收集（入站）**： 在 `src/react-reconciler/commitWork.ts` 的 `commitMutaitonEffectsOnFiber` 函数中，React 会把 DOM 操作给做了。同时，它看到了带有 `PassiveEffect` 标签的节点，就会调用 `commitPassiveEffect`：
   1.  ```typescript
       // 把组件身上的 Effect 取出来，塞进全局大老板 root 的 pendingPassiveEffects 对应队列中
       root.pendingPassiveEffects[type].push(updateQueue.lastEffect as Effect);
       ```

       **注意：** 此时只是“收集”，并没有真正执行写的 `useEffect` 代码。接着，React 会向调度器（Scheduler）发起一个异步的宏任务申请：`scheduleCallback(NormalPriority, () => flushPassiveEffects(...))`。
3. **异步执行阶段（出站）**： 等 DOM 操作完，React 让出执行权，浏览器愉快地把新的 UI 绘制到屏幕上。 绘制完成后，浏览器空闲了，执行刚刚 React 申请的那个宏任务（也就是 `flushPassiveEffects` 函数）。在这个函数里，React 才会真正遍历 `root.pendingPassiveEffects.unmount` 和 `root.pendingPassiveEffects.update` 数组，挨个执行里面的清理函数和你的回调函数。执行完后，把这两个数组清空。

#### 所有的 effects 都挂载到 root 上吗？

**Effects 是“出生并存储在具体组件”上，最后被“集中收集”到 root 上的。**

* **出生地（组件自身）**：当在函数组件里调用 `useEffect` 时，产生的 effect 会通过 `pushEffect` 函数，作为链表挂载到当前这个具体的函数组件的 **`FiberNode.updateQueue`** 上。每个组件自己兜里装着自己的 effect。
* **集中处理地（FiberRootNode）**：`root.pendingPassiveEffects` 就像是一辆“全局副作用收集车”。React 在 Render 阶段不去管它们，只有当进入 Commit 阶段（即准备把计算好的真实 DOM 更新到屏幕上时），这辆收集车才会开动。

#### 什么情况下会导致 root 更新（收集）effects？

**当且仅当组件在 Render 阶段被打上了 `PassiveEffect` 标签（Flag）时，root 才会在 Commit 阶段去收集并更新这些 effects。**

这个过程分为两步：

1.  **打标签（Render 阶段）**：当组件挂载（`mountEffect`）或者组件更新且依赖项发生了改变时（`updateEffect` 中 `areHookInputsEqual` 返回 false），React 会执行：

    ```typescript
    (currentlyRenderingFiber as FiberNode).flags |= PassiveEffect;
    ```
2. **收集（Commit 阶段）**：在 `commitWork.ts` 的 `commitMutaitonEffectsOnFiber` 函数中，React 会巡视所有的 Fiber 节点。看到门上贴了 `PassiveEffect` 标签的节点，就会调用 `commitPassiveEffect(finishedWork, root, 'update')`，把它的 effect 抽出来塞进 `root.pendingPassiveEffects`，等待随后被 `flushPassiveEffects` 统一异步执行。

#### 每次调用 setState 都会导致 root 更新 effects 嘛？

**绝对不会！这正是 React `useEffect` 依赖项数组（`deps`）发挥作用的地方。**

当调用 `setState` 触发更新时，确实会走一遍完整的渲染流程（Render -> Commit）。但是，即使这个组件重新执行了，它里面的 `useEffect` 也**不一定**会被收集和执行。

让我们看看 `fiberHooks.ts` 中的 `updateEffect` 逻辑：

```typescript
function updateEffect(create: EffectCallback | void, deps: EffectDeps | void) {
  // ...省略获取前一次 effect 的代码...
  
  if (nextDeps) {
    const prevDeps = prevEffect.deps;
    // 【关键点】浅比较前后两次的依赖项！
    if (areHookInputsEqual(nextDeps, prevDeps)) {
      // 依赖没变：创建一个新的 effect 节点替换旧的，但【不打 PassiveEffect 标签】！
      hook.memoizedState = pushEffect(Passive, create, destroy, nextDeps);
      return; 
    }
  }
  
  // 依赖变了（或者没传依赖）：打上 Passive | HookHasEffect 标签
  (currentlyRenderingFiber as FiberNode).flags |= PassiveEffect;
  hook.memoizedState = pushEffect(Passive | HookHasEffect, create, destroy, nextDeps);
}
```

**举个实际的例子：** 假设有一个组件：

```js
const [count, setCount] = useState(0);
const [text, setText] = useState('hello');

useEffect(() => {
    console.log('text 变了！');
}, [text]); // 依赖项只有 text
```

1. 当调用 `setCount(count + 1)` 时，引发了组件重新渲染。
2. React 执行到 `useEffect` 时，对比新旧依赖项：旧的 `text` 是 `'hello'`，新的 `text` 还是 `'hello'`。
3. `areHookInputsEqual` 返回 `true`。
4. React **不会**给这个组件的 Fiber 打上 `PassiveEffect` 标签（注意源码中只传了 `Passive` 常量，没有传 `HookHasEffect`）。
5. 到了 Commit 阶段，因为没有 `PassiveEffect` 标签，React 会直接无视它，根本不会把它的 effect 放进 `root.pendingPassiveEffects` 中。
