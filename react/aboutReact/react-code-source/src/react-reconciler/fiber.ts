import { Props, Key, Ref, ReactElementType } from "@/shared/ReactTypes";
import {
  Fragment,
  FunctionComponent,
  HostComponent,
  WorkTag,
} from "./workTags";
import { Flags, NoFlags } from "./fiberFlags";
import { Container } from "@/react-dom/hostConfig";
import { Lane, Lanes, NoLane, NoLanes } from "./fiberLanes";
import { Effect } from "./fiberHooks";
import { CallbackNode } from "scheduler";
/**
 * fiber对应的数据结构。
 * 
 * React 使用 Fiber 架构来实现更灵活和可控的渲染过程。Fiber 可以理解为一个工作单元，代表一个组件的实例或者一个渲染任务。每个 Fiber 存储了组件的相关信息，例如类型、属性、子节点等等。通过 Fiber，React 可以将渲染工作分解成小的单元，并在需要时暂停、恢复或优先处理某些任务，从而提高用户体验，避免卡顿。
 */
export class FiberNode {
  type: any;
  tag: WorkTag;
  pendingProps: Props;
  key: Key;
  stateNode: any;
  ref: Ref;

  return: FiberNode | null;
  sibling: FiberNode | null;
  child: FiberNode | null;
  index: number;

  memoizedProps: Props | null;
  /** memoizedState 记录当前fiber对应的hook链表。`currentlyRenderingFiber.memoizedState = workInProgressHook;` */
  memoizedState: any;
  /**
   * 在渲染过程中，React 同时维护两棵 Fiber 树：<br />
   * - current 树: 代表当前屏幕上已经渲染完成的 UI 对应的 Fiber 树。它是“旧树”。为什么说 current 树是已经渲染完成的树？
   *     - 我一直好奇，当current树中仅仅存在hostRootFiber时，界面并没有被渲染啊，然后一直遇到这种说辞“current 树是已经渲染完成的树”，现在理解了，因为current树中仅仅存在hostRootFiber时current树中并没有可渲染的元素。
   *     - 当节点为其他节点的时候，应该可以在current树中看到被渲染的树节点了（待验证）
   * - workInProgress (wip) 树: React 正在这棵树上进行计算和更新，它代表了即将要渲染到屏幕上的新 UI。它是“新树”或“工作副本”。为什么说 wip 树是正在渲染的树？因为和 wip 被构建完成后一次性提交，只要是在wip树构建过程中，就说明这个节点尚未被浏览器渲染，因为这里的构建是react代码实现的，并未交给浏览器去渲染。
   * 
   * 每个 wip 树中的 Fiber 节点（如果它不是首次创建的话）会通过 alternate 属性指向 current 树中对应的那个旧节点。反之，current 树中的节点也通过 alternate 指向 wip 树中的对应节点。它们互为 alternate。
   */
  alternate: FiberNode | null;
  flags: Flags;
  subtreeFlags: Flags;
  /**
   * 可以把 updateQueue 想象成一个附加在特定类型 Fiber 节点（主要是 HostRoot、类组件，以及使用 Hooks 的函数组件隐式关联的队列）上的**“收件箱”或“邮箱”。它的主要工作是存放那些已经被请求、但尚未被处理的针对该组件的更改（更新）列表。 <br />
   * 这些“更新”可以是：
   * - 状态变更，调用 useState(...) 返回的 setter 函数时；
   * - 根元素变更，调用 root.render(<NewElement />) 
   * - 强制更新，在类组件上调用 this.forceUpdate() 。
   * - 回调函数，更新也可以包含回调函数（比如 this.setState(newState, callback) 中的可选第二个参数）
   * 
   * 为什么需要 updateQueue？目的何在？<br />
   * 
   * React 并不会在调用 setState 或 root.render 的那一刻就立即应用更改并重新渲染。如果这样做效率会非常低，特别是当多个更新在短时间内连续发生时（例如在同一个按钮点击事件处理器中）。因此，React 采用了调度（Scheduling）和批处理（Batching）机制：
   * 
   * - 批处理更新：React 通常会将发生在相近时间点（如同一事件处理函数内）的多个更新组合成一个“批次”。updateQueue 允许 React 收集所有这些请求的更改，而无需每次请求都立即触发重新渲染。
   * - 调度与并发：在并发模式下，React 会给更新分配优先级（lanes）。updateQueue 会将这些更新连同它们的优先级一起保存。当 React 决定执行渲染时，它可以查看队列，并只处理那些优先级与当前渲染优先级匹配的更新，可能会推迟处理低优先级的更新。这使得高优先级的任务（如响应用户输入）可以打断并优先于低优先级的任务（如渲染网络请求返回的数据）。
   * - 
   */ 
  updateQueue: unknown;
  deletions: FiberNode[] | null;

