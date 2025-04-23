---
icon: sitemap
---

# Rocketchat 架构

<figure><img src="../.gitbook/assets/image (32).png" alt=""><figcaption><p>官方的微服务架构</p></figcaption></figure>

<figure><img src="../.gitbook/assets/image (1) (1) (1).png" alt=""><figcaption><p>Rocketchat 官方为服务架构补充</p></figcaption></figure>

* 每个serice中都会调用registerModel函数（猜测registerModel中的数据库是各个service需要的数据库的集合），相当于每个service都要操作数据库。然后通过数据库对象代理就可以访问数据库了。
* 每个service中都会使用 api.setBroker(broker) 将自身使用的broker设置为molecular的netWorkBroker。
* 每个service都会调用 api.registerService(new XXX())将自身注册为一个service。

## Rocketchat monolith

特殊的微服务：Rocket.Chat

这个服务中的broker和service是 1:n 的关系。其他的微服务中broker和service是1:1的关系。

在Rocketchat(monolith)这个服务中有一部分代码和DDP Streamer、Stream Hub、Accounts、Authorization、Presence是相同的，因为Rocketchat(monolith)本身就是一个单体应用，Rocketchat前期在开发的过程中使用的就是单体应用架构，但是后来为了适应高并发，将软件拆分为了微服务架构，代码逐渐被迁移到未付架构上，迁移的过程是循序渐进的。

到目前为止，RocketChat仍然保存着单体应用（作为非ee版本），微服务架构中的其他服务会复用其中的一部分代码将某些功能拆分成了molecular的服务。

其中就有DDP Streamer、Stream Hub、Accounts、Authorization、Presence，对于这几个微服务，broker和service保持着1:1的关系。在Rocketchat(monolith)中的也存在许多service。

1、Rocketchat(monolith)中的service足以支持Rocketchat的顺畅运行，So对于Rocketchat(monolith)中的Authorization service和独立的Authorization service是不是功能重合了吗？

No，源码中通过这样一段代码区分开来了微服务架构下要运行的service和单体架构下要运行的service。

```typescript
// 微服务架构下不会在Rocketchat(monolith)启动单体service。
if (!isRunningMs()) {
    const { Presence } = await import('@rocket.chat/presence');
    
    const { Authorization } = await import('./authorization/service');
    
    api.registerService(new Presence());
    api.registerService(new Authorization());
    
    // Run EE services defined outside of the main repo
    // Otherwise, monolith would ignore them :(
    // Always register the service and manage licensing inside the service (tbd)
    api.registerService(new QueueWorker(db, Logger));
    api.registerService(new OmnichannelTranscript(Logger));
}
```

2、怎样找到指定的service？

```typescript
// packages/core-services/src/lib/proxify.ts
function handler<T extends object>(namespace: string, waitService: boolean): ProxyHandler<T> {
	return {
		get:
			(_target: T, prop: string): any =>
			(...params: any): Promise<any> =>
				// 在这里指定namespace，调用指定的service
				api[waitService ? 'waitAndCall' : 'call'](`${namespace}.${prop}`, params),
	};
}
```

3、Rocketchat(monolith)中的Meteor service和ddp-streamer service功能重合，调用broadcast的时候怎么区分出来是Meteor还是ddp-streamer？

<pre class="language-typescript"><code class="lang-typescript"><strong>// Meteor service 是一个internal service
</strong><strong>export class MeteorService extends ServiceClassInternal implements IMeteor {
</strong>	protected name = 'meteor';
}
</code></pre>

***

在上图中ddp-streamer是特殊的。

在 Rocket.Chat 的源码中，只有 `ddp-streamer` service 中显式调用了 `InstanceStatus.registerInstance` 方法。

Rocket.Chat 将 **能够独立运行并提供特定功能的服务** 视为一个 instance。

* **`ddp-streamer` service:** 负责处理 DDP 连接和消息广播，是 Rocket.Chat 运行的 **核心服务**，因此它被注册为一个 instance。
* **其他微服务:** 例如 `livechat`、`apps`、`push` 等，虽然也提供独立的功能，但它们通常 **依赖于 `ddp-streamer` service**，或者说它们的功能是 `ddp-streamer` service 的扩展，因此不被视为独立的 instance。

**Rocket.Chat 为什么要区分 instance？**

* **监控和管理:** 通过 `InstanceStatus` 模块，Rocket.Chat 可以监控各个 instance 的运行状态（例如连接数、CPU 使用率、内存占用等），并进行相应的管理操作。
* **集群部署:** 在集群部署环境中，Rocket.Chat 可以通过 `InstanceStatus` 模块来识别和管理不同的服务器节点，实现负载均衡和高可用。
* **故障排除:** 当某个 instance 出现故障时，Rocket.Chat 可以通过 `InstanceStatus` 模块快速定位问题，并进行相应的处理。

**为什么只有 `ddp-streamer` 被注册为 instance？**

* **核心服务:** `ddp-streamer` service 是 Rocket.Chat 运行的核心服务，它的状态直接影响到整个系统的稳定性和可用性，因此需要对其进行监控和管理。
* **独立运行:** `ddp-streamer` service 可以独立运行，而其他微服务通常需要依赖 `ddp-streamer` service 提供的 DDP 连接和消息广播功能。
