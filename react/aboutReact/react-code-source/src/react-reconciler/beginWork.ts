import { ReactElementType } from "@/shared/ReactTypes";
import { mountChildFibers, reconcileChildFibers } from "./childFibers";
import { FiberNode } from "./fiber";
import { renderWithHooks } from "./fiberHooks";
import { Lane } from "./fiberLanes";
import { processUpdateQueue, UpdateQueue } from "./updateQueue";
import {
  Fragment,
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
} from "./workTags";

// 递归中的递阶段
export const beginWork = (wip: FiberNode, renderLane: Lane) => {
  // debugger
  // 比较，返回子fiberNode
  switch (wip.tag) {
    case HostRoot:
      return updateHostRoot(wip, renderLane);
    case HostComponent:
      return updateHostComponent(wip);
    case HostText:
      return null;
    case FunctionComponent:
      return updateFunctionComponent(wip, renderLane);
    case Fragment:
      return updateFragment(wip);
    default:
      console.warn("beginWork未实现的类型");
      break;
  }
  return null;
};

function updateFragment(wip: FiberNode) {
  const nextChildren = wip.pendingProps;
  reconcileChildren(wip, nextChildren);
  return wip.child;
}

function updateFunctionComponent(wip: FiberNode, renderLane: Lane) {
  const nextChildren = renderWithHooks(wip, renderLane);
  reconcileChildren(wip, nextChildren);
  return wip.child;
}
/**
 *
 * @param wip
 * @param renderLane
 * @returns
 *
 * 对于本函数中出现的state的解释：<br />
 *
 * - 对于一个普通的组件（比如类组件或函数组件），它的 state 通常是用 this.state 或 useState 管理的数据对象（例如 { count: 0 }）。当调用 setState 时，action (payload) 通常是一个新的状态对象或一个更新函数 prevState => newState。
 * - 但对于 hostRootFiber（整个应用的根），它的主要职责是渲染程序员传递给 root.render() 的那个顶层组件。因此，可以认为 HostRoot 的 "状态" 就是它应该渲染的那个 React 元素（Element）。
 */
export function updateHostRoot(wip: FiberNode, renderLane: Lane) {
  // memoizedState 指的是这个 Fiber 节点上一次成功渲染并提交（Commit）后“记住”的状态。
  // 对于 HostRoot 来说，它的 memoizedState 通常存储的是上一次渲染的根 React 元素（比如传给 root.render() 的 <App />）。如果这是首次渲染，baseState 可能为 null。
  const baseState = wip.memoizedState;
  // 每个 Fiber 节点都可以有一个与之关联的更新队列，用于存放待处理的更新（如状态变更、root.render 调用等）。
  const updateQueue = wip.updateQueue as UpdateQueue<Element>;
  const pending = updateQueue.shared.pending;
  updateQueue.shared.pending = null;
  const { memoizedState } = processUpdateQueue(baseState, pending, renderLane);
  wip.memoizedState = memoizedState;

  const nextChildren = wip.memoizedState;
  reconcileChildren(wip, nextChildren);
  return wip.child;
}

function updateHostComponent(wip: FiberNode) {
  const nextProps = wip.pendingProps;
  const nextChildren = nextProps.children;
  reconcileChildren(wip, nextChildren);
  return wip.child;
}
/**
 * ```
 * // 获取当前正在处理的这个 wip 父节点在上一次渲染完成（即 current 树） 中对应的那个节点。
 * const current = wip.alternate
 * ```
 * 每个 wip 树中的 Fiber 节点（如果它不是首次创建的话）会通过 alternate 属性指向 current 树中对应的那个旧节点。<br />
 * 在代码逻辑中走的是更新还是挂载取决于当前正在处理的wip节点在current树中是否有对应的节点。<br />
 * @param wip 正在处理的wip（fiber）节点
 * @param children 正在处理的wip（fiber）节点的子节点，此时子节点类型不是fiber，是Symbol(react.element)
 */
export function reconcileChildren(wip: FiberNode, children?: ReactElementType) {
  const current = wip.alternate;

  if (current !== null) {
    // update
    wip.child = reconcileChildFibers(wip, current?.child, children);
  } else {
    // mount
    wip.child = mountChildFibers(wip, null, children);
  }
}
