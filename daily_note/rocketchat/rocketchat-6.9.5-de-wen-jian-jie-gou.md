---
icon: cabinet-filing
---

# Rocketchat 6.9.5的文件结构

使用 Yarn 配合 `package.json` 编写 Mono Package 的步骤如下：

**1. 在根 `package.json` 中定义工作区**

在项目根目录的 `package.json` 文件中，添加 `workspaces` 字段，指定包含子项目的目录（通常是 `packages/*`）：

```json
{
  "name": "my-monorepo",
  "version": "1.0.0",
  "private": true, // 确保 monorepo 不会被意外发布
  "workspaces": [
    "packages/*"
  ]
}
```

**2. 创建子项目**

在 `packages` 目录下创建各个子项目，每个子项目都有自己的 `package.json` 文件：

```
my-monorepo/
  packages/
    package-a/
      package.json
    package-b/
      package.json
```

**3. 在子项目 `package.json` 中定义依赖**

在每个子项目的 `package.json` 中，定义其所需的依赖：

```json
// packages/package-a/package.json
{
  "name": "@my-monorepo/package-a",
  "version": "1.0.0",
  "dependencies": {
    "lodash": "^4.17.21"
  }
}
```

**4. 安装依赖**

在 monorepo 的根目录执行 `yarn install`，Yarn 会自动：

* 在根目录的 `node_modules` 中安装所有子项目的依赖
* 将子项目链接到根目录的 `node_modules`，使得子项目之间可以互相引用

**5. 子项目间互相引用**

子项目之间可以通过包名互相引用，就像它们已经被发布到 npm 上一样：

```typescript
// packages/package-b/index.ts
import { someFunction } from '@my-monorepo/package-a';

someFunction();
```

**注意事项**

* **私有包的命名**: 子项目的包名建议使用 `@monorepo-name/package-name` 的形式，以避免与其他公共包冲突。
* **版本管理**: 在 monorepo 中，所有子项目通常共享同一个版本号。可以使用 `yarn version` 命令来统一管理版本。
* **其他工具**: 除了 Yarn Workspace，还可以使用 Lerna 等工具来辅助管理 monorepo，例如提供更便捷的发布、版本管理等功能。