  constructor(tag: WorkTag, pendingProps: Props, key: Key) {
    // 实例
    this.tag = tag;
    this.key = key || null;
    // HostComponent <div> div DOM
    this.stateNode = null;
    // FunctionComponent () => {}
    this.type = null;

    // 构成树状结构
    this.return = null;
    this.sibling = null;
    this.child = null;
    this.index = 0;

    this.ref = null;

    // 作为工作单元
    this.pendingProps = pendingProps;
    this.memoizedProps = null;
    this.memoizedState = null;
    this.updateQueue = null;

    this.alternate = null;
    // 副作用
    this.flags = NoFlags;
    this.subtreeFlags = NoFlags;
    this.deletions = null;
  }
}

export interface PendingPassiveEffects {
  unmount: Effect[];
  update: Effect[];
}

/**
 * FiberRootNode 是 FiberNode 的根节点。是整个 React 应用实例的根容器或入口点。
 */
export class FiberRootNode {
  /** container是指document（html元素）对应的容器，比如：\<div id="root"\>\<\/div\> */
  container: Container;
  /** 之所以我将fiberRootNode称为特殊的finerNode就是因为在这里fiberRootNode使用current来引用属于自身的fiberNode */
  current: FiberNode;
  finishedWork: FiberNode | null;
  /**
   * 待处理的优先级集合。pendingLanes (复数形式) 通常是一个位掩码 (bitmask)，代表了当前所有已调度但尚未完成的更新任务所对应的优先级集合。
   * 
   * 在一个 SPA 的运行过程中，用户交互、数据获取、动画、定时器等都可能触发状态更新。这些更新不是简单地一个接一个排队执行的，它们可能：
   * 
   * - 同时发生: 用户可能在数据加载的同时快速输入内容。
   * - 具有不同优先级: 用户输入（需要立即响应）通常比屏幕外的更新（可以稍后处理）优先级更高。
   * - pendingLanes 就是用来记录所有这些待处理更新的优先级集合。
   */
  pendingLanes: Lanes;
  /** finishedLane (单数形式) 代表了最近一次成功完成的渲染工作（即生成了 finishedWork 树）所处理的那个优先级（通常是该次渲染批次中最高的优先级）。 */
  finishedLane: Lane;
  pendingPassiveEffects: PendingPassiveEffects;
  callbackNode: CallbackNode | null;
  callbackPriority: Lane;
  constructor(container: Container, hostRootFiber: FiberNode) {
    this.container = container;
    this.current = hostRootFiber;
    hostRootFiber.stateNode = this;
    this.finishedWork = null;
    this.pendingLanes = NoLanes;
    this.finishedLane = NoLane;
    this.callbackNode = null;
    this.callbackPriority = NoLane;

    this.pendingPassiveEffects = {
      unmount: [],
      update: [],
    };
  }
}

// current 老节点的子节点， 新element对象的props
export const createWorkInProgress = (
  current: FiberNode,
  pendingProps: Props
): FiberNode => {
  let wip = current.alternate;
  // debugger
  if (wip === null) {
    // mount
    wip = new FiberNode(current.tag, pendingProps, current.key);
    wip.stateNode = current.stateNode;
    // debugger
    wip.alternate = current;
    current.alternate = wip;
  } else {
    // update
    wip.pendingProps = pendingProps;
    wip.flags = NoFlags;
    wip.subtreeFlags = NoFlags;
    wip.deletions = null;
  }
  wip.type = current.type;
  wip.updateQueue = current.updateQueue;
  wip.child = current.child;
  wip.memoizedProps = current.memoizedProps;
  wip.memoizedState = current.memoizedState;

  return wip;
};

export function createFiberFromElement(element: ReactElementType): FiberNode {
  const { type, key, props } = element;
  let fiberTag: WorkTag = FunctionComponent;

  if (typeof type === "string") {
    // <div/> type: 'div'
    fiberTag = HostComponent;
  } else if (typeof type !== "function") {
    console.warn("为定义的type类型", element);
  }
  const fiber = new FiberNode(fiberTag, props, key);
  fiber.type = type;
  return fiber;
}

export function createFiberFromFragment(elements: any[], key: Key): FiberNode {
  const fiber = new FiberNode(Fragment, elements, key);
  return fiber;
}
