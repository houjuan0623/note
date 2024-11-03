# 什么是react Element？

Element在不同的语法环境下有不同的含义。

在 [mdn 对 DOM Element 的描述中](https://developer.mozilla.org/en-US/docs/Web/API/Element)，**`Element`** 是最通用的基类，[`Document`](https://developer.mozilla.org/zh-CN/docs/Web/API/Document) 中的所有元素对象（即表示元素的对象）都继承自它。它只具有各种元素共有的方法和属性。更具体的类则继承自 `Element`。

根据上面的描述，可以认为Element是具有各种元素公共方法和属性的数据结构。

有时候我们会把 `<span>111</span>` 形如这样的表示也称为 `Element`。这样的称呼不是准确的。`<span>`标签在经过浏览器的 `HTML` 编译器处理以后会被转化为对应的 `Span Element` ，注意转化后才会存在 `Span Element` 的概念。

那么什么是React Element呢？

下面是React源码中对 `element` 的描述：

```javascript
const element = {
    // This tag allows us to uniquely identify this as a React Element
    $$typeof: REACT_ELEMENT_TYPE,

    // Built-in properties that belong on the element
    type: type,
    key: key,
    ref: ref,
    props: props,

    // Record the component responsible for creating this element.
    _owner: owner,
  };
```

从而上面的代码中可以看到 `React Element` 的数据结构。

那么日常我们编写的形如 `const element = <span>111</span>` 可以被称为 `react element`吗？

答案是不能。

`<span>111</span>` 本身 **不能** 被称为 element。

`const element = <span>111</span>` 本身是 **JSX表达式**。

这段 JSX 代码会被 Babel 编译成 `React.createElement()` 方法调用，最终返回的是一个 React 元素对象。这个对象才是真正的 element。
