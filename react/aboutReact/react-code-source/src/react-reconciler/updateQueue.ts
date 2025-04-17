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
 * 建立update队列
 * @param updateQueue 内部的pending指向维护更新队列的指针
 * @param update 待更新的update对象
 *
 * pending === null 的含义： 当 pending 为 null 时，表示当前的更新队列是空的。也就是说，这是第一个被加入队列的更新。<br />
 * update.next = update 的作用： 此时，由于是第一个更新，我们需要创建一个只包含这一个元素的循环链表。因此，我们将 update 自身的 next 指针指向它自己。这样，就形成了一个长度为 1 的循环链表，如下图：<br />
 * ```
 * // a的next指向自己a
 * a <-> a
 * ^     |
 * |_____|
 * ```
 * pending 更新: 接下来 updateQueue.shared.pending = update; 将 pending 指向这个唯一的更新，成为循环列表的头节点。<br />
 * pending !== null 的情况： 当 pending 不为 null 时，表示队列中已经有更新存在。此时，update 会被添加到队列的末尾，并更新链表的循环引用：

update.next = pending.next;: 将新的 update 的 next 指针指向队列的第一个更新（因为 pending.next 指向第一个更新）。
pending.next = update;: 将当前队列的最后一个更新（也就是 pending 所指向的那个更新）的 next 指针指向新的 update。
updateQueue.shared.pending = update;: 将 pending 指向最新的更新。
这样就实现了在原有的循环链表基础上添加新的更新，并维护了循环的结构，例如：
```
b -> a -> b
^    |    |
|____|____|

```
如果再加入一个c：
```
c -> b -> a -> c
^              |
|______________|
```
c的next指向a，b的next指向c, pending更新为c
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

export const processUpdateQueue = <State>(
  baseState: State,
  pendingUpdate: Update<State> | null,
  renderLane: Lane
): {
  memoizedState: State;
  baseState: State;
  baseQueue: Update<State> | null;
} => {
  const result: ReturnType<typeof processUpdateQueue<State>> = {
    memoizedState: baseState,
    baseState,
    baseQueue: null,
  };

  if (pendingUpdate !== null) {
    // 第一个update
    const first = pendingUpdate.next;
    let pending = pendingUpdate.next as Update<any>;

    let newBaseState = baseState;
    let newBaseQueueFirst: Update<State> | null = null;
    let newBaseQueueLast: Update<State> | null = null;
    let newState = baseState;

    do {
      const updateLane = pending.lane;
      if (!isSubsetOfLanes(renderLane, updateLane)) {
        // 优先级不足
        const clone = createUpdate(pending.action, pending.lane);
        // 是不是第一个被跳过的
        if (newBaseQueueFirst === null) {
          // first = u0 last = u0
          newBaseQueueFirst = clone;
          newBaseQueueLast = clone;
          newBaseState = newState;
        } else {
          // first = u0 -> u1 last = u1
          // first = u0 -> u1 -> u2 last = u2
          (newBaseQueueLast as Update<State>).next = clone;
          newBaseQueueLast = clone;
        }
      } else {
        // 优先级够
        if (newBaseQueueLast !== null) {
          const clone = createUpdate(pending.action, NoLane);
          newBaseQueueLast.next = clone;
          newBaseQueueLast = clone;
        }

        const action = pending.action;
        if (action instanceof Function) {
          // baseState 1 update (x) => 4x -> memoizedState 4
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
    result.baseState = newBaseState;
    result.memoizedState = newState;
    result.baseQueue = newBaseQueueLast;
  }
  return result;
};
