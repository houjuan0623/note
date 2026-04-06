import { useState } from "react";
import { Dispatch } from "@/react/currentDispatcher";
import { Dispatcher } from "@/react/currentDispatcher";
import internals from "@/shared/internals";
import { Action } from "@/shared/ReactTypes";
import { FiberNode } from "./fiber";
import { Flags, PassiveEffect } from "./fiberFlags";
import { Lane, NoLane, requestUpdateLane, SyncLane } from "./fiberLanes";
import { HookHasEffect, Passive } from "./hookEffectTags";
import {
  createUpdate,
  createUpdateQueue,
  enqueueUpdate,
  processUpdateQueue,
  Update,
  UpdateQueue,
} from "./updateQueue";
import { scheduleUpdateOnFiber } from "./workLoop";
/**
 * 当前处理的函数式组件对应的fiber对象
 */
export let currentlyRenderingFiber: FiberNode | null = null; // export is not required
/**
 * workInProgressHook指向hook链表。
 */
export let workInProgressHook: Hook | null = null;
/**
 * 当前正在处理的hook函数对应的hook数据结构。
 */
export let currentHook: Hook | null = null;
let renderLane: Lane = NoLane;

const { currentDispatcher } = internals;
/**
 * 每次调用hook(useState, useEffect等)函数，都会产生一个hook数据结构
 */
export interface Hook {
  memoizedState: any;
  updateQueue: unknown;
  baseState: any;
  baseQueue: Update<any> | null;
  next: Hook | null;
}

export interface Effect {
  tag: Flags;
  create: EffectCallback | void;
  destroy: EffectCallback | void;
  deps: EffectDeps | void;
  next: Effect | null;
}

export interface FCUpdateQueue<State> extends UpdateQueue<State> {
  lastEffect: Effect | null;
}

type EffectCallback = () => void;
type EffectDeps = any[] | null;

/**
 *
 * 渲染函数组件并执行其内部的 Hooks。例如useState，useEffect等。
 *
 * 该函数主要负责：
 * 1. 初始化 Hooks 执行的全局上下文（例如 `currentlyRenderingFiber` 和 `renderLane`）。
 * 2. 清空当前 Fiber 节点上旧的 Hooks 和 Effects 链表，以便在本次渲染中重新构建。
 * 3. 根据当前是挂载（Mount）还是更新（Update）阶段，选择并注入对应的 Hooks Dispatcher（`HooksDispatcherOnMount` 或 `HooksDispatcherOnUpdate`）。
 * 4. 调用真实的函数组件执行渲染，获取 `children`。
 * 5. 执行完毕后清理全局上下文，防止在组件外部非法调用 Hooks。
 *
 * @param wip 当前正在处理的函数组件的 Work In Progress (WIP) Fiber 节点。
 * @param lane 本次渲染的优先级（Lane）。
 * @returns 返回函数组件执行后生成的子节点（通常是 React Element 树）。
 */
export function renderWithHooks(wip: FiberNode, lane: Lane) {
  // 赋值操作
  currentlyRenderingFiber = wip;
  // 重置 hooks链表
  wip.memoizedState = null;
  // 重置 effect链表
  wip.updateQueue = null;
  renderLane = lane;

  const current = wip.alternate;

  if (current !== null) {
    // update
    currentDispatcher.current = HooksDispatcherOnUpdate;
  } else {
    // mount
    currentDispatcher.current = HooksDispatcherOnMount;
  }

  const Component = wip.type;
  const props = wip.pendingProps;
  // FC render
  const children = Component(props);

  // 重置操作，防止在不正确的位置调用useState
  // 如果不是有效的上下文，这里的currentlyRenderingFiber不会被赋为正确的值。后面会有currentlyRenderingFiber是否为空的判断。
  currentlyRenderingFiber = null;
  workInProgressHook = null;
  currentHook = null;
  renderLane = NoLane;
  return children;
}

const HooksDispatcherOnMount: Dispatcher = {
  useState: mountState,
  useEffect: mountEffect,
};

const HooksDispatcherOnUpdate: Dispatcher = {
  useState: updateState,
  useEffect: updateEffect,
};

