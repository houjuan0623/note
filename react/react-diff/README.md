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

### reconliceChildrenArray 中 Diff 的应用

```typescript
function reconcileChildrenArray(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null,
    newChild: any[],
  ) {
    // 当前已经处理过的、且不需要移动的复用节点中，在老树里最靠右的位置（最大索引）。
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
```

当在 React 中渲染一个数组（比如 `<ul>` 下面有一堆 `<li>`），React 就会调用这个函数。它的根本目标是：**接收一个旧的 Fiber 节点链表和一个新的 React Element 数组，通过最高效的复用策略，生成一个新的 Fiber 节点链表，并为需要增删改移的节点打上副作用标记（Flags）。**

**首先认识三个变量：**

```typescript
let lastPlacedIndex = 0; // 极其重要：记录最后一个【不需要移动】的可复用节点，在老树中的索引（位置）
let lastNewFiber: FiberNode | null = null; // 用于将新节点串联成链表（指向链表尾部）
let firstNewFiber: FiberNode | null = null; // 用于返回，指向新链表的头部
```

#### 第一步：将老节点存入 Map 缓存

```typescript
const existingChildren: ExistingChildren = new Map();
let current = currentFirstChild;
while (current !== null) {
  const keyToUse = current.key !== null ? current.key : current.index;
  existingChildren.set(keyToUse, current);
  current = current.sibling;
}
```

**这一步在干嘛？** 因为老节点（`currentFirstChild`）是一个单向链表，想在单向链表里找某个特定的节点（比如找 `key="A"` 的节点）是非常慢的（时间复杂度 $O(n)$）。 为了加快后续比对的速度，React 遍历了一遍老节点链表，把它们全部存进了一个 `Map` 里。

* **找人的凭证（Key）**：如果有开发者传的 `key` 就用 `key`；如果没有，就只能无奈地用它在兄弟里的排行 `index`。

#### 第二步：遍历新数组，寻找可复用的老节点

```typescript
for (let i = 0; i < newChild.length; i++) {
  const after = newChild[i];
  const newFiber = updateFromMap(returnFiber, existingChildren, i, after);
  // ...
```

接下来，React 开始遍历我们这次要渲染的新数组（`newChild`）。 对于每一个新元素，它会调用 `updateFromMap` 函数去刚刚建好的花名册（Map）里“捞人”。

**`updateFromMap` 内部逻辑：**

1. 根据新元素的 `key` 或 `index` 去 Map 里找老节点。
2. **如果找到了，并且类型（type）一样**：太好了！调用 `useFiber` 克隆并复用这个老节点，同时**把它从 Map 中删掉**（这代表这个老节点已经被认领了）。
3. **如果没找到，或者类型变了**：老老实实调用 `createFiberFromElement` 创建一个全新的 Fiber 节点。

#### 第三步：将新节点串成链表，并判断是否需要“移动”（最烧脑的部分）

拿到 `newFiber` 后，首先用 `firstNewFiber` 和 `lastNewFiber` 把它们通过 `.sibling` 指针连成一串单向链表。

紧接着，是最核心的 **DOM 移动判断逻辑**：

```typescript
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
```

**如果这是一个全新创建的节点 (`current === null`)：** 很好理解，新来的，当然要打上 `Placement`（插入）标记。

**如果这是一个复用的老节点 (`current !== null`)：** React 需要判断它在真实的 DOM 里需不需要被移动。这里巧妙地使用了 `lastPlacedIndex` 这个游标。 **`lastPlacedIndex` 的物理意义是：当前已经处理过的、且不需要移动的复用节点中，在老树里最靠右的位置（最大索引）。**

👉 **举个例子来理解这个神仙逻辑：** 假设老树是 `A(0), B(1), C(2)`，新树变成了 `C, A, B`。

1. **遍历到新节点 `C`**：
   * 在 Map 中复用老节点 `C`，它的 `oldIndex` 是 `2`。
   * 此时 `lastPlacedIndex` 是初始值 `0`。
   * `2 < 0` 不成立。说明 `C` 节点的位置在 `lastPlacedIndex` 的右边，不需要移动它（就把它当做锚点固定在这里）。
   * 更新 `lastPlacedIndex = 2`。
2. **遍历到新节点 `A`**：
   * 在 Map 中复用老节点 `A`，它的 `oldIndex` 是 `0`。
   * 此时 `lastPlacedIndex` 已经是 `2` 了。
   * `0 < 2` 成立！这说明在老树里，`A` 明明排在 `C` 的左边，但现在我们正在渲染的 `C` 后面，所以 `A` 必须被往右边移动！
   * 给 `A` 打上 `Placement` 标记。`lastPlacedIndex` 保持 `2` 不变。
3. **遍历到新节点 `B`**：
   * 复用老节点 `B`，`oldIndex` 是 `1`。
   * `1 < 2` 成立！同理，`B` 原本也在 `C` 的左边，现在跑到 `C` 后面去了，必须移动！
   * 给 `B` 打上 `Placement` 标记。

最终结果：`C` 不动，`A` 和 `B` 被标记为插入（移动）到 `C` 的后面。完美实现了以最小的操作代价更新 DOM！

