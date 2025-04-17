import { Container } from "@/react-dom/hostConfig";
import { ReactElementType } from "@/shared/ReactTypes";
import { FiberNode, FiberRootNode } from "./fiber";
import { requestUpdateLane } from "./fiberLanes";
import {
  createUpdate,
  createUpdateQueue,
  enqueueUpdate,
  UpdateQueue,
} from "./updateQueue";
import { scheduleUpdateOnFiber } from "./workLoop";
import { HostRoot } from "./workTags";

/**
 * 创建fiberRootNode，fiberRootNode是所有fiberNode的根节点。
 * @param container 一个document（html元素）数据结构
 * @returns fiberRootNode
 *
 */
export function createContainer(container: Container) {
  const hostRootFiber = new FiberNode(HostRoot, {}, null);
  const root = new FiberRootNode(container, hostRootFiber);
  hostRootFiber.updateQueue = createUpdateQueue();
  return root;
}

export function updateContainer(
  element: ReactElementType | null,
  root: FiberRootNode
) {
  const hostRootFiber = root.current;
  // 渲染优先级
  const lane = requestUpdateLane();
  const update = createUpdate<ReactElementType | null>(element, lane);
  enqueueUpdate(
    hostRootFiber.updateQueue as UpdateQueue<ReactElementType | null>,
    update
  );
  scheduleUpdateOnFiber(hostRootFiber, lane);
  return element;
}
