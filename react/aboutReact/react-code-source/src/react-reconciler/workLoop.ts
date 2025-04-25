import { scheduleMicroTask } from '@/react-dom/hostConfig';
import { beginWork } from './beginWork';
import {
	commitHookEffectListCreate,
	commitHookEffectListDestroy,
	commitHookEffectListUnmount,
	commitMutationEffects
} from './commitWork';
import { completeWork } from './completeWork';
import {
	createWorkInProgress,
	FiberNode,
	FiberRootNode,
	PendingPassiveEffects
} from './fiber';
import { MutationMask, NoFlags, PassiveMask } from './fiberFlags';
import {
	getHighestPriorityLane,
	Lane,
	lanesToSchedulerPriority,
	markRootFinished,
	mergeLanes,
	NoLane,
	SyncLane
} from './fiberLanes';
import { flushSyncCallbacks, scheduleSyncCallback } from './syncTaskQueue';
import { HostRoot } from './workTags';
import {
	unstable_scheduleCallback as scheduleCallback,
	unstable_NormalPriority as NormalPriority,
	unstable_cancelCallback,
	unstable_shouldYield
} from 'scheduler';
import { HookHasEffect, Passive } from './hookEffectTags';

let workInProgress: FiberNode | null = null;
let wipRootRenderLane: Lane = NoLane;
let rootDoesHasPassiveEffects = false;

type RootExitStatus = number;
// render中断
const RootInComplete = 1;
// render完成
const RootCompleted = 2;
// TODO render报错

/**
 * 初始化渲染环境（即初始化fiber树）。
 * @param root 
 * @param lane 
 * 
 * 它通常在以下情况被调用：<br />
 * - 首次渲染：当你的 SPA 应用第一次加载并渲染时，必须调用它来建立初始的 Fiber 树和渲染状态。
 * - 开始新的更新：当一个组件状态改变（setState）、属性变化（props change）、或者 forceUpdate 被调用时，React 需要启动一个新的渲染流程来计算变化。
 * - 优先级变化或中断：在并发模式下，如果一个更高优先级的更新（比如用户输入）到来了，而此时 React 正在处理一个较低优先级的更新（比如渲染一个数据列表），React 可能会中断当前的低优先级工作，转而去处理高优先级更新。这时，就需要调用 prepareFreshStack 来为这个更高优先级的更新准备工作环境。
 */
export function prepareFreshStack(root: FiberRootNode, lane: Lane) {
	root.finishedLane = NoLane;
	root.finishedWork = null;
	workInProgress = createWorkInProgress(root.current, {});
	wipRootRenderLane = lane;
}
/**
 * 发起更新，并告诉 React 应该以什么优先级来处理这个更新
 * @param fiber 
 * @param lane 
 * 
 * 1. 接收更新请求: 当组件调用 setState方法触发状态更新时，React 会调用 scheduleUpdateOnFiber，并将触发更新的 fiber 节点和优先级信息传递给它。
 * 2. 标记更新: scheduleUpdateOnFiber 函数会找到与该 fiber 节点关联的根节点（FiberRoot），并将更新的优先级（lane）合并到根节点的 pendingLanes 中。pendingLanes 是一个位掩码，用于跟踪所有待处理的更新。
 * 3. 调度更新:  scheduleUpdateOnFiber 最终会调用 ensureRootIsScheduled 函数，以确保根节点上的更新被适当地调度。这意味着 React 会根据更新的优先级来决定何时以及如何执行更新。  ensureRootIsScheduled  可能会同步地（对于高优先级更新）或异步地（对于低优先级更新）调度更新。
 * 
 * 例如：
 * 
 * ```
 * import React, { useState } from 'react';
 * import { scheduleUpdateOnFiber } from './react-reconciler'; // 假设这是 React 内部
 * const MyComponent = () => {
 *   const [count, setCount] = useState(0);
 * 
 *   const handleClick = () => {
 *   //  使用setState触发更新
 *     setCount(count + 1);
 *   };
 *   const forceUpdate = () => {
 *     // 获取当前组件对应的fiber
 *     const fiber = (MyComponent.__reactFiber$internal || MyComponent.__reactFiber$); // 实际获取fiber的方法会更复杂，这里简化了
 *     if (fiber) {
 *       //  直接使用scheduleUpdateOnFiber 触发更新，实际开发中不建议直接调用
 *       scheduleUpdateOnFiber(fiber, 1); // 假设 1 是一个优先级数值
 *     }
 *   }
 * 
 *   console.log('render', count);
 * 
 *   return (
 *     <div>
 *       <p>Count: {count}</p>
 *       <button onClick={handleClick}>Increase Count</button>
 *       <button onClick={forceUpdate}>Force Update</button>
 *     </div>
 *   );
 * };
 * export default MyComponent;
 * ```
 * 
 * 在这个例子中：
 * 1. 当用户点击 "Increase Count" 按钮时，setCount 函数会被调用。
 * 2. setCount 内部会调用 scheduleUpdateOnFiber，并将 MyComponent 对应的 fiber 节点和更新的优先级传递给它。
 * 3. scheduleUpdateOnFiber 会将这个更新添加到根节点的 pendingLanes 中，并调用 ensureRootIsScheduled 来调度更新。
 * 4. React 最终会根据优先级来决定何时重新渲染组件，更新 count 的值，并更新 DOM。
 */
