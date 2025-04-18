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
  alternate: FiberNode | null;
  flags: Flags;
  subtreeFlags: Flags;
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
 * FiberRootNode 是 FiberNode 的根节点
 */
export class FiberRootNode {
  /** container是指document（html元素）对应的容器，比如：\<div id="root"\>\<\/div\> */
  container: Container;
  /** 之所以我将fiberRootNode称为特殊的finerNode就是因为在这里fiberRootNode使用current来引用属于自身的fiberNode */
  current: FiberNode;
  finishedWork: FiberNode | null;
  pendingLanes: Lanes;
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
