---
icon: shuttle-space
---

# Rocketchat 怎样实现CI/CD的？

**Rocketchat 是通过github workflows完成的CI/CD。**

**持续集成 (CI)：** 开发人员频繁地将代码更改合并到共享存储库（例如 Git）的主分支中。每次合并都会触发自动构建和测试过程，以尽早发现和解决集成问题。

使用storybook完成的前端组件的测试。

使用mocha和jest完成的单元测试。

使用playwright完成的e2e测试。

使用docker部署的代码。

**持续交付 (CD)：** 在 CI 的基础上，将构建好的软件自动部署到预生产环境（例如测试环境或 staging 环境），确保软件始终处于可发布状态。



**持续部署 (CD)：** 将构建好的软件自动部署到生产环境，实现自动化发布。
