# tree shaking

## tree shaking 作用

tree shaking能够帮助我们有效减少代码体积。

所以在软件开发中，我们应该 **尽可能地编写无副作用的代码**。

虽然有副作用的代码是必要的（例如与用户交互、进行网络请求等），但过多的副作用会使代码难以理解、测试和维护。

### 降低代码的副作用方法

* **使用纯函数:** 尽可能将逻辑封装在纯函数中，这些函数只依赖于输入参数，不修改任何外部状态。
* **分离副作用:** 将有副作用的操作集中到特定的函数或模块中，使代码结构更清晰。
* **使用不可变数据:** 使用不可变数据结构，避免直接修改对象或数组，而是创建新的对象或数组。
* **函数式编程:** 学习函数式编程的思想和技巧，例如 map、filter、reduce 等高阶函数，可以帮助你编写更简洁、更易于理解的无副作用代码。
  * 语言本身提供的函数式API的“纯度”由开发语言的工程师来保证，比如map，但是如果由语言的使用者开发map功能的话，不能保证map是否还有“纯度”。

### react \_jsxs 函数

因为js是解释型语言，所以webpack是没有办法绝对分析出来函数是否有副作用的，只根据代码AST无法确定运行时是否真正地使用了某个数据结构。请注意我说的是绝对，相对地有一部分代码是可以被分析出来没有副作用的。

为了提高webpack打包能力，webpack将分析代码副作用的部分过程转移给了开发人员。

如果开发人员认为该函数的调用过程/该函数没有副作用，就添加 `/*#PURE*/。`

<figure><img src=".gitbook/assets/image (1) (1).png" alt=""><figcaption></figcaption></figure>

接下来我们看一下react框架制定者是怎样思考的？

他们认为调用 `/*#PURE*/_jsxs()` 的过程也是无副作用的，所以开发者开发了第三方工具使babel在build过程中默认在调用 `_jsxs()` 的时候添加 `/*#PURE*/`。

### react 副作用

请注意这里要描述的是react的副作用，不是函数的副作用。

参考文章：[https://medium.com/@remoteupskill/what-is-a-react-side-effect-a5525129d251](https://medium.com/@remoteupskill/what-is-a-react-side-effect-a5525129d251)

在 React.js 中，副作用指的是任何超出 React 范围的操作。调用任何 Web API（例如 `localStorage`）、向外部 API 发起 HTTPS 请求等都被视为副作用。我们通常使用 `useEffect` hook 来管理 React 中的副作用。

**什么是 React 范围之外？**

React 范围之外指的是不属于 React 框架的部分，例如浏览器中的 `localStorage`。`localStorage` 是一个 Web API，不属于 React。

**`localStorage`**

`localStorage` 是构建 Web 应用程序的重要工具，它允许你在浏览器中存储键值对数据。`localStorage` 中的键和值始终以 UTF-16 字符串格式存储。你可以在 MDN 网站上了解更多关于 `localStorage` 的信息：

当我们在 React 中使用任何浏览器 API（例如 `localStorage`）时，我们都会产生副作用。

例如，以下代码通过将值存储在 `localStorage` 中产生了副作用：

```
useEffect(() => {
  localStorage.setItem('some key', true);
}, []);
```

另一个产生副作用的例子是使用原生 DOM 方法而不是 React 中包含的方法：

```
useEffect(() => {
  document.getElementById("overlay").style.display = "block";
}, []);
```

我们需要关注的是能否**有效地管理这些副作用**。React使用了上面描述的[降低代码副作用的方法](page.md#jiang-di-dai-ma-de-fu-zuo-yong-fang-fa)中描述的**分离副作用**的方法。

**如何有效地管理副作用？**

这意味着我们能否有效地跟踪副作用的变化，以及能否在前端应用程序中的单个位置或单个组件中管理副作用。React为我们提供了 `useEffect` 函数。
