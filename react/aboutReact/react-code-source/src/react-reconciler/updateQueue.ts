import { Dispatch } from "@/react/currentDispatcher";
import { Action } from "@/shared/ReactTypes";
import { isSubsetOfLanes, Lane, NoLane } from "./fiberLanes";

export interface Update<State> {
  action: Action<State>;
  lane: Lane;
  next: Update<any> | null;
}

export interface UpdateQueue<State> {
  shared: {
    pending: Update<State> | null;
  };
  dispatch: Dispatch<State> | null;
}

/**
 * 创建更新节点。维护需要update的数据结构。
 * @param action 对应element对象，eg: <App /> 对应的js element结构。
 * @param lane 优先级
 * @returns object {action, lane, next: null,}
 */
export const createUpdate = <State>(
  action: Action<State>,
  lane: Lane
): Update<State> => {
  return {
    action,
    lane,
    next: null,
  };
};
/**
 * ```
 * {
 *   shared: {
 *     pending: null,
 *   },
 *    dispatch: null,
 * }
 * ```
 * pending的作用：维护更新队列。<br />
 * 作为更新队列的入口点，通过 pending 可以找到队列中所有的更新。 pending 指向的是最近被添加进队列的更新。在循环链表中，倒序遍历才能找到最初的更新，正序第一个就是最近的。
 */
export const createUpdateQueue = <State>() => {
  return {
    shared: {
      pending: null,
    },
    dispatch: null,
  } as UpdateQueue<State>;
};

/**
 * 建立update环状链表
 * @param updateQueue 内部的pending指向维护更新队列的指针
 * @param update 待更新的update对象
 *
 * pending === null 的含义： 当 pending 为 null 时，表示当前的更新队列是空的。也就是说，这是第一个被加入队列的更新。<br />
 * update.next = update 的作用： 此时，由于是第一个更新，我们需要创建一个只包含这一个元素的循环链表。因此，我们将 update 自身的 next 指针指向它自己。这样，就形成了一个长度为 1 的循环链表，如下图：<br />
 *
 * ```
 * # a的next指向自己a
 * a <-> a
 * ^     |
 * |_____|
 * ```
 *
 * pending 更新: 接下来 updateQueue.shared.pending = update; 将 pending 指向这个唯一的更新，成为循环列表的头节点。<br />
 * pending !== null 的情况： 当 pending 不为 null 时，表示队列中已经有更新存在。此时，update 会被添加到队列的末尾，并更新链表的循环引用：
 *
 * - update.next = pending.next;: 将新的 update 的 next 指针指向队列的第一个更新（因为 pending.next 指向第一个更新）。</li>
 * - pending.next = update;: 将当前队列的最后一个更新（也就是 pending 所指向的那个更新）的 next 指针指向新的 update。</li>
 * - updateQueue.shared.pending = update;: 将 pending 指向最新的更新。</li>
 *
 * 这样就实现了在原有的循环链表基础上添加新的更新，并维护了循环的结构，例如：
 * ```
 * b -> a -> b
 * ^    |    |
 * |____|____|
 * ```
 * 如果再加入一个c：
 * ```
 * c -> b -> a -> c
 * ^              |
 * |______________|
 * ```
 * c的next指向a，b的next指向c, pending更新为c
 */
export const enqueueUpdate = <State>(
  updateQueue: UpdateQueue<State>,
  update: Update<State>
) => {
  const pending = updateQueue.shared.pending;
  if (pending === null) {
    // pending = a -> a
    update.next = update;
  } else {
    // pending = b -> a -> b
    // pending = c -> b -> a -> c
    update.next = pending.next;
    pending.next = update;
  }
  updateQueue.shared.pending = update;
};
/**
 *
 * 遍历更新队列 (Update Queue)： 它接收一个组件当前的 baseState（上一次渲染确定或初始化的状态）和一个指向更新链表（pendingUpdate）的指针。<br />
 * 基于优先级处理更新： 它根据当前渲染的优先级 (renderLane) 来决定处理哪些更新。并非所有在队列中的更新都会在当前渲染周期中被处理。<br />
 * 计算新状态： 对于优先级足够的更新，它会依次应用这些更新（无论是直接设置值还是执行更新函数）来计算出本次渲染最终的状态 (memoizedState)。<br />
 * 处理被跳过的更新： 如果某些更新因为优先级不足而被跳过，它会将这些更新保留下来，形成一个新的更新队列 (baseQueue)，并计算出一个新的 baseState，这个 baseState 将作为下一次处理更新时的起始状态。<br />
 * 返回结果： 返回一个包含 memoizedState（本次渲染使用的状态）、baseState（下次更新计算的基础状态）和 baseQueue（剩余未处理的更新队列）的对象。<br />
 *
 * @param baseState
 * @param pendingUpdate
 * @param renderLane
 * @returns
 *
 *
 */
