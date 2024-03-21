# 🚀 Streamer、Notification、Listener

### 源码位置

* [Streamer](https://github.com/RocketChat/Rocket.Chat/blob/4.0.0/server/modules/streamer/streamer.module.ts)源码
* [Notification](https://github.com/RocketChat/Rocket.Chat/blob/4.0.0/server/modules/notifications/notifications.module.ts)源码
* [Listener](https://github.com/RocketChat/Rocket.Chat/blob/4.0.0/server/modules/listeners/listeners.module.ts)源码

Streamer做了什么？Notification做了什么？Listener做了什么？总览

`ListenersModule` 监听到的事件会交给 `NotificationsModule` 发送通知，而 `NotificationsModule` 在发送通知的过程中会依赖于 `Streamer`。

`NotificationsModule` 中定义了多个 `Streamer` 实例，每个实例负责一种特定类型的通知流。当 `NotificationsModule` 需要发送通知时，它会使用相应的 `Streamer` 实例来广播通知数据。例如，当需要发送用户状态更新的通知时，`NotificationsModule` 可能会使用名为 `streamUser` 的 `Streamer` 实例来发送这个通知。

`Streamer` 实例负责将通知数据发送给所有订阅了相应事件流的客户端，从而实现实时通信。所以，`NotificationsModule` 在发送通知时确实依赖于 `Streamer` 来完成数据的广播和传输。



