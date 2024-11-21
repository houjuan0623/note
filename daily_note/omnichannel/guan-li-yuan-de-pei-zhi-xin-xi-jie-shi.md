# 管理员的配置信息解释

> 对应的网页的URL：[http://ip:3000/admin/Omnichannel](http://172.16.17.190:3000/admin/Omnichannel)

### External Frame

<figure><img src="../.gitbook/assets/image (11).png" alt=""><figcaption></figcaption></figure>

在 Rocket.Chat 中，配置客服的 External Frame 是用来嵌入外部网页或应用到客服界面中的。这个功能可以让客服代表在与客户交流的同时，方便地查看或操作外部资源，从而提高工作效率和客户满意度。

例如，如果你有一个外部的 CRM 系统，你可以通过配置 External Frame 将其嵌入到 Rocket.Chat 的客服界面中。这样，客服代表就可以在处理客户咨询的同时，直接访问和更新客户的信息，而不需要切换到另一个应用或网页。

External Frame 的配置通常在 Rocket.Chat 的管理界面中进行，你可以指定要嵌入的网页的 URL，以及其他相关设置，如嵌入框架的大小和位置。一旦配置完成，嵌入的外部网页就会出现在客服界面的指定位置，供客服代表使用。

**目前暂时用不到，不详细追究了。**

### 一些通用的配置

<figure><img src="../.gitbook/assets/image (12).png" alt=""><figcaption></figcaption></figure>

#### 客服启用

启用前

<figure><img src="../.gitbook/assets/image (14).png" alt=""><figcaption></figcaption></figure>

启用后

<figure><img src="../.gitbook/assets/image (13).png" alt=""><figcaption></figcaption></figure>

#### 在会话结束时请求评价

启用前

<figure><img src="../.gitbook/assets/image (15).png" alt=""><figcaption></figcaption></figure>

启用后

<figure><img src="../.gitbook/assets/image (16).png" alt=""><figcaption></figcaption></figure>

#### 访客计数器

设置一个起始值，随着访客数量的增多，递增。

#### 客服聊天室计数

设置一个起始值，随着访客新增room的数量的增多，递增。

#### 客服空闲时接受新的用户聊天请求

下面是对应的检索条件

如果settings.get('Livechat\_enabled\_when\_agent\_idle') === false不成立，会将处于away状态的statusConnection检索出来

如果settings.get('Livechat\_enabled\_when\_agent\_idle') === false成立，会将不处于away状态的statusConnection检索出来

```javascript
...(settings.get('Livechat_enabled_when_agent_idle') === false && {
		statusConnection: { $ne: 'away' },
	}),
```

#### 新客服聊天室的连续声音通知

**目前暂时用不到，不详细追究了。**

#### 文件上传已启用

启用前

<figure><img src="../.gitbook/assets/image (1) (1).png" alt=""><figcaption></figcaption></figure>

启用后

<figure><img src="../.gitbook/assets/image (2).png" alt=""><figcaption></figcaption></figure>

#### 询问访问者是否会在聊天结束后收到抄本

如此配置：![](<../.gitbook/assets/image (4).png>)

前段效果：

<figure><img src="../.gitbook/assets/image (3).png" alt=""><figcaption></figcaption></figure>

功能介绍：

点击是的话，会通过用户填写的email将聊天记录发送到对应的email上。

### 即时聊天

<figure><img src="../.gitbook/assets/image (5).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../.gitbook/assets/image (6).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../.gitbook/assets/image (7).png" alt=""><figcaption></figcaption></figure>

#### 聊天室标题&聊天室背景颜色&启用字数限制

配置后如下图所示：

<figure><img src="../.gitbook/assets/image (8).png" alt=""><figcaption></figcaption></figure>

#### 显示离线表单

启用前

<figure><img src="../.gitbook/assets/image (9).png" alt=""><figcaption></figcaption></figure>

启用后

<figure><img src="../.gitbook/assets/image (10).png" alt=""><figcaption></figcaption></figure>

#### 验证邮箱&离线表单不可用提示信息&标题&颜色&说明&用于发送离线消息的电子邮件地址&离线成功消息&允许访客切换部门

**目前来看暂时不用，不深究**

#### 显示代理信息&显示代理邮件

启用前

<figure><img src="../.gitbook/assets/image (23).png" alt=""><figcaption></figcaption></figure>

启用后

<figure><img src="../.gitbook/assets/image (24).png" alt=""><figcaption></figcaption></figure>

#### 会话完成时的消息&会话完成时的文本

<figure><img src="../.gitbook/assets/image (27).png" alt=""><figcaption></figcaption></figure>

#### 显示预注册表单&显示名称字段&显示电子邮件字段

启用前

<figure><img src="../.gitbook/assets/image (28).png" alt=""><figcaption></figcaption></figure>

启用后

<figure><img src="../.gitbook/assets/image (17).png" alt=""><figcaption></figcaption></figure>

#### 监控更改历史于&将访客导航历史记录作为消息发送&视频通话已启用

目前暂不深究

#### 注册表单提示信息

<figure><img src="../.gitbook/assets/image (18).png" alt=""><figcaption></figcaption></figure>

#### 即时聊天允许的域名

这个可以配置允许所有域

#### 发送 Livechat 离线信息到频道&频道名称

**编辑消息**

<figure><img src="../.gitbook/assets/image (21).png" alt=""><figcaption></figcaption></figure>

**点击发送后的效果**

<figure><img src="../.gitbook/assets/image (19).png" alt=""><figcaption></figcaption></figure>

### CRM集成

稍后再测试，目前不深究

### 营业时间

<figure><img src="../.gitbook/assets/image (22).png" alt=""><figcaption></figcaption></figure>

启用营业时间选项的话，在客服管理界面配置营业时间，将会起作用。到点后，客服会自动离线。

禁用营业时间，在客服管理界面配置营业时间，不会起作用。
