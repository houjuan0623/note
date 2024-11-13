---
icon: handshake
---

# Rocketchat OAuth Server的实现

假设第三方应用想要通过oauth server获取Rocketchat的token。

1. 用户向Rocketchat server发出请求。
2. 用户进入Rocketchat提供授权界面。
3.  用户 同意授权 将会发出下图中的第一个请求。

    **`allow` 参数的来源:**

    * **用户授权页面:** 当第三方应用发起 OAuth 授权请求时，Rocket.Chat 会向用户展示一个授权页面，询问用户是否允许第三方应用访问其账户。
    * **用户点击 "允许" 按钮:** 如果用户点击 "允许" 按钮，浏览器会向 `/oauth/authorize` 路径发送一个 POST 请求，该请求的 `req.body.allow` 参数的值为 'yes'。

    Rocketchat 会在后端 oauth server 中判断 allow 是否为 yes。
4. Rocketchat的oauth server向第三方应用返回 auth code。
5. 第三方应用收到 auth code 以后，向Rocketchat继续发送下图中的第二个请求。
6. Rocketchat 返回第三方应用token。



<figure><img src="../.gitbook/assets/image (39).png" alt=""><figcaption></figcaption></figure>