export const processUpdateQueue = <State>(
  baseState: State,
  pendingUpdate: Update<State> | null,
  renderLane: Lane
): {
  memoizedState: State;
  baseState: State;
  baseQueue: Update<State> | null;
} => {
  // 函数开始时，会创建一个 result 对象。memoizedState 和 baseState 都被初始化为传入的 baseState。baseQueue 初始化为 null。
  const result: ReturnType<typeof processUpdateQueue<State>> = {
    memoizedState: baseState,
    baseState,
    baseQueue: null,
  };

  // 如果 pendingUpdate 存在即队列中有更新。
  if (pendingUpdate !== null) {
    // 获取环状链表中的第一个更新节点（ pendingUpdate 指向的是最后一个节点）。
    const first = pendingUpdate.next;
    // 设置一个指针 pending，接下来从第一个更新开始遍历。
    let pending = pendingUpdate.next as Update<any>;

    // 初始化 newBaseState，它将记录下一次更新开始时的状态。
    let newBaseState = baseState;
    let newBaseQueueFirst: Update<State> | null = null;
    let newBaseQueueLast: Update<State> | null = null;
    // 初始化了一个 newState 变量，它的初始值是本次处理更新前的基础状态 (baseState)
    // 在 do...while 循环的每一次迭代中，newState 变量会被当前正在处理的这个更新所修改。
    // newState 变量就像一个累加器，在循环过程中逐步地、顺序地应用了所有优先级足够的更新，确保了函数式更新总是基于其前面更新处理后的结果进行计算。
    let newState = baseState;

    do {
      const updateLane = pending.lane;
      // 根据当前渲染的任务的优先级 (renderLane) 来决定处理哪些更新。并非所有在队列中的更新都会在当前渲染周期中被处理。
      if (!isSubsetOfLanes(renderLane, updateLane)) {
        // 优先级不足
        const clone = createUpdate(pending.action, pending.lane);
        // 是不是第一个被跳过的
        if (newBaseQueueFirst === null) {
          // first = u0 last = u0
          newBaseQueueFirst = clone;
          newBaseQueueLast = clone;
          // 记录第一个被跳过的节点
          newBaseState = newState;
        } else {
          // first = u0 -> u1 && last = u1
          // first = u0 -> u1 -> u2 && last = u2
          (newBaseQueueLast as Update<State>).next = clone;
          newBaseQueueLast = clone;
        }
      } else {
        // 优先级够
        // 检查之前是否已有更新被跳过。如果有，说明当前这个高优先级更新是在某个低优先级更新之后被处理的。为了保证状态计算的顺序和一致性，即使这个高优先级更新被处理了，也需要将它的一个副本（但优先级设为 NoLane，因为它已经被处理了）添加到 newBaseQueue 中。这确保了 baseQueue 包含了所有原始更新（包括被跳过的和被处理的，如果它们之间穿插的话），以便未来能正确地重放。
        if (newBaseQueueLast !== null) {
          // 标记为NoLane，后面循环过程中不会被处理
          const clone = createUpdate(pending.action, NoLane);
          newBaseQueueLast.next = clone;
          newBaseQueueLast = clone;
        }

        const action = pending.action;
        // 这里的 action 就是传入 setState 的那个函数 (例如 prevState => ({ count: prevState.count + 1 })）。
        if (action instanceof Function) {
          // baseState 1 update (x) => 4x -> memoizedState 4
          // 这个 action 函数被调用时，传递给它的参数是当前的 newState 值。这个 newState 值不是最初的 baseState，而是已经被循环中它之前的所有（优先级足够的）更新修改过的中间状态。
          newState = action(baseState);
        } else {
          // baseState 1 update 2 -> memoizedState 2
          newState = action;
        }
      }
      pending = pending.next as Update<State>;
    } while (pending !== first);

    if (newBaseQueueLast === null) {
      // 没有被跳过的
      newBaseState = newState;
    } else {
      newBaseQueueLast.next = newBaseQueueFirst;
    }
    result.baseState = newBaseState; // 这是下一次 processUpdateQueue 调用时的 baseState 输入
    result.memoizedState = newState; // 这是当前组件渲染实际使用的状态。
    result.baseQueue = newBaseQueueLast; // 将指向被跳过更新链表（newBaseQueue）最后一个节点的指针存入结果。这个 baseQueue 会被存储在 Fiber 节点上，用于下一次更新处理。
  }
  return result;
};
