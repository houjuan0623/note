# FiberRootNode和FiberNode之间的关系

`FiberRootNode` 和 `FiberNode` 是 React Fiber 架构中两个重要的数据结构，它们之间类似于树根和树枝/树叶的关系。`FiberRootNode` 代表整个 Fiber 树的根节点，而 `FiberNode` 代表 Fiber 树中的一个节点。

## FiberRootNode

**`FiberRootNode` 作为顶层容器：** `FiberRootNode` 是 React 渲染树的顶层容器，它包含了渲染树的全局信息，例如应用渲染的容器（通常是一个 DOM 元素，比如一个 `div`），以及一些全局状态。每个 React 应用都会有一个 `FiberRootNode`。

`FiberRootNode` 拥有整个 Fiber 树，它负责管理 Fiber 树的生命周期，包括调度更新、处理副作用等等。

一个**渲染根（Root）**&#x5BF9;应一个 `FiberRootNode`。 在大多数情况下，一个应用只有一个渲染根，所以也就只有一个 `FiberRootNode`。 但是，如果使用了多个渲染根（例如，在同一个页面中渲染多个独立的 React 应用），那么就会有多个 `FiberRootNode`。

## FiberNode

**`FiberNode` 作为构建块：** `FiberNode` 实例是构成 Fiber 树的基本单元。每个 `FiberNode` 对应一个 React 元素（例如一个组件、一个 DOM 元素、一个文本节点等等），它们通过指针连接在一起，形成一个树形结构，表示整个 UI 的层级关系。
