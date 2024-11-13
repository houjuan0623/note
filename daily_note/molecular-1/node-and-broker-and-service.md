# Node\&Broker\&Service

**node : broker : server = 1 : 1 : n**

**1. Node (节点)**

* 一个 Node 代表一个运行 Moleculer 应用程序的独立进程。
* 每个 Node 都运行一个 Service Broker 实例。
* Node 可以位于不同的物理机器或虚拟机上，共同组成一个 Moleculer 集群。

**2. Service Broker (服务代理)**

* Service Broker 是 Moleculer 的核心组件，负责管理和协调 Node 上的服务。
* 每个 Node 都有一个 Service Broker 实例，它充当服务的中央枢纽。
* Service Broker 负责：
  * 注册和发现服务
  * 路由服务请求
  * 管理服务之间的通信
  * 处理服务调用和事件
  * 监控服务的健康状况

**3. Service (服务)**

* Service 是 Moleculer 应用程序的基本构建块，它封装了一组相关的功能。
* 每个 Service 都定义了一组 Actions (动作)，这些 Actions 可以被其他 Service 或客户端调用。
* Service Broker 负责管理和协调 Service 之间的交互。



