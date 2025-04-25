import { REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE } from '@/shared/ReactSymbols';
import { Key, Props, ReactElementType } from '@/shared/ReactTypes';
import {
    createFiberFromElement,
    createFiberFromFragment,
    createWorkInProgress,
    FiberNode
} from './fiber';
import { ChildDeletion, Placement } from './fiberFlags';
import { Fragment, HostText } from './workTags';

type ExistingChildren = Map<string | number, FiberNode>;
/**
 * ChildReconciler 是一个高阶函数，它返回一个用于协调（reconcile） 子节点的函数。<br />
 * 协调是 React 的核心过程之一，指的是比较上一次渲染的 Fiber 节点（旧树）和本次渲染生成的 React 元素（新树），计算出差异，并为需要执行的 DOM 操作（或其他副作用）打上标记（Flags）。<br />
 * 这个协调器负责处理一个父 Fiber 节点 (returnFiber) 下的子节点的变化。<br />
 * - 单一子节点 (reconcileSingleElement, reconcileSingleTextNode)：当父节点只有一个子元素或文本节点时。
 * - 多个子节点 (reconcileChildrenArray)：当父节点的子节点是一个数组时（最常见的情况，例如 ul 下有多个 li）。
 * @param shouldTrackEffects 控制是否应该在协调过程中追踪副作用（Effects）。副作用主要指需要对真实 DOM 进行的操作
 * @returns 
 */