function mountEffect(create: EffectCallback | void, deps: EffectDeps | void) {
  const hook = mountWorkInProgresHook();
  const nextDeps = deps === undefined ? null : deps;
  (currentlyRenderingFiber as FiberNode).flags |= PassiveEffect;

  hook.memoizedState = pushEffect(
    Passive | HookHasEffect,
    create,
    undefined,
    nextDeps,
  );
}

function updateEffect(create: EffectCallback | void, deps: EffectDeps | void) {
  const hook = updateWorkInProgresHook();
  const nextDeps = deps === undefined ? null : deps;
  let destroy: EffectCallback | void;

  if (currentHook !== null) {
    const prevEffect = currentHook.memoizedState as Effect;
    destroy = prevEffect.destroy;

    if (nextDeps) {
      // 浅比较依赖
      const prevDeps = prevEffect.deps;
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        hook.memoizedState = pushEffect(Passive, create, destroy, nextDeps);
        return;
      }
    }
    // 浅比较 不相等
    (currentlyRenderingFiber as FiberNode).flags |= PassiveEffect;
    hook.memoizedState = pushEffect(
      Passive | HookHasEffect,
      create,
      destroy,
      nextDeps,
    );
  }
}

function areHookInputsEqual(nextDeps: EffectDeps, prevDeps: EffectDeps | void) {
  if (!prevDeps || !nextDeps) {
    return false;
  }
  for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
    if (Object.is(prevDeps[i], nextDeps[i])) {
      continue;
    }
    return false;
  }
  return true;
}

function pushEffect(
  hookFlags: Flags,
  create: EffectCallback | void,
  destroy: EffectCallback | void,
  deps: EffectDeps | void,
): Effect {
  const effect: Effect = {
    tag: hookFlags,
    create,
    destroy,
    deps,
    next: null,
  };
  const fiber = currentlyRenderingFiber as FiberNode;
  const updateQueue = fiber.updateQueue as FCUpdateQueue<any>;
  if (updateQueue === null) {
    const updateQueue = createFCUpdateQueue();
    fiber.updateQueue = updateQueue;
    effect.next = effect;
    updateQueue.lastEffect = effect;
  } else {
    // 插入effect
    const lastEffect = updateQueue.lastEffect;
    if (lastEffect === null) {
      effect.next = effect;
      updateQueue.lastEffect = effect;
    } else {
      const firstEffect = lastEffect.next;
      lastEffect.next = effect;
      effect.next = firstEffect;
      updateQueue.lastEffect = effect;
    }
  }
  return effect;
}

function createFCUpdateQueue<State>() {
  const updateQueue = createUpdateQueue<State>() as FCUpdateQueue<State>;
  updateQueue.lastEffect = null;
  return updateQueue;
}

function updateState<State>(): [State, Dispatch<State>] {
  // 找到当前useState对应的hook数据
  const hook = updateWorkInProgresHook();

  // 计算新state的逻辑
  const queue = hook.updateQueue as UpdateQueue<State>;
  const baseState = hook.baseState;

  // 从current中获取baseQueue
  const current = currentHook as Hook;
  let baseQueue = current.baseQueue;

  const pending = queue.shared.pending;

  if (pending !== null) {
    if (baseQueue !== null) {
      // 拼接操作
      // baseQueue = b2 -> b0 -> b1 -> b2
      // pendingQueue = p2 -> p0 -> p1 -> p2
      // b0
      const baseFirst = baseQueue.next;
      // p0
      const pendingFirst = pending.next;
      // b2 -> p0
      baseQueue.next = pendingFirst;
      // p2 -> b0
      pending.next = baseFirst;
      // pending = p2 -> b0 -> b1 -> b2 -> p0 -> p1 -> p2
    }
    baseQueue = pending;
    // 保存在current中，防止丢失
    current.baseQueue = pending;
    queue.shared.pending = null;
  }

  if (baseQueue !== null) {
    const {
      memoizedState,
      baseQueue: newBaseQueue,
      baseState: newBaseState,
    } = processUpdateQueue(baseState, baseQueue, renderLane);
    hook.memoizedState = memoizedState;
    hook.baseQueue = newBaseQueue;
    hook.baseState = newBaseState;
  }

  return [hook.memoizedState, queue.dispatch as Dispatch<State>];
}