export function scheduleUpdateOnFiber(fiber: FiberNode, lane: Lane) {
	// fiberRootNode
	const root = markUpdateFromFiberToRoot(fiber);
	markRootUpdated(root, lane);
	ensureRootIsScheduled(root);
}

// schedule阶段入口
export function ensureRootIsScheduled(root: FiberRootNode) {
	const updateLane = getHighestPriorityLane(root.pendingLanes);
	const existingCallback = root.callbackNode;

	// 如果是noLane就取消执行，所以稍后不想让任务被执行可以直接通过标记其优先级为NoLane即可。
	if (updateLane === NoLane) {
		if (existingCallback !== null) {
			unstable_cancelCallback(existingCallback);
		}
		root.callbackNode = null;
		root.callbackPriority = NoLane;
		return;
	}

	const curPriority = updateLane;
	const prevPriority = root.callbackPriority;

	if (curPriority === prevPriority) {
		return;
	}
	if (existingCallback !== null) {
		unstable_cancelCallback(existingCallback);
	}
	let newCallbackNode = null;
	// 两套调度体系 同步：微任务调度 并发：Scheduler调度

	if (updateLane === SyncLane) {
		// 同步优先级 用微任务调度

		console.log('在微任务中调度，优先级：', updateLane);

		// [performSyncWorkOnRoot, performSyncWorkOnRoot, performSyncWorkOnRoot]
		scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root));
		scheduleMicroTask(flushSyncCallbacks);
	} else {
		// 其他优先级 用宏任务调度
		const schedulerPriority = lanesToSchedulerPriority(curPriority); // 调用lanesToSchedulerPriority将workLoop中定义的优先级转化为react并发库中能够识别的优先级
		newCallbackNode = scheduleCallback(
			schedulerPriority,
			// @ts-ignore
			performConcurrentWorkOnRoot.bind(null, root)
		);
	}
	root.callbackNode = newCallbackNode;
	root.callbackPriority = curPriority;
}

function markRootUpdated(root: FiberRootNode, lane: Lane) {
	root.pendingLanes = mergeLanes(root.pendingLanes, lane);
}
/**
 * 找根节点 fiberRootNode。
 * @param fiber 
 * @returns 
 */
function markUpdateFromFiberToRoot(fiber: FiberNode) {
	let node = fiber;
	let parent = node.return;
	while (parent !== null) {
		node = parent;
		parent = node.return;
	}
	if (node.tag === HostRoot) {
		return node.stateNode;
	}
	return null;
}

