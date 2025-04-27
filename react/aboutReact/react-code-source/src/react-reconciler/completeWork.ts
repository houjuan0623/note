import {
  appendInitialChild,
  Container,
  createInstance,
  createTextInstance,
  Instance,
} from "@/react-dom/hostConfig";
import { FiberNode } from "./fiber";
import { NoFlags, Update } from "./fiberFlags";
import {
  HostRoot,
  HostText,
  HostComponent,
  FunctionComponent,
  Fragment,
} from "./workTags";

function markUpdate(fiber: FiberNode) {
  // debugger
  fiber.flags |= Update;
}

export const completeWork = (wip: FiberNode): void | null => {
  // 递归中的归
  // debugger
  const newProps = wip.pendingProps;
  const current = wip.alternate;

  switch (wip.tag) {
    case HostComponent:
      if (current !== null && wip.stateNode) {
        // TODO update
        // 1. props是否变化 {onClick: xx} {onClick: xxx}
        // 2. 变了 Update flag
        // className style
        markUpdate(wip);
      } else {
        // mount
        // 1. 构建DOM
        // const instance = createInstance(wip.type, newProps);
        const instance = createInstance(wip.type, newProps);
        // 2. 将DOM插入到DOM树中
        appendAllChildren(instance, wip);
        wip.stateNode = instance;
      }
      bubbleProperties(wip);
      return null;
    case HostText:
      if (current !== null && wip.stateNode) {
        // update
        const oldText = current.memoizedProps?.content;
        const newText = newProps.content;
        if (oldText !== newText) {
          markUpdate(wip);
        }
      } else {
        // 1. 构建DOM
        const instance = createTextInstance(newProps.content);
        wip.stateNode = instance;
      }
      bubbleProperties(wip);
      return null;
    case HostRoot:
    case FunctionComponent:
    case Fragment:
      bubbleProperties(wip);
      return null;
    default:
      console.warn("未处理的completeWork情况", wip);
      break;
  }
};

function appendAllChildren(parent: Container | Instance, wip: FiberNode) {
  let node = wip.child;

  while (node !== null) {
    if (node.tag === HostComponent || node.tag === HostText) {
      appendInitialChild(parent, node?.stateNode);
    } else if (node.child !== null) {
      node.child.return = node;
      node = node.child;
      continue;
    }

    if (node === wip) {
      return;
    }

    while (node.sibling === null) {
      if (node.return === null || node.return === wip) {
        return;
      }
      node = node?.return;
    }
    node.sibling.return = node.return;
    node = node.sibling;
  }
}
/**
 * 将累积的 subtreeFlags 赋值给父 Fiber 节点的 subtreeFlags，从而实现将子树中的 flags 向上冒泡到父节点的目的。<br />
 * 这个过程对于 React 的更新调度和副作用处理至关重要。通过向上收集 flags，React 可以高效地判断哪些子树需要进行后续的处理（例如 DOM 更新、调用生命周期钩子等），而不需要深入遍历没有发生任何变化的子树，从而提升了性能。
 * @param wip 当前处理的fiber节点
 */
export function bubbleProperties(wip: FiberNode) {
  // 这个变量将用于累积当前 wip Fiber 节点所有子节点及其子树的 flags。
  let subtreeFlags = NoFlags;
  let child = wip.child;

  // 这是一个 while 循环，它会遍历当前 wip Fiber 节点的所有直接子节点。React 的 Fiber 节点使用链表的数据结构来表示组件树的层级关系，child 指向第一个子节点，sibling 指向下一个兄弟节点。
  while (child !== null) {
    subtreeFlags |= child.subtreeFlags;
    subtreeFlags |= child.flags;

    child.return = wip;
    child = child.sibling;
  }
  // 在遍历完所有子节点之后，这行代码将最终累积的 subtreeFlags 赋值给当前 wip Fiber 节点的 subtreeFlags 属性。这样，父节点就知道了它的整个子树中是否存在需要处理的副作用。
  wip.subtreeFlags |= subtreeFlags;
}
