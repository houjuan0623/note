# key的实践

## 每次渲染时“动态生成” Key（bad）

很多新手会为了“消除警告”或“追求唯一”，写出这样的代码

```tsx
// ❌ 灾难性的写法
<Component key={Math.random()} />
// 或者
<Component key={Date.now()} />
```

&#x20;React 在执行 `reconcileSingleElement` 时，第一步就是比对 `key`。因为每次渲染 `Math.random()` 都会生成一个全新的值，React 会认为：**“哦！`key` 变了，说明原来的那个组件被删除了，这是一个全新出现的新组件！”**

**这会导致极其严重的后果：**

* **性能灾难：** React 不会复用（Update）原来的 DOM 节点，而是会将旧组件**彻底销毁（Unmount）**，把旧的真实 DOM 拔掉，然后重新创建一个全新的组件实例（Mount），并插入新的真实 DOM。这种频繁的 DOM 销毁和重建是极其消耗性能的。
* **状态丢失：** 只要[创建fiber树](../shen-me-shi-fiber-dui-xiang/shen-me-shi-hou-hui-chuang-jian-yi-ke-fiber-shu.md)，会导致旧的组件被判定为“已销毁”，组件内部的所有状态（`useState`）都会被清空。如果你在一个输入框上加了随机的 `key`，只要页面一刷新，用户输入了一半的文字就会瞬间消失。

## 给单个组件写死了“静态” Key（bad）

```jsx
// ❌ 画蛇添足的写法
<div key="header">
  <span key="title">标题</span>
  <button key="btn">点击</button>
</div>
```

这虽然不会导致状态丢失和组件卸载，但也**完全没有必要**，甚至会引入微小的性能损耗。

**为什么不需要？** 对于非数组列表的单节点，React 在 Diff 时天然就是\*\*按照它们在 JSX 代码里的“位置顺序”\*\*来进行一一对应的。 在这个例子里，React 明确知道 `<div>` 的第一个儿子是 `<span>`，第二个儿子是 `<button>`。只要它们在代码里的相对位置和标签类型（`type`）没变，React 就能完美地复用它们。

加上 `key`，反而逼着 React 每次比较时都要额外去读取并比对一下这两个字符串是否相等，完全是增加了无意义的计算负担。

## **渲染列表（数组）时使用key（good）**

当你使用 `map()` 渲染一组同类型的兄弟节点时：

```jsx
{items.map(item => <li key={item.id}>{item.name}</li>)}
```

## **故意想重置某个组件的状态时（高阶技巧）（good）**

有时候我们**确实希望**销毁并重建一个组件。 比如你有一个 `<UserProfile />` 组件，当切换不同用户时，你希望里面的所有 `useState` 状态彻底清空重来，而不是繁琐地去监听 `props` 变化重置状态。这时候可以故意利用 `key` 的特性：

```tsx
// ✅ 利用 key 变化强制卸载重建组件
<UserProfile key={userId} user={currentUser} />
```

当 `userId` 变化时，旧组件销毁，新组件挂载，状态干干净净。这被称为 **“Key 强制重置模式 (Fully Uncontrolled Component with a Key)”**。