export function ChildReconciler(shouldTrackEffects: boolean) {
    function deleteChild(returnFiber: FiberNode, childToDelete: FiberNode) {
        if (!shouldTrackEffects) {
            return;
        }
        const deletions = returnFiber.deletions;
        if (deletions === null) {
            returnFiber.deletions = [childToDelete];
            returnFiber.flags |= ChildDeletion;
        } else {
            deletions.push(childToDelete);
        }
    }
    function deleteRemainingChildren(
        returnFiber: FiberNode,
        currentFirstChild: FiberNode | null
    ) {
        if (!shouldTrackEffects) {
            return;
        }
        let childToDelete = currentFirstChild;
        while (childToDelete !== null) {
            deleteChild(returnFiber, childToDelete);
            childToDelete = childToDelete.sibling;
        }
    }
    /**
     * 
     * @param returnFiber 
     * @param currentFiber 
     * @param element 
     * @returns 
     */
    function reconcileSingleElement(
        returnFiber: FiberNode,
        currentFiber: FiberNode | null,
        element: ReactElementType
    ) {
        const key = element.key;
        while (currentFiber !== null) {
            // update
            // 下面执行diff的三个判断条件。
            if (currentFiber.key === key) {
                // key相同
    
                if (element.$$typeof === REACT_ELEMENT_TYPE) {
                    if (currentFiber.type === element.type) {
                        let props = element.props;
                        if (element.type === REACT_FRAGMENT_TYPE) {
                            props = element.props.children;
                        }
                        // type相同
                        const existing = useFiber(currentFiber, props);
                        existing.return = returnFiber;
                        // 当前节点可复用，标记剩下的节点删除
                        deleteRemainingChildren(returnFiber, currentFiber.sibling);
                        return existing;
                    }

                    // key相同，type不同 删掉所有旧的
                    deleteRemainingChildren(returnFiber, currentFiber);
                    break;
                } else {

                    console.warn('还未实现的react类型', element);
                    break;

                }
            } else {
                // key不同，删掉旧的
                deleteChild(returnFiber, currentFiber);
                currentFiber = currentFiber.sibling;
            }
        }
        // 根据element创建fiber
        let fiber;
        if (element.type === REACT_FRAGMENT_TYPE) {
            fiber = createFiberFromFragment(element.props.children, key);
        } else {
            fiber = createFiberFromElement(element);
        }
        fiber.return = returnFiber;
        return fiber;
    }
    function reconcileSingleTextNode(
        returnFiber: FiberNode,
        currentFiber: FiberNode | null,
        content: string | number
    ) {
        while (currentFiber !== null) {
            // update
            if (currentFiber.tag === HostText) {
                // 类型没变，可以复用
                const existing = useFiber(currentFiber, { content });
                existing.return = returnFiber;
                deleteRemainingChildren(returnFiber, currentFiber.sibling);
                return existing;
            }
            deleteChild(returnFiber, currentFiber);
            currentFiber = currentFiber.sibling;
        }
        const fiber = new FiberNode(HostText, { content }, null);
        fiber.return = returnFiber;
        return fiber;
    }

    function placeSingleChild(fiber: FiberNode) {
        if (shouldTrackEffects && fiber.alternate === null) {
            fiber.flags |= Placement;
        }
        return fiber;
    }

    function reconcileChildrenArray(
        returnFiber: FiberNode,
        currentFirstChild: FiberNode | null,
        newChild: any[]
    ) {
        // 最后一个可复用fiber在current中的index
        let lastPlacedIndex = 0;
        // 创建的最后一个fiber
        let lastNewFiber: FiberNode | null = null;
        // 创建的第一个fiber
        let firstNewFiber: FiberNode | null = null;

        // 1.将current保存在map中
        const existingChildren: ExistingChildren = new Map();
        let current = currentFirstChild;
        while (current !== null) {
            const keyToUse = current.key !== null ? current.key : current.index;
            existingChildren.set(keyToUse, current);
            current = current.sibling;
        }

        for (let i = 0; i < newChild.length; i++) {
            // 2.遍历newChild，寻找是否可复用
            const after = newChild[i];

            const newFiber = updateFromMap(returnFiber, existingChildren, i, after);

            if (newFiber === null) {
                continue;
            }

            // 3. 标记移动还是插入
            newFiber.index = i;
            newFiber.return = returnFiber;

            if (lastNewFiber === null) {
                lastNewFiber = newFiber;
                firstNewFiber = newFiber;
            } else {
                lastNewFiber.sibling = newFiber;
                lastNewFiber = lastNewFiber.sibling;
            }

            if (!shouldTrackEffects) {
                continue;
            }

            const current = newFiber.alternate;
            if (current !== null) {
                const oldIndex = current.index;
                if (oldIndex < lastPlacedIndex) {
                    // 移动
                    newFiber.flags |= Placement;
                    continue;
                } else {
                    // 不移动
                    lastPlacedIndex = oldIndex;
                }
            } else {
                // mount
                newFiber.flags |= Placement;
            }
        }
        // 4. 将Map中剩下的标记为删除
        existingChildren.forEach((fiber) => {
            deleteChild(returnFiber, fiber);
        });
        return firstNewFiber;
    }

    function updateFromMap(
        returnFiber: FiberNode,
        existingChildren: ExistingChildren,
        index: number,
        element: any
    ): FiberNode | null {
        const keyToUse = element.key !== null ? element.key : index;

        // 老节点的fiber对象
        const before = existingChildren.get(keyToUse);

        // HostText
        if (typeof element === 'string' || typeof element === 'number') {
            if (before) {
                if (before.tag === HostText) {
                    existingChildren.delete(keyToUse);
                    return useFiber(before, { content: element + '' });
                }
            }
            return new FiberNode(HostText, { content: element + '' }, null);
        }

        // ReactElement
        if (typeof element === 'object' && element !== null) {
            switch (element.$$typeof) {
                case REACT_ELEMENT_TYPE:
                    if (element.type === REACT_FRAGMENT_TYPE) {
                        return updateFragment(
                            returnFiber,
                            before,
                            element,
                            keyToUse,
                            existingChildren
                        );
                    }
                    if (before) {
                        if (before.type === element.type) {

                            // 从map中删掉代表可以复用
                            // 剩下的最后都会被移除
                            // 1 2 3  老
                            // 2 3   新


                            existingChildren.delete(keyToUse);
                            return useFiber(before, element.props);
                        }
                    }
                    return createFiberFromElement(element);
            }

            // TODO 数组类型
            if (Array.isArray(element)) {
                console.warn('还未实现数组类型的child');
            }
        }

        if (Array.isArray(element)) {
            return updateFragment(
                returnFiber,
                before,
                element,
                keyToUse,
                existingChildren
            );
        }
        return null;
    }

    /**
     * 协调 <br />
     * 
     * returnFiber 当前正在处理的wip节点的那个父级 Fiber 节点（在 workInProgress 树中）。
     * currentFiber 当前正在处理的wip节点的alternate对应的 Fiber 节点（在 current 树中）。
     * newChild 本次渲染调用 render() 方法中传入的组件即 returnFiber 代表的组件。
     */
    return function reconcileChildFibers(
        returnFiber: FiberNode,
        currentFiber: FiberNode | null,
        newChild?: any
    ) {
        // 判断Fragment
        const isUnkeyedTopLevelFragment =
            typeof newChild === 'object' &&
            newChild !== null &&
            newChild.type === REACT_FRAGMENT_TYPE &&
            newChild.key === null;
        if (isUnkeyedTopLevelFragment) {
            newChild = newChild.props.children;
        }

        // 判断当前fiber的类型
        if (typeof newChild === 'object' && newChild !== null) {
            // 多节点的情况 ul> li*3
            if (Array.isArray(newChild)) {
                return reconcileChildrenArray(returnFiber, currentFiber, newChild);
            }

            switch (newChild.$$typeof) {
                case REACT_ELEMENT_TYPE:
                    return placeSingleChild(
                        reconcileSingleElement(returnFiber, currentFiber, newChild)
                    );
                default:

                    console.warn('未实现的reconcile类型', newChild);

                    break;
            }
        }

        // HostText
        if (typeof newChild === 'string' || typeof newChild === 'number') {
            return placeSingleChild(
                reconcileSingleTextNode(returnFiber, currentFiber, newChild)
            );
        }

        if (currentFiber !== null) {
            // 兜底删除
            deleteRemainingChildren(returnFiber, currentFiber);
        }

        console.warn('未实现的reconcile类型', newChild);

        return null;
    };
}

