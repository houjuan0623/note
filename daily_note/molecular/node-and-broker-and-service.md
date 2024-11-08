# node & broker & service

**node : broker : service = 1 : 1 : n**

**Node (节点)**

* Node 是指运行 MoleculerJS 应用程序的单个实例。
* 一个 Node 可以运行一个或多个 Service。
* 每个 Node 都有一个 Broker 实例来管理 Service。

**Broker (服务管理者)**

* Broker 是 MoleculerJS 的核心组件，负责管理 Node 上的所有 Service。
* Broker 负责 Service 的注册、发现、负载均衡和容错。
* Broker 还负责在 Service 之间传递请求和事件。

**Service (服务)**

* Service 是 MoleculerJS 应用程序的基本构建块。
* 每个 Service 都封装了一组相关的功能。
* Service 通过 Broker 进行通信，可以是本地 Service (同一 Node 上) 或远程 Service (不同 Node 上)。

**关系详解**

1. **Node 与 Broker:** 每个 Node 都有一个 Broker 实例，Broker 负责管理 Node 上的所有 Service。Node 提供运行环境，Broker 负责管理和协调 Service。
2. **Node 与 Service:** 一个 Node 可以运行一个或多个 Service。Node 为 Service 提供运行环境，Service 在 Node 上执行具体的业务逻辑。
3. **Broker 与 Service:** Broker 负责管理所有 Service，包括 Service 的注册、发现、负载均衡和容错。Service 通过 Broker 进行通信，可以是本地 Service 或远程 Service。