function performConcurrentWorkOnRoot(
	root: FiberRootNode,
	didTimeout: boolean
): any {
	// TODO 检测当前不处于React工作流程（render、commit）内

	// 在执行具体工作前，保证上一次的useEffect都执行完了，避免意外错误的发生。参考 https://app.gitbook.com/o/Dh4flEm2pA2yXSN80gFW/s/wxgOyzcGIsWPaE8nJDAD/learn-from-source-code/cheng-xu-bing-fa#qu-xiao-he-zhong-duan
	const curCallbakNode = root.callbackNode;
	const didFlushPassiveEffect = flushPassiveEffects(root.pendingPassiveEffects);
	if (didFlushPassiveEffect) {
		if (root.callbackNode !== curCallbakNode) {
			return null;
		}
	}
	
	const lane = getHighestPriorityLane(root.pendingLanes);
	if (lane === NoLane) {
		return null;
	}

	const needSync = lane === SyncLane || didTimeout;
	// render阶段
	const existStatus = renderRoot(root, lane, !needSync);
	ensureRootIsScheduled(root);

	if (existStatus === RootInComplete) {
		if (root.callbackNode !== curCallbakNode) {
			return null;
		}
		return performConcurrentWorkOnRoot.bind(null, root);
	}

	if (existStatus === RootCompleted) {
		const finishedWork = root.current.alternate;
		root.finishedWork = finishedWork;
		root.finishedLane = lane;
		wipRootRenderLane = NoLane;

		// wip fiberNode树 树中的flags
		commitRoot(root);
	} else {
		// 报错
		console.error('还未实现的并更更新结束状态');
	}
}
/**
 * renderRoot 函数是 React 渲染流程的核心调度器之一，它负责启动或继续 Fiber 树的渲染阶段（Render Phase），这是开始处理更新、构建或更新 Fiber 树（工作单元）的入口点
 * @param root fiberRootNode
 * @param lane 
 * @param shouldTimeSlice true: 使用并发渲染（用于优先级较低的更新，渲染过程可以被中断（时间切片），允许浏览器处理更高优先级的任务（如用户事件、绘制），然后再回来继续渲染。）；false: 使用同步渲染（通常用于优先级较高的更新（如用户输入），会一次性完成整个 Fiber 树的遍历和计算，期间不会中断。）。
 * @returns 
 * 
 */
function renderRoot(
	root: FiberRootNode,
	lane: Lane,
	shouldTimeSlice: boolean
): RootExitStatus {

	console.log(`开始${shouldTimeSlice ? '并发' : '同步'}render阶段`, root);


	/**
	 * wipRootRenderLane !== lane
	 * 如果一个更高优先级的更新到来了，而此时 React 正在处理一个较低优先级的更新，React 可能会中断当前的低优先级工作，转而去处理高优先级更新。
	 */
	if (wipRootRenderLane !== lane) {
		// 初始化fiber树
		prepareFreshStack(root, lane);
	}

	do {
		try {
			shouldTimeSlice ? workLoopConcurrent() : workLoopSync();
			break;
		} catch (e) {

			console.warn('workLoop发生错误', e);

			workInProgress = null;
		}
	} while (true);

	// 中断执行 || 执行完 || TODO 报错
	if (shouldTimeSlice && workInProgress !== null) {
		return RootInComplete; // 如果是并发渲染 (shouldTimeSlice 为 true) 且 workInProgress 不为 null，表示渲染工作被中断（时间切片用完或有更高优先级任务），尚未完成。
	}
	if (!shouldTimeSlice && workInProgress !== null) {
		console.error('render阶段结束时wip不应该为null');
	}
	return RootCompleted; // 如果渲染工作正常完成（workInProgress 为 null），无论是同步还是并发模式。
}

