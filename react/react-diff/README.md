# React Diff

## 传统Diff算法

在 React 官方文档和各种技术文章中，经常会看到这句话：“传统的树比对算法时间复杂度是 O(n^3)”。要理解这句话，需要跳出前端的思维，回到算法与数据结构的底层去看看。

### 谁使用的是传统的算法？

所谓的“传统算法”，指的是计算机科学中用来解决 **“树的编辑距离（Tree Edit Distance, TED）”** 问题的学术算法。

这种算法由于极其消耗性能，主要被应用于**对准确率要求极高，且树的节点数量相对较少**的学术和底层领域，例如：

* **生物信息学**：比对 DNA、RNA 的树状折叠结构差异。
* **自然语言处理（NLP）**：比对两句话的语法树（AST）差异。
* **编译器底层**：比对两份代码的抽象语法树（AST）以生成精确的 diff 补丁。

而在前端领域，一个页面的 DOM 节点动辄成千上万（n = 1000）。如果用O(n^3)的算法，计算量就是 1000^3 = 10 亿次运算，浏览器直接就卡死了。

### 为什么传统算法的时间复杂度高达 O(n^3)？

传统算法的最终目的是：**计算出把“树 A”变成“树 B”，所需的最少操作步数（插入、删除、修改/移动）。**

它之所以慢，是因为它没有任何前提假设，它允许**跨层级的节点移动**。这就导致了可怕的组合爆炸：

**第一步：节点两两比对 （耗时 O(n^2)）**

为了找到树 A 和树 B 之间哪些节点是可以复用的，传统算法需要把树 A 中的**每一个节点**，都拿去和树 B 中的**每一个节点**进行比对。 如果两棵树都有 n 个节点，光是两两比对的组合就有 n \* n = n^2 种。

**第二步：处理复杂的子树变换（再乘一个 n，达到 O(n^3)）**

在比对某两个节点（假设是节点 X 和节点 Y）时，算法不仅要看它们自身长得像不像，还要看**它们的子节点如何映射才能达到步骤最少**。

因为传统算法允许跨层级移动，这就意味着：

* X 的子节点，有可能被移动到了 Y 的爷爷节点下面。
* X 的某一层父节点可能被删除了，导致 X 的兄弟节点全都变成了 X 的子节点。

为了穷举并计算出这些错综复杂的子树转移路径的最优解，算法使用了**动态规划（Dynamic Programming）**。在动态规划的状态转移过程中，处理森林（多个子树）之间的最小编辑路径，又需要遍历一次节点的层级，这使得计算复杂度在O(n^2)的基础上又乘了一个 n，最终达到了理论上的 O(n^3)。

## React Diff算法

React 团队在设计时意识到：**在真实的 Web 前端开发中，DOM 节点跨层级移动的情况极少发生。** （比如，人们很少会把一个按钮从导航栏直接拖到页脚里去）。

因此，React 对传统的树编辑距离算法做了三大“粗暴但极其有效”的妥协（启发式假设）：

1. **只做同层级比对（扼杀跨层级复杂度）：** React 不跨层级比对。如果一个节点在树 A 中属于层级 2，在树 B 中被移到了层级 3。React 不会认为它是“移动”了，而是简单粗暴地认为：层级 2 的被销毁（Delete）了，层级 3 的是全新创建（Insert）的。 👉 _这一刀，直接砍掉了动态规划里最耗时的跨层级计算。_
2. **不同类型的元素直接抛弃：** 如果原来是 `<div>`，现在变成了 `<span>`，React 不会去深究它们里面的子节点长得像不像，而是直接把 `<div>` 连同它的子节点全部干掉，重新渲染一棵 `<span>` 树。
3. **Key 属性（解决同层级的排序问题）：** 对于同层级的一组子节点，传统算法要用动态规划去算谁被移动到了哪里。React 引入了 `key`，直接把复杂度变成了通过哈希表（Map）查找，变成了 O(1) 的读取。

### &#x20;`reconcileSingleElement` 中 Diff 的应用

**这个函数的应用场景：“新树中只有一个元素，但旧树中可能有一个或多个元素”。**

```typescript
function reconcileSingleElement(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    element: ReactElementType,
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
          console.warn("还未实现的react类型", element);
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
```

React 需要在旧的兄弟节点链表（`currentFiber` 以及它的 `sibling`）中，找到那个可以被**复用**的节点。如果没有找到，就删掉所有旧的，建一个新的。

1.  **遍历旧节点（寻找备胎）**

    ```typescript
    while (currentFiber !== null) { ... }
    ```

    因为新的节点只有一个，但是旧的节点可能是一个列表（比如原来是 `<li>1</li><li>2</li>`，现在变成了一个 `<p>新内容</p>`），所以 React 需要用 `while` 遍历所有旧兄弟节点，试图从中找出一个能和新元素匹配的。
2.  **第一层防御：比对 Key**

    ```typescript
    if (currentFiber.key === key) {
      // ... key 相同，进入下一层比对
    } else {
      // key不同，删掉当前旧节点，继续看下一个兄弟节点
      deleteChild(returnFiber, currentFiber);
      currentFiber = currentFiber.sibling;
    }
    ```

React 首先比对 `key`。

* 如果 `key` 不同，说明这个旧节点绝不是新节点的前世，直接标记删除（`deleteChild`），然后指针移到下一个兄弟节点（`currentFiber.sibling`）继续找。
* 如果 `key` 相同，说明找到了“疑似”可以复用的节点，进入第二层防御。

3. **第二层防御：比对 Type**

```typescript
if (currentFiber.type === element.type) {
  // type 相同，完美！完全可以复用！
  const existing = useFiber(currentFiber, props);
  // ...
  deleteRemainingChildren(returnFiber, currentFiber.sibling);
  return existing;
}
```

当 `key` 相同时，React 接着比对元素的 `type`（比如都是 `div`，或者都是同一个组件函数）。

* **匹配成功（复用）：** 如果 `type` 也相同，说明找到了完美的复用对象！React 会调用 `useFiber` 克隆并复用这个旧节点。同时，因为**新树只有一个节点**，所以既然找到了复用对象，旧树中剩下的那些兄弟节点肯定都没用了，必须调用 `deleteRemainingChildren` 将它们全部干掉。
* **匹配失败（销毁）：**
  *   如果 `key` 相同但 `type` 不同（比如原来是 `<div key="A">`，现在变成了 `<span key="A">`）。基于 Diff 算法的第二条原则，React 认为这已经是一个全新的事物了。更由于开发者给定的唯一 `key` 发生了 `type` 突变，React 会直接判定剩下的节点也没必要看了，调用 `deleteRemainingChildren` 删掉当前节点和剩下的兄弟节点，直接 `break` 跳出循环，准备去创建一个全新的节点。

      ```typescript
      // key相同，但 type 不同！删掉所有旧的！
      deleteRemainingChildren(returnFiber, currentFiber);
      break;
      ```

4. **兜底方案：创建全新节点**

```typescript
// 循环结束都没返回，或者提前 break 出来了
let fiber = createFiberFromElement(element);
fiber.return = returnFiber;
return fiber;
```

如果 `while` 循环完了，把所有旧节点都删了一遍也没找到能复用的；或者因为 `type` 不同提前 `break` 了，代码就会走到最后——根据新的 React 元素，老老实实地调用 `createFiberFromElement` 创建一个全新的 Fiber 节点。