function updateWorkInProgresHook(): Hook {
  // TODO render阶段触发的更新
  let nextCurrentHook: Hook | null;

  if (currentHook === null) {
    // 这是这个FC update时的第一个hook
    const current = currentlyRenderingFiber?.alternate;
    if (current !== null) {
      nextCurrentHook = current?.memoizedState;
    } else {
      // mount
      nextCurrentHook = null;
    }
  } else {
    // 这个FC update时 后续的hook
    nextCurrentHook = currentHook.next;
  }

  if (nextCurrentHook === null) {
    // mount/update u1 u2 u3
    // update       u1 u2 u3 u4
    throw new Error(
      `组件${currentlyRenderingFiber?.type}本次执行时的Hook比上次执行时多`,
    );
  }

  currentHook = nextCurrentHook as Hook;
  const newHook: Hook = {
    memoizedState: currentHook.memoizedState,
    updateQueue: currentHook.updateQueue,
    baseState: currentHook.baseState,
    baseQueue: currentHook.baseQueue,
    next: null,
  };
  if (workInProgressHook === null) {
    // mount时 第一个hook
    if (currentlyRenderingFiber === null) {
      throw new Error("请在函数组件内调用hook");
    } else {
      workInProgressHook = newHook;
      currentlyRenderingFiber.memoizedState = workInProgressHook;
    }
  } else {
    // mount时 后续的hook
    workInProgressHook.next = newHook;
    workInProgressHook = newHook;
  }
  return workInProgressHook;
}
/**
 *
 * @param initialState
 * @returns
 *
 * 当useState传入的是函数的时候，其返回值作为memoizedState。
 *
 * 当useState传入的是值的时候，其值作为memoizedState。
 */
export function mountState<State>(
  initialState: (() => State) | State,
): [State, Dispatch<State>] {
  // 找到当前useState对应的hook数据
  const hook = mountWorkInProgresHook();
  let memoizedState;
  if (initialState instanceof Function) {
    memoizedState = initialState();
  } else {
    memoizedState = initialState;
  }
  const queue = createUpdateQueue<State>();
  hook.updateQueue = queue;
  hook.memoizedState = memoizedState;

  // @ts-ignore
  const dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue);
  queue.dispatch = dispatch;
  return [memoizedState, dispatch];
}

/**
 * 触发状态更新的调度函数（即 `useState` 返回的 `setState` / `dispatch` 函数的底层实现）。
 *
 * 当用户在组件中调用 `setState(action)` 时，实际上执行的就是被 bind 提前绑定了 `fiber` 和 `updateQueue` 的这个函数。
 * 它主要负责：获取本次更新的优先级、创建更新对象、将更新推入队列、并通知 React 调度器在这个 Fiber 节点上开启一次全新的更新流程。
 *
 * @param fiber 触发更新的当前 Fiber 节点（即调用了该 `useState` 的函数组件对应的 Fiber 节点）。
 * @param updateQueue 当前 `useState` Hook 内部维护的更新队列，用于存储所有的状态更新动作。// TODO： 这句话没有理解，稍后回来再整理一下
 * @param action 用户调用 `setState` 时传入的动作，可以是一个新的状态值，也可以是一个接收旧状态返回新状态的函数 (`(prevState: State) => State`)。
 */
export function dispatchSetState<State>(
  fiber: FiberNode,
  updateQueue: UpdateQueue<State>,
  action: Action<State>,
) {
  const lane = requestUpdateLane();
  const update = createUpdate(action, lane);
  enqueueUpdate(updateQueue, update);
  scheduleUpdateOnFiber(fiber, lane);
}

export function mountWorkInProgresHook(): Hook {
  const hook: Hook = {
    memoizedState: null,
    updateQueue: null,
    baseState: null,
    baseQueue: null,
    next: null,
  };
  if (workInProgressHook === null) {
    // mount时 第一个hook
    if (currentlyRenderingFiber === null) {
      // 这里想要表达的是不知道编程人员在组件外的什么地方调用了useState，所以抛出错误
      // 这两个判断能够保证用户必须在函数式组件中调用hook
      throw new Error("请在函数组件内调用hook");
    } else {
      // 指向hook链表。
      workInProgressHook = hook;
      // 通过memoizedState建立fiber和hook链表之间的关系。
      currentlyRenderingFiber.memoizedState = workInProgressHook;
    }
  } else {
    // mount时 后续的hook
    workInProgressHook.next = hook;
    workInProgressHook = hook;
  }
  return workInProgressHook;
}