function performSyncWorkOnRoot(root: FiberRootNode) {
	const nextLane = getHighestPriorityLane(root.pendingLanes);

	if (nextLane !== SyncLane) {
		// 其他比SyncLane低的优先级
		// NoLane
		ensureRootIsScheduled(root);
		return;
	}

	const existStatus = renderRoot(root, nextLane, false);

	if (existStatus === RootCompleted) {
		const finishedWork = root.current.alternate;
		root.finishedWork = finishedWork;
		root.finishedLane = nextLane;
		wipRootRenderLane = NoLane;
		// wip fiberNode树 树中的flags
		commitRoot(root);
	} else {
		console.error('还未实现的同步更新结束状态');
	}
}

function commitRoot(root: FiberRootNode) {
	const finishedWork = root.finishedWork;

	if (finishedWork === null) {
		return;
	}


	console.warn('commit阶段开始', finishedWork);

	const lane = root.finishedLane;

	if (lane === NoLane) {
		console.error('commit阶段finishedLane不应该是NoLane');
	}

	// 重置
	root.finishedWork = null;
	root.finishedLane = NoLane;

	markRootFinished(root, lane);

	if (
		(finishedWork.flags & PassiveMask) !== NoFlags ||
		(finishedWork.subtreeFlags & PassiveMask) !== NoFlags
	) {
		if (!rootDoesHasPassiveEffects) {
			rootDoesHasPassiveEffects = true;
			// 调度副作用
			scheduleCallback(NormalPriority, () => {
				// 执行副作用
				flushPassiveEffects(root.pendingPassiveEffects);
				return;
			});
		}
	}

	// 判断是否存在3个子阶段需要执行的操作
	// root flags root subtreeFlags
	const subtreeHasEffect =
		(finishedWork.subtreeFlags & MutationMask) !== NoFlags;
	const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags;

	if (subtreeHasEffect || rootHasEffect) {
		// beforeMutation
		// mutation Placement
		commitMutationEffects(finishedWork, root);

		root.current = finishedWork;

		// layout
	} else {
		root.current = finishedWork;
	}

	rootDoesHasPassiveEffects = false;
	ensureRootIsScheduled(root);
}

function flushPassiveEffects(pendingPassiveEffects: PendingPassiveEffects) {
	// TODO useEffect执行上下文的优先级

	let didFlushPassiveEffect = false;
	pendingPassiveEffects.unmount.forEach((effect) => {
		didFlushPassiveEffect = true;
		commitHookEffectListUnmount(Passive, effect);
	});
	pendingPassiveEffects.unmount = [];

	pendingPassiveEffects.update.forEach((effect) => {
		didFlushPassiveEffect = true;
		commitHookEffectListDestroy(Passive | HookHasEffect, effect);
	});
	pendingPassiveEffects.update.forEach((effect) => {
		didFlushPassiveEffect = true;
		commitHookEffectListCreate(Passive | HookHasEffect, effect);
	});
	pendingPassiveEffects.update = [];
	flushSyncCallbacks();
	return didFlushPassiveEffect;
}

function workLoopSync() {
	while (workInProgress !== null) {
		performUnitOfWork(workInProgress);
	}
}

function workLoopConcurrent() {
	while (workInProgress !== null && !unstable_shouldYield()) {
		performUnitOfWork(workInProgress);
	}
}

function performUnitOfWork(fiber: FiberNode) {
	const next = beginWork(fiber, wipRootRenderLane);
	fiber.memoizedProps = fiber.pendingProps;

	if (next === null) {
		completeUnitOfWork(fiber);
	} else {
		workInProgress = next;
	}
}

function completeUnitOfWork(fiber: FiberNode) {
	let node: FiberNode | null = fiber;

	do {
		completeWork(node);
		const sibling = node.sibling;

		if (sibling !== null) {
			workInProgress = sibling;
			return;
		}
		node = node.return;
		workInProgress = node;
	} while (node !== null);
}