function useFiber(fiber: FiberNode, pendingProps: Props): FiberNode {
    const clone = createWorkInProgress(fiber, pendingProps);
    clone.index = 0;
    clone.sibling = null;
    return clone;
}

function updateFragment(
    returnFiber: FiberNode,
    current: FiberNode | undefined,
    elements: any[],
    key: Key,
    existingChildren: ExistingChildren
) {
    let fiber;
    if (!current || current.tag !== Fragment) {
        fiber = createFiberFromFragment(elements, key);
    } else {
        existingChildren.delete(key);
        fiber = useFiber(current, elements);
    }
    fiber.return = returnFiber;
    return fiber;
}

/**
 * 为什么 reconcileChildFibers 传入 true？<br />
 * 这个版本的协调器用于组件更新（Update） 阶段。在更新阶段，React 需要将新的 React 元素与屏幕上已存在的组件对应的旧 Fiber 树进行比较（diffing）。比较的目的是找出最小的变更集，以最高效地更新 UI。<br />
 * 
 * 因此，在更新时：
 * 1. 需要知道哪些节点是新增的：需要标记 Placement。
 * 2. 需要知道哪些节点被删除了：需要记录在 deletions 列表并标记 ChildDeletion。
 * 3. 需要知道哪些节点位置改变了：需要标记 Placement (移动也是一种 Placement)。
 * 4. 需要知道哪些节点内容或属性更新了：需要标记 Update (这部分在此代码中不直接体现，但属于副作用)。
 * 
 * 为了完成这些，协调器必须追踪这些副作用。所以 shouldTrackEffects 设置为 true。
 */
export const reconcileChildFibers = ChildReconciler(true);
/**
 * 为什么 mountChildFibers 传入 false？<br />
 * 这个版本的协调器用于组件首次挂载（Mount） 阶段。在首次挂载时，组件是第一次渲染，屏幕上没有对应的旧 Fiber 树或 DOM 结构。<br />
 * 因此，在挂载时：
 * 
 * 1. 所有子节点都是全新的：它们都需要被插入到 DOM 中。
 * 2. 不存在旧节点：所以不可能有删除操作，也不需要比较来判断移动。
 * 
 * 虽然所有节点都需要被插入（逻辑上都是 "Placement"），但 React 在处理首次挂载时有优化。通常，如果一个父节点被标记为 Placement，那么在提交（Commit）阶段，渲染引擎会递归地插入这个父节点及其所有子孙节点，而不需要每个子孙节点都单独标记 Placement。<br />
 * 
 * 通过将 shouldTrackEffects 设置为 false，mountChildFibers 可以：
 * - 跳过所有删除相关的逻辑（因为无旧节点可删）。
 * - 简化或跳过移动相关的逻辑（lastPlacedIndex 的比较等，因为所有节点都是按顺序新创建的）。
 * - 它仍然会创建新的 Fiber 节点，但不需要像更新时那样详细地记录每种副作用类型（尤其是删除和移动）。
 * 这使得首次挂载的协调过程更轻量、更快速。
 */
export const mountChildFibers = ChildReconciler(false);