> `lastPlacedIndex` 本身就是为了标记一个锚点。看完下面一个问题就能理解了。
>
> Q：即使发现了可复用地老节点，应该怎么确定A和B分别插入到哪儿呢？因为placement只能代表插入啊。并没有说插入到哪儿。
>
> A：在 Render 阶段打上的 `Placement` 标记，仅仅是一个布尔性质的 Flag，它只表达了 **“我需要被插入或移动”**，但**绝对没有**在这个标记里存储“我要插到第几个位置”或者“我要插到谁前面”。
>
> 解决方案隐藏在下面的步骤中：
>
> 在**下一阶段（Commit 阶段）的代码中。React 会利用已经构建好的新 Fiber 树的拓扑结构**，通过一个叫 **`getHostSibling`** 的核心函数，动态去寻找插入的“锚点（Anchor）”。
>
> **1. 寻找真实 DOM 的“兄弟锚点”：`getHostSibling`**
>
> 当 Commit 阶段处理到带有 `Placement` 标记的节点时，会调用 `commitPlacement` 函数。这个函数会去寻找两个东西：
>
> 1. **`hostParent`**：我要插到哪个父节点下面？
> 2. **`sibling`**：我要插到哪个兄弟节点的前面？
>
> 找兄弟节点用的是 `getHostSibling`。它的核心逻辑非常聪明：**顺着新 Fiber 树的 `sibling` 指针往后找，直到找到一个“稳定”的真实 DOM 节点为止。**
>
> 看看 `getHostSibling` 里这段极其关键的判断：
>
> ```typescript
> while (node.tag !== HostText && node.tag !== HostComponent) {
>     // 【核心秘籍】：如果后面这个兄弟节点自己也带了 Placement 标记，
>     // 说明它自己也是个泥菩萨过江，还没稳定下来，不能拿它当锚点！跳过它！
>     if ((node.flags & Placement) !== NoFlags) {
>         continue findSibling;
>     }
>     // ...
> }
>
> // 找到了一个既是真实 DOM，又没有 Placement 标记的稳定节点！
> if ((node.flags & Placement) === NoFlags) {
>     return node.stateNode; 
> }
> ```
>
> **什么是“稳定”的节点？** <mark style="color:blue;">就是那些在 Diff 算法中没有被打上</mark> <mark style="color:blue;"></mark><mark style="color:blue;">`Placement`</mark> <mark style="color:blue;"></mark><mark style="color:blue;">标记、位置不需要变动的老节点。</mark>
>
> **2. 决定调用 `insertBefore` 还是 `appendChild`**
>
> 拿到这个稳定的 `sibling` 锚点之后，在 `insertOrAppendPlacementNodeIntoContainer` 函数中，React 会做如下抉择：
>
> ```typescript
> if (before) {
>     // 如果找到了稳定的兄弟节点，就插到它前面！
>     insertChildToContainer(finishedWork.stateNode, hostParent, before);
> } else {
>     // 如果一直往后找，直到最后都没找到稳定的兄弟节点，
>     // 说明我自己就是最后面的了，直接追加到父级末尾！
>     appendChildToContainer(hostParent, finishedWork.stateNode);
> }
> ```
>
> 💡 举个绝佳的例子来推演一遍
>
> 假设老树是 `[A, B, C, D]`，我们更新后变成了 `[A, C, B, D]`。 在 Render 阶段的 `reconcileChildrenArray` 中，打标记的情况如下：
>
> * **A**: 没变，不动。
> * **C**: 没变，不动 (`lastPlacedIndex` 更新为 C 的老索引 2)。
> * **B**: 老索引 1 < 2，**被打上 `Placement` 标记！**
> * **D**: 没变，不动 (`lastPlacedIndex` 更新为 D 的老索引 3)。
>
> 现在进入 Commit 阶段，React 发现了 **B** 身上有 `Placement` 标记，准备移动它的真实 DOM：
>
> 1. React 调用 `getHostSibling(B)`，顺着新 Fiber 树去找 B 的下一个兄弟。
> 2. B 的新兄弟是 **D**。
> 3. React 检查 D：D 是原生节点，而且 **D 身上没有 `Placement` 标记**！太好了，D 是一个稳如泰山的老同志！
> 4. `getHostSibling` 成功返回 D 的真实 DOM 节点作为 `before` 锚点。
> 5. React 执行 DOM 操作：`hostParent.insertBefore(B的DOM, D的DOM)`。
>
> 原先屏幕上的 DOM 是 A, B, C, D。 执行完 `insertBefore` 后，B 被从原来的位置拔出来，插到了 D 的前面。 屏幕上的 DOM 瞬间变成了 **A, C, B, D**。

#### 第四步：清理垃圾（销毁多余的老节点）

```typescript
existingChildren.forEach((fiber) => {
  deleteChild(returnFiber, fiber);
});
return firstNewFiber;
```

当新数组遍历完后，如果 Map（`existingChildren`）里还有剩余的节点，说明什么？ 说明这些老节点在新数组里没有找到归宿，它们被抛弃了！ 所以，直接遍历 Map，把里面剩下的孤魂野鬼全部打上 `ChildDeletion` 标记，让渲染器在 Commit 阶段把它们从真实 DOM 中拔除。

最后，返回串联好的新 Fiber 链表头部 `firstNewFiber`，这一层的多节点 Diff 就大功告成了。
