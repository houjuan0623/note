# React的数据变化监听机制

> React的核心机制**从来没有**直接使用`Object.defineProperty`的`get`/`set`拦截器或者`Proxy`/`Reflect`来实现对数据变化的监听和响应。

## 更新的源头

在React应用中，驱动UI更新的**根本源头**通常是以下两者之一：

* **状态 (State) 的改变**: 组件内部通过调用 `setState` 或 `useState` 返回的更新函数来修改自身状态。
* **属性 (Props) 的改变**: 父组件重新渲染，并传递了新的属性（值不同或引用不同）给子组件。

## 变化的流程

1. 状态/属性的改变。
2. **触发重新渲染 (Re-render)**: 当一个组件的 **state** 或 **props** 发生变化时（或者在某些情况下，即使 props/state 没变，但父组件重新渲染了，子组件也可能默认重新渲染，除非使用了 `React.memo` 等优化手段），React 会**调度**该组件进行重新渲染。
3. **执行组件函数/render方法**: 重新渲染意味着React会**重新执行**该组件的函数体（对于函数组件）或调用其 [`render()`](shen-me-shi-react-rendercommit.md) 方法（对于类组件）。
4. **Hooks 的执行与检查**: 在组件函数重新执行的过程中，其中定义的所有 Hooks（如 `useState`, `useEffect`, `useMemo`, `useCallback`, `useContext` 等）也会**再次被调用**。
   * **`useState`**: 返回**当前渲染周期**的状态值。
   * **`useEffect`**: 在函数执行后，React 会**检查**其依赖项数组。它会将当前渲染传入的依赖项与上一次渲染存储的依赖项进行**浅比较**。
   * **`useMemo` / `useCallback`**: 同样会检查依赖项数组，如果依赖未变，则返回**缓存**的值/函数；如果依赖变了，则重新计算/创建。
   * **`useContext`**: 读取并订阅 Context 的当前值。如果 Context 的值发生变化，所有订阅该 Context 的组件都会被标记为需要重新渲染。
5. **副作用（Effects）的执行**: 如果 `useEffect` 的依赖项检查发现有变化（或者首次渲染），那么在渲染结果提交到 DOM **之后**，`useEffect` 内部定义的副作用函数就会被执行。

