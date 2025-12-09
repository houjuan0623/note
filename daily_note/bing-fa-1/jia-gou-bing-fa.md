---
icon: water
---

# 架构并发

在在本文主要从自己设计的IM架构层面提出来并发问题，并给出解决方案。逐渐完善吧。

#### 原子性资源竞争

**定义：** 多个请求同时修改同一个数值、数组或状态，导致覆盖或数据错误。这是最基础的“丢失更新逻辑前置条件竞争”问题。

* **典型案例：**
  1. **未读数更新：** 用户同时收到 3 条消息，并发更新未读计数器。
  2. **群成员变动：** 此时 A 进群，B 退群，同时修改 `members` 数组。
* **MongoDB 解决方案：原子操作符 (Atomic Operators)**
  * **策略：** 绝不使用“查出来改完再存回去”的方式。
  * **代码：**

```js
// ✅ 正确：直接在数据库层原子操作
// 更新未读数
db.sessions.updateOne({_id: sessionId}, { $inc: { unread: 1 } });

// 成员变动（并发进退群）
db.groups.updateOne({_id: groupId}, { $push: { members: userId } });
db.groups.updateOne({_id: groupId}, { $pull: { members: quitUserId } });
```

