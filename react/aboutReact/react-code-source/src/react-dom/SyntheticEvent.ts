import { Container } from './hostConfig';
import {
    unstable_ImmediatePriority,
    unstable_NormalPriority,
    unstable_runWithPriority,
    unstable_UserBlockingPriority
} from 'scheduler';
import { Props } from '@/shared/ReactTypes';

/**
 * 字符串 '__props'，用作 DOM 元素上的一个 key，用于存储 React 组件的 props。
 */
export const elementPropsKey = '__props';
/**
 * 数组，包含有效的事件类型，这里只有 'click'。
 */
export const validEventTypeList = ['click'];

type EventCallback = (e: Event) => void;

interface SyntheticEvent extends Event {
    __stopPropagation: boolean;
}

interface Paths {
    capture: EventCallback[];
    bubble: EventCallback[];
}

export interface DOMElement extends Element {
    [elementPropsKey]: Props;
}

// dom[xxx] = reactElemnt props
export function updateFiberProps(node: DOMElement, props: Props) {
    node[elementPropsKey] = props;
}
/**
 * 建立事件合成和事件分发机制
 * 
 * @param container 来自 './hostConfig'，表示 React 渲染的根节点（例如，document.getElementById('root')）
 * @param eventType 
 * @returns 
 * 
 * 合成事件机制的原理：
 * 
 * - 事件委托： React 会将所有事件监听器都绑定到根容器（container）上。当一个事件发生时，浏览器会将这个事件冒泡到根容器。这里利用浏览器的冒泡特性实现的事件委托。
 * - 事件分发： 根容器上的事件监听器接收到事件后，React 内部会根据事件发生的具体元素和组件结构，创建一个合成事件对象（SyntheticEvent），然后按照特定的顺序（捕获阶段 -> 冒泡阶段）将这个合成事件分发给真正需要处理这个事件的组件。这里利用e.target获取真正需要执行事件的element。
 * 
 * 为什么不能直接获取子元素事件？
 * 
 * - 性能优化： 如果为每个子元素都绑定事件监听器，当组件数量非常多时，会造成大量的事件监听器绑定，影响性能。通过将事件监听器绑定到根容器，可以显著减少需要绑定的事件监听器的数量。
 * - 统一处理： React 需要在事件处理过程中做很多事情，例如创建合成事件对象、管理事件的传播、处理不同浏览器的兼容性等。将事件统一在根容器处理，可以简化 React 内部的事件处理逻辑。
 * - 跨平台： React 需要支持不同的平台，例如浏览器、React Native 等。不同的平台有不同的事件机制，通过合成事件，React 可以抽象出一套统一的事件接口，使得事件处理代码可以在不同平台之间复用。
 */
export function initEvent(container: Container, eventType: string) {
    if (!validEventTypeList.includes(eventType)) {
        console.warn('当前不支持', eventType, '事件');
        return;
    }

    console.log('初始化事件：', eventType);

    // 将事件挂在container上。
    container.addEventListener(eventType, (e) => {
        // 合成事件的核心实现
        dispatchEvent(container, eventType, e);
    });
}

/**
 * 创建合成事件对象。
 * 
 * - 它将标准的 Event 对象转换为 SyntheticEvent 对象。
 * - 它初始化 __stopPropagation 属性为 false。
 * - 它重写了 stopPropagation 方法，以便在阻止事件传播时，同时设置 __stopPropagation 属性。
 * 
 * @param e 标准事件
 * @returns 合并事件
 */
function createSyntheticEvent(e: Event) {
    const syntheticEvent = e as SyntheticEvent;
    syntheticEvent.__stopPropagation = false;
    const originStopPropagation = e.stopPropagation;

    syntheticEvent.stopPropagation = () => {
        syntheticEvent.__stopPropagation = true;
        if (originStopPropagation) {
            originStopPropagation();
        }
    };
    return syntheticEvent;
}

function dispatchEvent(container: Container, eventType: string, e: Event) {
    const targetElement = e.target;

    if (targetElement === null) {
        console.warn('事件不存在target', e);
        return;
    }

    // 1. 收集沿途的事件
    const { bubble, capture } = collectPaths(
        targetElement as DOMElement,
        container,
        eventType
    );
    // 2. 构造合成事件
    const se = createSyntheticEvent(e);

    // 3. 遍历captue
    triggerEventFlow(capture, se);

    if (!se.__stopPropagation) {
        // 4. 遍历bubble
        triggerEventFlow(bubble, se);
    }
}

function triggerEventFlow(paths: EventCallback[], se: SyntheticEvent) {
    for (let i = 0; i < paths.length; i++) {
        const callback = paths[i];
        // 根据优先级调用回调
        unstable_runWithPriority(eventTypeToSchedulerPriority(se.type), () => {
            callback.call(null, se);
        });

        if (se.__stopPropagation) {
            break;
        }
    }
}

function getEventCallbackNameFromEventType(
    eventType: string
): string[] | undefined {
    return {
        click: ['onClickCapture', 'onClick']
    }[eventType];
}
/**
 * 
 * @param targetElement 
 * @param container 
 * @param eventType 
 * @returns 
 */
function collectPaths(
    targetElement: DOMElement,
    container: Container,
    eventType: string
) {
    const paths: Paths = {
        capture: [],
        bubble: []
    };

    while (targetElement && targetElement !== container) {
        /**
         * 收集
         * 例如，假设有以下 React 组件：
         * ```
         * function MyComponent(props) {
         *   return <div onClick={() => console.log('Clicked!', props.message)}>Hello, {props.name}</div>;
         * }
         * // 渲染组件到 id 为 "root" 的 DOM 元素中
         * ReactDOM.render(<MyComponent name="World" message="Welcome!" />, document.getElementById('root'));
         * ```
         * 当 MyComponent 组件被渲染时，React 会创建一个 <div> 元素，并将组件的 props（即 { name: "World", message: "Welcome!" }）存储到这个 <div> 元素的一个特殊属性中。这个特殊属性的名称就是 __props。
         * 在 React 的事件处理代码中，collectPaths 函数，会使用 elementPropsKey 来访问存储在 DOM 元素上的 props，以便获取事件处理函数。
         * 总之：
         * targetElement 指的是触发事件的 DOM 元素。
         * elementPropsKey 是一个特殊的 key（'__props'），用于在 DOM 元素上存储 React 组件的 props。
        */
        const elementProps = targetElement[elementPropsKey];
        if (elementProps) {
            // click -> onClick onClickCapture
            const callbackNameList = getEventCallbackNameFromEventType(eventType);
            if (callbackNameList) {
                callbackNameList.forEach((callbackName, i) => {
                    const eventCallback = elementProps[callbackName];
                    if (eventCallback) {
                        if (i === 0) {
                            // capture
                            paths.capture.unshift(eventCallback);
                        } else {
                            paths.bubble.push(eventCallback);
                        }
                    }
                });
            }
        }
        // 向上遍历，收集事件
        targetElement = targetElement.parentNode as DOMElement;
    }
    return paths;
}

function eventTypeToSchedulerPriority(eventType: string) {
    switch (eventType) {
        case 'click':
        case 'keydown':
        case 'keyup':
            return unstable_ImmediatePriority;
        case 'scroll':
            return unstable_UserBlockingPriority;
        default:
            return unstable_NormalPriority;
    }
}
