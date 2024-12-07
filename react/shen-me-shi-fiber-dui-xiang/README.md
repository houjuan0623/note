# 什么是fiber对象？

## 概述

fiber是比thread更小的工作单元，进程线程的管理是操作系统提供的，fiber的管理的react提供的。

React 使用 Fiber 架构来实现更灵活和可控的渲染过程。Fiber 可以理解为一个工作单元，代表一个组件的实例或者一个渲染任务。每个 Fiber 存储了组件的相关信息，例如类型、属性、子节点等等。通过 Fiber，React 可以将渲染工作分解成小的单元，并在需要时暂停、恢复或优先处理某些任务，从而提高用户体验，避免卡顿。

## 数据结构

### 源码

[源码位置](https://github.com/facebook/react/blob/v18.3.1/packages/react-reconciler/src/ReactFiber.new.js#L118)

注意**FiberNode就是Fiber**。 每个 `FiberNode` 实例都代表一个 Fiber

```javascript
function FiberNode(
  tag: WorkTag,
  pendingProps: mixed,
  key: null | string,
  mode: TypeOfMode,
) {
  // Instance
  this.tag = tag; // Fiber 的类型，例如函数组件、类组件、原生 DOM 元素等。
  this.key = key; // 组件的 key，用于列表渲染时的优化。
  this.elementType = null;
  this.type = null; // 组件的类型，例如函数本身、类本身或字符串类型的原生 DOM 标签名。
  this.stateNode = null; // 组件对应的实例，例如类组件的实例或原生 DOM 元素。

  // Fiber
  // child, sibling, return: 指向子节点、兄弟节点和父节点的指针，形成 Fiber 树结构。
  this.return = null;
  this.child = null;
  this.sibling = null;
  this.index = 0;

  this.ref = null;
  
  // pendingProps, memoizedProps: 新的属性和已经渲染的属性。
  this.pendingProps = pendingProps;
  this.memoizedProps = null;
  this.updateQueue = null; // 更新队列，存储待处理的更新。
  this.memoizedState = null; // 已经渲染的状态。
  this.dependencies = null;

  this.mode = mode;

  // Effects
  this.flags = NoFlags;
  this.subtreeFlags = NoFlags;
  this.deletions = null;

  this.lanes = NoLanes; // 优先级信息，用于调度任务。
  this.childLanes = NoLanes;

  this.alternate = null; // 指向备用 Fiber 的指针，用于双缓冲机制。

  if (enableProfilerTimer) {
    // Note: The following is done to avoid a v8 performance cliff.
    //
    // Initializing the fields below to smis and later updating them with
    // double values will cause Fibers to end up having separate shapes.
    // This behavior/bug has something to do with Object.preventExtension().
    // Fortunately this only impacts DEV builds.
    // Unfortunately it makes React unusably slow for some applications.
    // To work around this, initialize the fields below with doubles.
    //
    // Learn more about this here:
    // https://github.com/facebook/react/issues/14365
    // https://bugs.chromium.org/p/v8/issues/detail?id=8538
    this.actualDuration = Number.NaN;
    this.actualStartTime = Number.NaN;
    this.selfBaseDuration = Number.NaN;
    this.treeBaseDuration = Number.NaN;

    // It's okay to replace the initial doubles with smis after initialization.
    // This won't trigger the performance cliff mentioned above,
    // and it simplifies other profiler code (including DevTools).
    this.actualDuration = 0;
    this.actualStartTime = -1;
    this.selfBaseDuration = 0;
    this.treeBaseDuration = 0;
  }

  if (__DEV__) {
    // This isn't directly used but is handy for debugging internals:

    this._debugSource = null;
    this._debugOwner = null;
    this._debugNeedsRemount = false;
    this._debugHookTypes = null;
    if (!hasBadMapPolyfill && typeof Object.preventExtensions === 'function') {
      Object.preventExtensions(this);
    }
  }
}
```

### Question: tag和type之间的区别是什么

在 React Fiber 中，`tag` 和 `type` 都是 `FiberNode` 的属性，但它们代表不同的信息：

* **`tag`**: 表示 Fiber 的类型，也就是它代表什么类型的渲染单元。`tag` 的值是一个数字，对应于 `ReactWorkTags` 中的各种常量，例如：`FunctionComponent`、`ClassComponent`、`HostComponent` (例如 div、span 等 HTML 元素)、`HostText` (文本节点) 等等。`tag` 决定了 React 如何处理这个 Fiber，例如如何更新它、如何渲染它等等。 它更像是 Fiber 的 **内部类型**，指导 React 的工作流程。
* **`type`**: 表示 Fiber 对应的 React 元素的类型。 对于函数组件和类组件，`type` 指向函数或类本身；对于原生 DOM 元素，`type` 是一个字符串，例如 "div"、"span" 等；对于其他类型的元素，`type` 可能是不同的值，例如 `Symbol` 或对象。 `type` 主要用于确定 Fiber 的 **公共类型**，它会影响到组件的渲染结果以及开发者如何使用它。

**举例说明:**

假设有一个函数组件 `MyComponent`：

```javascript
function MyComponent() {
  return <div>Hello</div>;
}
```

当 React 创建 `MyComponent` 对应的 Fiber 时：

* `tag` 的值会是 `FunctionComponent`，表示这是一个函数组件类型的 Fiber。
* `type` 的值会指向 `MyComponent` 函数本身。

再假设你有一个 `div` 元素：

```javascript
<div>World</div>
```

当 React 创建这个 `div` 对应的 Fiber 时：

* `tag` 的值会是 `HostComponent`，表示这是一个原生 DOM 元素类型的 Fiber。
* `type` 的值会是字符串 "div"。

### Question: type和elementType之间的区别

在 React Fiber 中，`elementType` 和 `type` 都是 `FiberNode` 的属性，它们之间有密切的关系，但又略有不同。理解它们的区别对于理解 React 的工作机制至关重要。

**`type`**:

* **更具动态性**: `type` 属性代表 Fiber 对应的组件或元素的 **实际类型**。这个类型在运行时可能会发生变化，尤其是在使用高阶组件 (HOC)、`React.memo`、`forwardRef` 等特性时。
* **直接影响渲染**: React 使用 `type` 属性来确定如何渲染 Fiber。例如，如果 `type` 是一个函数组件，React 会调用该函数进行渲染；如果 `type` 是一个类组件，React 会创建该类的实例并调用其渲染方法；如果 `type` 是一个字符串 (例如 "div")，React 会渲染一个对应的 DOM 元素。
* **受 Hot Reloading 影响**: 在开发环境下，`type` 属性的值可能会受到 Hot Reloading 的影响而发生改变，以便 React 能够使用最新的代码进行渲染。

**`elementType`**:

* **更具静态性**: `elementType` 属性记录了 Fiber **最初被创建时**的元素类型。它更像是一个“快照”，记录了 Fiber 的来源。
* **主要用于调试和错误处理**: React 主要使用 `elementType` 属性来提供更准确的调试信息和错误提示。例如，在打印错误信息时，React 会使用 `elementType` 来显示是哪个组件或元素出现了问题。
* **通常与 `type` 相同**: 在大多数情况下，`elementType` 和 `type` 的值是相同的。只有在使用 HOC、`React.memo`、`forwardRef` 等特性时，它们的值才可能不同。

**举例说明**:

假设你有一个函数组件 `MyComponent`：

```javascript
function MyComponent() {
  return <div>Hello</div>;
}

const WrappedComponent = React.memo(MyComponent);
```

当你渲染 `WrappedComponent` 时，React 会创建两个 Fiber：

1. 对应于 `WrappedComponent` 的 Fiber：
   * `elementType` 为 `WrappedComponent` （也就是`React.memo`返回的组件）。
   * `type` 为 `MyComponent` （实际渲染的组件）。
2. 对应于 `div` 的 Fiber:
   * `elementType` 为 "div"。
   * `type` 为 "div"。

### Question: key 怎样用于渲染优化？

Fiber 节点的 `key` 属性主要用于列表渲染的优化，它帮助 React 识别哪些节点发生了变化（添加、删除、移动），从而尽可能复用已有的 DOM 节点，提高渲染性能。

**举例说明：**

假设你有一个列表需要渲染：

```javascript
const items = ['A', 'B', 'C'];
const list = items.map(item => <li key={item}>{item}</li>);
```

这里，我们为每个 `li` 元素都设置了一个唯一的 `key` 值，对应于列表项的内容。

现在，如果我们修改列表项：

```javascript
const items = ['B', 'A', 'D'];
const list = items.map(item => <li key={item}>{item}</li>);
```

React 会比较新旧两个列表的 `key` 值。它会发现：

1. `B` 对应的 `li` 元素从索引 1 移动到了索引 0。
2. `A` 对应的 `li` 元素从索引 0 移动到了索引 1。
3. `C` 对应的 `li` 元素被删除了。
4. `D` 对应的 `li` 元素是新增的。

基于 `key` 的比较结果，React 会执行以下操作：

1. 将 `B` 对应的 DOM 节点移动到新的位置。
2. 将 `A` 对应的 DOM 节点移动到新的位置。
3. 删除 `C` 对应的 DOM 节点。
4. 创建 `D` 对应的 DOM 节点并插入到正确的位置。

**如果没有 `key` 会怎么样？**

如果没有 `key`，React 会根据元素在数组中的索引进行比较。在上面的例子中，React 会认为：

1. 索引 0 的元素从 `A` 变成了 `B`，需要更新 DOM 节点的内容。
2. 索引 1 的元素从 `B` 变成了 `A`，需要更新 DOM 节点的内容。
3. 索引 2 的元素从 `C` 变成了 `D`，需要更新 DOM 节点的内容。

这样会导致不必要的 DOM 更新，降低渲染性能。

请注&#x610F;**`key` 帮助 React 识别哪些节点需要更新，从而最大程度地复用 DOM 节点。** 这带来的优化主要体现在减少不必要的 DOM 更新，而不是减少操作步骤的数量。（[原因参考此文](lie-ju-yi-xie-dom-ang-gui-de-cao-zuo.md)）

### Question: flags作用是什么？

`FiberNode` 中的 `flags` 属性用于存储与该 Fiber 节点相关的标志位，这些标志位控制着 React 的协调（Reconciliation）和渲染过程。不同的标志位代表不同的含义，它们共同决定了 Fiber 节点该如何处理以及如何更新对应的组件或 DOM 元素。

`flags` 使用二进制位运算来存储多个标志，每个标志位代表一种特定的状态或行为。这样可以高效地存储和检查多个标志，而无需使用多个属性。

以下是 `flags` 属性中一些重要的标志位及其作用：

* **Placement:** 表示该 Fiber 节点需要被插入到 DOM 树中。这通常发生在组件首次挂载或在列表中重新排序时。 `Placement` 标志会在 commit 阶段被处理，React 会将对应的 DOM 元素插入到正确的位置。
* **Update:** 表示该 Fiber 节点的 props 或 state 发生了变化，需要更新对应的组件或 DOM 元素。 `Update` 标志会在 `beginWork` 阶段被设置，并在 `completeWork` 阶段生成相应的 effect，最终在 commit 阶段执行更新操作。
* **Deletion:** 表示该 Fiber 节点需要从 DOM 树中移除。这通常发生在组件卸载时。`Deletion` 标志会在 commit 阶段被处理，React 会将对应的 DOM 元素从 DOM 树中移除。
* **Passive:** 表示该 Fiber 节点包含 passive effect。Passive effect 是指不会导致 DOM 更新的副作用，例如 `useEffect` 的一些用法。 `Passive` effect 会在 commit 阶段的 passive effect 阶段执行。
* **PlacementDEV:** 这是一个开发模式下使用的标志，用于调试。
* **Snapshot:** 表示需要为此 Fiber 节点创建一个快照。在某些情况下，例如 Suspense 组件的回退渲染，React 需要保存 Fiber 树的快照以便稍后恢复。
* **Hydrating:** 表示当前正在进行 hydration 操作。Hydration 是指将服务端渲染的 HTML 与客户端的 React 组件进行匹配的过程。
* **HydratingSuspense:** 表示当前正在进行 hydration 操作，并且遇到了 Suspense 组件。
* **Callback:** 表示该 Fiber 节点包含回调函数，需要在 commit 阶段执行。
* **DidCapture:** 表示该 Fiber 节点的子树中发生了错误，需要进行错误边界处理。
* **Ref:** 表示该 Fiber 节点包含 ref，需要在 commit 阶段处理。
* **ContentReset:** 表示该 Fiber 节点的子节点需要重置内容。这通常发生在 Suspense 组件的内容发生变化时。
* **Incomplete:** 表示该 Fiber 节点的渲染工作尚未完成。
* **ForceUpdateForLegacySuspense:** 用于支持旧版 Suspense 组件的强制更新。
* **StaticMask:** 静态标志掩码，用于标记不会随渲染改变的标志。

**`flags` 的使用:**

在 React 的协调过程中，`flags` 属性的值会被不断更新，以反映 Fiber 节点的状态变化。例如，当组件的 props 发生变化时，React 会将 `Update` 标志添加到 Fiber 节点的 `flags` 属性中。在 commit 阶段，React 会根据 `flags` 属性的值来执行相应的 DOM 操作或副作用。

`flags` 属性的巧妙使用使得 React 能够高效地跟踪 Fiber 树的状态变化，并在适当的时机执行更新操作，从而实现高性能的渲染。













