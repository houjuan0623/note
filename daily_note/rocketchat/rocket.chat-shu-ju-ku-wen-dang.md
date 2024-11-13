---
icon: lemon
---

# Rocket.Chat 数据库文档

## 概述

* **版本**：RocketChat 6.9.5 对应的数据库
* **数据库类型**：MongoDB（文档数据库）
* **用途**：存储 Rocket.Chat 的所有数据，包括用户信息、聊天记录、频道信息、设置等。

## 数据库结构

### User 集合

#### Users

<table data-card-size="large" data-view="cards"><thead><tr><th>数据类型</th><th>是否必填</th><th>默认值</th><th>描述</th><th>示例</th><th align="center">字段名称</th></tr></thead><tbody><tr><td>string</td><td>Y</td><td>在users文档插入阶段自动生成</td><td>用户的唯一标识</td><td>5ZHymbkokREwqhEqB</td><td align="center">_id</td></tr><tr><td>日期 (Date)</td><td>N</td><td>无</td><td>记录用户文档的创建时间</td><td>ISODate("2024-09-07T12:08:47.264Z")</td><td align="center">createdAt</td></tr><tr><td>Object</td><td>Y (service.password 一定存在，service下的其他字段不一定)</td><td>长度大于零的字符串</td><td>存储与用户相关的各种服务配置和数据，包括密码、双因素认证、电子邮件验证和登录会话恢复等信息。</td><td><a href="rocket.chat-shu-ju-ku-wen-dang.md#service-zi-duan-jie-shi">service 字段解释</a></td><td align="center">services</td></tr><tr><td>Array</td><td>Y</td><td>正则匹配的邮箱字符串</td><td>存储用户的电子邮件地址列表，以及每个地址的验证状态。</td><td><p>[</p><p>    {</p><p>        "address" : "15290631595@163.com",<br>        "verified" : false<br>    }<br>]</p></td><td align="center">emails</td></tr><tr><td>string</td><td>N</td><td>user</td><td>指示该实体是用户 (<code>"user"</code>) 还是机器人 (<code>"bot"</code>)。</td><td>"type" : "user"</td><td align="center">type</td></tr><tr><td>Array</td><td>N</td><td>无</td><td>用户的角色</td><td>roles : [ "user", "admin" ],</td><td align="center">roles</td></tr><tr><td>string</td><td>N</td><td>无</td><td>用户希望别人如何看待他们的在线状态。<a href="rocket.chat-shu-ju-ku-wen-dang.md#status-he-statusconnection-qu-bie-de-jie-shi">和statusConnection的区别。</a></td><td>"status" : "offline",</td><td align="center">status</td></tr><tr><td>日期 (Date)</td><td>N</td><td>无</td><td>用户信息的更新时间</td><td>ISODate("2024-09-08T02:17:16.639Z")</td><td align="center">_updatedAt</td></tr><tr><td>string</td><td>Y</td><td>v</td><td>用户名</td><td>sec</td><td align="center">name</td></tr><tr><td>日期 (Date)</td><td>N</td><td>无</td><td>用户最后一次登录的时间</td><td>ISODate("2024-09-07T15:22:31.447Z")</td><td align="center">lastLogin</td></tr><tr><td>string</td><td>N</td><td>无</td><td>用户与服务器的真实连接情况。<a href="rocket.chat-shu-ju-ku-wen-dang.md#status-he-statusconnection-qu-bie-de-jie-shi">和status的区别。</a></td><td>"statusConnection" : "offline"</td><td align="center">statusConnection</td></tr><tr><td>string</td><td>Y</td><td>长度大于零的字符串</td><td>用户登录名</td><td>"username" : "wkq"</td><td align="center">username</td></tr><tr><td>number</td><td>N</td><td>无</td><td>用户的时区偏移量</td><td>"utcOffset" : 8</td><td align="center">utcOffset</td></tr><tr><td>Array</td><td>N</td><td>无</td><td></td><td>[ "GENERAL" ]</td><td align="center">__rooms</td></tr><tr><td></td><td></td><td></td><td></td><td></td><td align="center">banners</td></tr></tbody></table>

### Users 备注

#### service 字段解释

* **password** (对象)
  * **bcrypt** (字符串)：存储经过 bcrypt 哈希算法加密后的用户密码。
* **email2fa** (对象)
  * **enabled** (布尔值)：指示双因素认证是否启用。
  * **changedAt** (日期)：记录双因素认证设置最后更改的时间。
* **email** (对象)
  * **verificationTokens** (数组)：存储电子邮件验证令牌。
    * **token** (字符串)：用于验证电子邮件地址的唯一令牌。
    * **address** (字符串)：待验证的电子邮件地址。
    * **when** (日期)：生成验证令牌的时间。
* **resume** (对象)
  * **loginTokens** (数组)：存储用于恢复登录会话的令牌。
    * **when** (日期)：生成登录令牌的时间。
    * **hashedToken** (字符串)：经过哈希处理的登录令牌。
    * **twoFactorAuthorizedHash** (字符串)：用于验证双因素认证的哈希值（如果有）。
    * **twoFactorAuthorizedUntil** (日期)：双因素认证授权的有效期（如果有）

#### status 和 statusConnection 区别的解释

* `status` 反映用户希望别人如何看待他们的在线状态（主观）。
* `statusConnection` 反映用户与服务器的真实连接情况（客观）。

### Subscriptions 集合

| 字段名称                    | 数据类型     | 是否必填 | 默认值 | 描述                | 示例                                                                                                       |
| ----------------------- | -------- | ---- | --- | ----------------- | -------------------------------------------------------------------------------------------------------- |
| banners                 | Array    | 否    | \[] | 存放 banner 图片信息的数组 | \[{ "imageUrl": "url1", "link": "link1" }, { "imageUrl": "url2", "link": "link2" }]                      |
| u                       | Object   | 是    |     | 订阅用户的信息           | { "\_id": "userId1", "username": "user1", "name": "User One" }                                           |
| v                       | Object   | 否    |     | 订阅访客的信息 (如果有)     | { "\_id": "userId2", "username": "user2", "name": "User Two", "status": "online", "token": "someToken" } |
| rid                     | RoomID   | 是    |     | 房间 ID             | "roomId1"                                                                                                |
| open                    | Boolean  | 是    |     | 订阅是否打开            | true                                                                                                     |
| ts                      | Date     | 是    |     | 订阅创建时间            | 2024-10-12T12:00:00Z                                                                                     |
| name                    | String   | 是    |     | 订阅名称              | "Channel Name"                                                                                           |
| alert                   | Boolean  | 否    |     | 是否开启通知            | true                                                                                                     |
| unread                  | Number   | 是    |     | 未读消息数量            | 5                                                                                                        |
| t                       | RoomType | 是    |     | 房间类型              | "c" (代表频道)                                                                                               |
| ls                      | Date     | 是    |     | 最后一次查看时间          | 2024-10-12T10:00:00Z                                                                                     |
| f                       | Boolean  | 否    |     | 是否收藏              | true                                                                                                     |
| lr                      | Date     | 是    |     | 最后一次回复时间          | 2024-10-12T11:00:00Z                                                                                     |
| hideUnreadStatus        | Boolean  | 否    |     | 是否隐藏未读状态          | true                                                                                                     |
| hideMentionStatus       | Boolean  | 否    |     | 是否隐藏提及状态          | true                                                                                                     |
| teamMain                | Boolean  | 否    |     | 是否是团队主频道          | true                                                                                                     |
| teamId                  | String   | 否    |     | 团队 ID             | "teamId1"                                                                                                |
| userMentions            | Number   | 是    |     | 用户提及次数            | 2                                                                                                        |
| groupMentions           | Number   | 是    |     | 群组提及次数            | 1                                                                                                        |
| broadcast               | Boolean  | 否    |     | 是否是广播频道           | true                                                                                                     |
| tunread                 | Array    | 否    |     | 线程未读消息数           | \["threadId1", "threadId2"]                                                                              |
| tunreadGroup            | Array    | 否    |     | 线程群组未读消息数         | \["groupId1"]                                                                                            |
| tunreadUser             | Array    | 否    |     | 线程用户未读消息数         | \["userId1"]                                                                                             |
| prid                    | RoomID   | 否    |     | 父房间 ID            | "roomId2"                                                                                                |
| roles                   | Array    | 否    |     | 用户在房间中的角色 ID 列表   | \["roleId1", "roleId2"]                                                                                  |
| onHold                  | Boolean  | 否    |     | 订阅是否处于保持状态        | true                                                                                                     |
| encrypted               | Boolean  | 否    |     | 房间是否加密            | true                                                                                                     |
| E2EKey                  | String   | 否    |     | 端到端加密密钥           | "encryptionKey"                                                                                          |
| E2ESuggestedKey         | String   | 否    |     | 端到端加密建议密钥         | "suggestedKey"                                                                                           |
| unreadAlert             | String   | 否    |     | 未读消息提醒设置          | "mentions"                                                                                               |
| fname                   | String   | 否    |     | 房间友好名称            | "Friendly Channel Name"                                                                                  |
| code                    | unknown  | 否    |     |                   |                                                                                                          |
| archived                | Boolean  | 否    |     | 房间是否已归档           | true                                                                                                     |
| audioNotificationValue  | String   | 否    |     | 音频通知值             | "notificationSound"                                                                                      |
| desktopNotifications    | String   | 否    |     | 桌面通知设置            | "mentions"                                                                                               |
| mobilePushNotifications | String   | 否    |     | 移动推送通知设置          | "all"                                                                                                    |
| emailNotifications      | String   | 否    |     | 邮件通知设置            | "nothing"                                                                                                |
| userHighlights          | Array    | 否    |     | 用户高亮关键词           | \["keyword1", "keyword2"]                                                                                |
| blocked                 | unknown  | 否    |     |                   |                                                                                                          |
| blocker                 | unknown  | 否    |     |                   |                                                                                                          |
| autoTranslate           | Boolean  | 否    |     | 是否自动翻译            | true                                                                                                     |
| autoTranslateLanguage   | String   | 否    |     | 自动翻译语言            | "en"                                                                                                     |
| disableNotifications    | Boolean  | 否    |     | 是否禁用通知            | true                                                                                                     |
| muteGroupMentions       | Boolean  | 否    |     | 是否静音群组提及          | true                                                                                                     |
| ignored                 | Array    | 否    |     | 忽略的用户 ID 列表       | \["userId3"]                                                                                             |
| department              | unknown  | 否    |     |                   |                                                                                                          |
| desktopPrefOrigin       | String   | 否    |     | 桌面通知设置来源          | "user"                                                                                                   |
| mobilePrefOrigin        | String   | 否    |     | 移动通知设置来源          | "subscription"                                                                                           |
| emailPrefOrigin         | String   | 否    |     | 邮件通知设置来源          | "user"                                                                                                   |
| customFields            | Object   | 否    |     | 自定义字段             | { "field1": "value1", "field2": "value2" }                                                               |

### Subscriptions 备注

**Subscriptions集合记录用户和房间之间的订阅关系。**

### Messages 集合

| 字段名称              | 数据类型                                                                                                   | 是否必填                                                                                            | 默认值         | 描述                     | 示例                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | ----------- | ---------------------- | ------------------------------------------------------------------------------- |
| `_id`             | `string`                                                                                               | 是                                                                                               | -           | 消息的唯一 ID               | `aBcDeFgH12345678`                                                              |
| `_updatedAt`      | `Date`                                                                                                 | 是                                                                                               | -           | 消息最后更新时间               | `2024-10-18T14:30:00.000Z`                                                      |
| `rid`             | `RoomID`                                                                                               | 是                                                                                               | -           | 房间 ID，消息所属的房间          | `aBcDeFgH12345678`                                                              |
| `msg`             | `string`                                                                                               | 是                                                                                               | -           | 消息内容                   | `Hello, world!`                                                                 |
| `tmid`            | `string`                                                                                               | 否                                                                                               | -           | 线程消息 ID，用于标识消息所属的线程    | `aBcDeFgH12345678`                                                              |
| `tshow`           | `boolean`                                                                                              | 否                                                                                               | -           | 线程消息是否显示，与 `tmid` 配合使用 | `true`                                                                          |
| `ts`              | `Date`                                                                                                 | 是                                                                                               | -           | 消息发送时间                 | `2024-10-18T14:30:00.000Z`                                                      |
| `mentions`        | `MessageMention[]`                                                                                     | 否                                                                                               | -           | @ 提及的用户列表              | `[{ _id: 'userId1', username: 'user1' }]`                                       |
| `groupable`       | `boolean`                                                                                              | 否                                                                                               | `true`      | 消息是否可分组                | `false`                                                                         |
| `channels`        | \`Pick\<IRoom, '\_id' \\                                                                               | 'name'>\[]\`                                                                                    | 否           | -                      | 消息所属的频道列表，包含频道 ID 和名称                                                           |
| `u`               | \`Required\<Pick\<IUser, '\_id' \\                                                                     | 'username'>> & Pick\<IUser, 'name'>\`                                                           | 是           | -                      | 发送者信息，包含发送者 ID、用户名和可选的姓名                                                        |
| `alias`           | `string`                                                                                               | 否                                                                                               | -           | 发送者别名                  | Jindun.Bot                                                                      |
| `_hidden`         | `boolean`                                                                                              | 否                                                                                               | `false`     | 消息是否隐藏                 | `true`                                                                          |
| `imported`        | `boolean`                                                                                              | 否                                                                                               | `false`     | 消息是否导入                 | `true`                                                                          |
| `replies`         | `IUser['_id'][]`                                                                                       | 否                                                                                               | -           | 回复该消息的用户 ID 列表         | `['userId2', 'userId3']`                                                        |
| `location`        | `{ type: 'Point', coordinates: [number, number] }`                                                     | 否                                                                                               | -           | 消息发送位置，包含位置类型和坐标       | `{ type: 'Point', coordinates: [1.3521, 103.8198] }`                            |
| `starred`         | `{ _id: IUser['_id'] }[]`                                                                              | 否                                                                                               | -           | 收藏该消息的用户列表，包含收藏者 ID    | `[{ _id: 'userId2' }]`                                                          |
| `pinned`          | `boolean`                                                                                              | 否                                                                                               | `false`     | 消息是否置顶                 | `true`                                                                          |
| `pinnedAt`        | `Date`                                                                                                 | 否                                                                                               | -           | 消息置顶时间                 | `2024-10-18T15:00:00.000Z`                                                      |
| `pinnedBy`        | \`Pick\<IUser, '\_id' \\                                                                               | 'username'>\`                                                                                   | 否           | -                      | 置顶消息的用户，包含置顶者 ID 和用户名                                                           |
| `unread`          | `boolean`                                                                                              | 否                                                                                               | -           | 消息是否未读                 | `true`                                                                          |
| `temp`            | `boolean`                                                                                              | 否                                                                                               | `false`     | 消息是否临时                 | `true`                                                                          |
| `drid`            | `RoomID`                                                                                               | 否                                                                                               | -           | 直接消息房间 ID，用于直接消息       | `aBcDeFgH12345678`                                                              |
| `tlm`             | `Date`                                                                                                 | 否                                                                                               | -           | 最后一条消息时间               | `2024-10-18T16:00:00.000Z`                                                      |
| `dcount`          | `number`                                                                                               | 否                                                                                               | -           | 直接消息计数                 | `10`                                                                            |
| `tcount`          | `number`                                                                                               | 否                                                                                               | -           | 线程消息计数                 | `5`                                                                             |
| `t`               | `MessageTypesValues`                                                                                   | 否                                                                                               | -           | 消息类型                   | `'uj'`                                                                          |
| `e2e`             | \`'pending' \\                                                                                         | 'done'\`                                                                                        | 否           | -                      | 端到端加密状态                                                                         |
| `otrAck`          | `string`                                                                                               | 否                                                                                               | -           | OTR 确认                 | `'acknowledged'`                                                                |
| `urls`            | `MessageUrl[]`                                                                                         | 否                                                                                               | -           | 消息中的 URL 列表            | `[{ url: 'https://jindun.chat', title: 'Jindun.Chat' }]`                        |
| `actionLinks`     | `{ icon: keyof typeof Icons; i18nLabel: unknown; label: string; method_id: string; params: string }[]` | 否                                                                                               | -           | 操作链接，已弃用               | -                                                                               |
| `file`            | `FileProp`                                                                                             | 否                                                                                               | -           | 文件信息，已弃用，推荐使用 `files`  | -                                                                               |
| `fileUpload`      | `{ publicFilePath: string; type?: string; size?: number }`                                             | 否                                                                                               | -           | 文件上传信息                 | `{ publicFilePath: '/uploads/default/fileId1', type: 'image/png', size: 1024 }` |
| `files`           | `FileProp[]`                                                                                           | 否                                                                                               | -           | 文件信息列表                 | `[{ _id: 'fileId1', name: 'image.png' }]`                                       |
| `attachments`     | `MessageAttachment[]`                                                                                  | 否                                                                                               | -           | 附件列表                   | `[{ title: 'Attachment Title', text: 'Attachment Text' }]`                      |
| `reactions`       | \`{ \[key: string]: { names?: (string \\                                                               | undefined)\[]; usernames: string\[]; federationReactionEventIds?: Record\<string, string> } }\` | 否           | -                      | 表情回复                                                                            |
| `private`         | `boolean`                                                                                              | 否                                                                                               | `false`     | 消息是否私密                 | `true`                                                                          |
| `bot`             | `boolean`                                                                                              | 否                                                                                               | `false`     | 消息是否由机器人发送             | `true`                                                                          |
| `sentByEmail`     | `boolean`                                                                                              | 否                                                                                               | `false`     | 消息是否通过邮件发送             | `true`                                                                          |
| `webRtcCallEndTs` | `Date`                                                                                                 | 否                                                                                               | -           | WebRTC 通话结束时间          | `2024-10-18T17:00:00.000Z`                                                      |
| `role`            | `string`                                                                                               | 否                                                                                               | -           | 角色                     | `'admin'`                                                                       |
| `avatar`          | `string`                                                                                               | 否                                                                                               | -           | 头像                     | `/avatar/userId1`                                                               |
| `emoji`           | `string`                                                                                               | 否                                                                                               | -           | 表情符号                   | `:smile:`                                                                       |
| `tokens`          | `Token[]`                                                                                              | 否                                                                                               | -           | 令牌                     | `[{ token: 'token1', type: 'bot' }]`                                            |
| `html`            | `string`                                                                                               | 否                                                                                               | -           | HTML 内容                | `<p>This is a message with <b>HTML</b>.</p>`                                    |
| `token`           | `string`                                                                                               | 否                                                                                               | -           | 令牌                     | `'token1'`                                                                      |
| `federation`      | `{ eventId: string }`                                                                                  | 否                                                                                               | -           | 联邦信息                   | `{ eventId: 'eventId1' }`                                                       |
| `slaData`         | \`{ definedBy: Pick\<IUser, '\_id' \\                                                                  | 'username'>; sla?: Pick\<IOmnichannelServiceLevelAgreements, 'name'> }\`                        | 否           | -                      | 服务级别协议数据                                                                        |
| `priorityData`    | \`{ definedBy: Pick\<IUser, '\_id' \\                                                                  | 'username'>; priority?: Pick\<ILivechatPriority, 'name' \\                                      | 'i18n'> }\` | 否                      | -                                                                               |
| `customFields`    | `IMessageCustomFields`                                                                                 | 否                                                                                               | -           | 自定义字段                  | `{ field1: 'value1', field2: 'value2' }`                                        |

### Messages 备注

`imported` 字段用于标识消息是否是从外部系统导入到 Rocket.Chat 的。

### Settings 集合

| 字段名称                  | 数据类型                                 | 是否必填                | 默认值 | 描述              | 示例                                            |
| --------------------- | ------------------------------------ | ------------------- | --- | --------------- | --------------------------------------------- |
| `_id`                 | `SettingId`                          | 是                   | -   | 设置项的唯一 ID       | `Accounts_RegistrationForm`                   |
| `_updatedAt`          | `Date`                               | 是                   | -   | 设置项最后更新时间       | `2024-10-18T00:00:00.000Z`                    |
| `type`                | `String`                             | 是                   | -   | 设置的类型           | `'boolean'`                                   |
| `public`              | `boolean`                            | 是                   | -   | 设置项是否公开         | `true`                                        |
| `env`                 | `boolean`                            | 是                   | -   | 设置项是否为环境变量      | `false`                                       |
| `group`               | `GroupId`                            | 否                   | -   | 设置项所属分组的 ID     | `'General'`                                   |
| `section`             | `SectionName`                        | 否                   | -   | 设置项所属部分的名称      | `'Accounts'`                                  |
| `tab`                 | `TabId`                              | 否                   | -   | 设置项所属标签页的 ID    | `'Registration'`                              |
| `i18nLabel`           | `string`                             | 是                   | -   | 设置项的国际化标签       | `'Registration Form'`                         |
| `value`               | `SettingValue`                       | 是                   | -   | 设置项的值           | `'On'`                                        |
| `packageValue`        | `SettingValue`                       | 是                   | -   | 设置项的包默认值        | `'On'`                                        |
| `blocked`             | `boolean`                            | 是                   | -   | 设置项是否被阻止        | `false`                                       |
| `enableQuery`         | `EnableQuery`                        | 否                   | -   | 启用此设置项的查询条件     | `{ _id: 'LDAP_Enable', value: true }`         |
| `displayQuery`        | `EnableQuery`                        | 否                   | -   | 显示此设置项的查询条件     | `{ _id: 'LDAP_Enable', value: true }`         |
| `sorter`              | `number`                             | 是                   | -   | 设置项的排序值         | `10`                                          |
| `properties`          | `unknown`                            | 否                   | -   | 设置项的额外属性        | `{ type: 'user' }`                            |
| `enterprise`          | `boolean`                            | 否                   | -   | 设置项是否为企业版功能     | `true`                                        |
| `requiredOnWizard`    | `boolean`                            | 否                   | -   | 设置项是否在向导中必填     | `true`                                        |
| `hidden`              | `boolean`                            | 否                   | -   | 设置项是否隐藏         | `false`                                       |
| `modules`             | `Array<string>`                      | 否                   | -   | 设置项相关的模块        | `['ldap']`                                    |
| `invalidValue`        | `SettingValue`                       | 否                   | -   | 设置项的无效值         | `'Off'`                                       |
| `valueSource`         | `'packageValue'` \\                  | `'processEnvValue'` | 否   | -               | 设置项值的来源                                       |
| `secret`              | `boolean`                            | 否                   | -   | 设置项的值是否为机密      | `true`                                        |
| `i18nDescription`     | `string`                             | 否                   | -   | 设置项的国际化描述       | `'Enable LDAP authentication'`                |
| `autocomplete`        | `boolean`                            | 否                   | -   | 设置项是否支持自动完成     | `true`                                        |
| `processEnvValue`     | `SettingValue`                       | 否                   | -   | 设置项的环境变量值       | `'ldap://localhost'`                          |
| `meteorSettingsValue` | `SettingValue`                       | 否                   | -   | 设置项的 Meteor 设置值 | `'ldap://localhost'`                          |
| `ts`                  | `Date`                               | 是                   | -   | 设置项的创建时间        | `2024-10-18T00:00:00.000Z`                    |
| `createdAt`           | `Date`                               | 是                   | -   | 设置项的创建时间        | `2024-10-18T00:00:00.000Z`                    |
| `multiline`           | `boolean`                            | 否                   | -   | 设置项的值是否允许多行     | `true`                                        |
| `values`              | `Array<ISettingSelectOption>`        | 否                   | -   | 设置项的可选值列表       | `[{ key: 'option1', i18nLabel: 'Option 1' }]` |
| `placeholder`         | `string`                             | 否                   | -   | 设置项的占位符文本       | `'Enter your LDAP server address'`            |
| `lookupEndpoint`      | `string`                             | 否                   | -   | 设置项的查找端点        | `/api/v1/ldap/test`                           |
| `wizard`              | `{ step: number; order: number }` \\ | `null`              | 否   | -               | 设置项在向导中的步骤和顺序                                 |
| `persistent`          | `boolean`                            | 否                   | -   | 设置项是否持久化        | `true`                                        |
| `readonly`            | `boolean`                            | 否                   | -   | 设置项是否只读         | `false`                                       |
| `alert`               | `string`                             | 否                   | -   | 设置项的警告信息        | `'This setting is deprecated'`                |
| `private`             | `boolean`                            | 否                   | -   | 设置项是否私有         | `false`                                       |

### Settings 备注

在 Rocket.Chat 的 settings 数据库中，`packageValue` 和 `value` 字段都用于存储设置项的值，但它们代表不同的含义：

* **`packageValue`**: 表示该设置项的 **默认值**，由 Rocket.Chat 或者相关 package **预先定义**。当一个设置项被创建时，`packageValue` 会被首先赋给 `value` 字段。仅仅在在数据库初始化的时候会被赋一次值。
* **`value`**: 表示该设置项的 **当前值**，即 **实际生效** 的值。用户可以通过管理界面或者 API 修改 `value`，使其与 `packageValue` 不同。

***

`invalidValue` 字段用于指定某个设置项的无效值，主要用于**表单验证**和**错误提示**。

在 Rocket.Chat 中，部分设置项对允许的值有限制，例如：

* 布尔型设置项只能是 `true` 或 `false`
* 枚举型设置项只能是预定义的几个值之一

当用户 attempts to 保存一个无效值时，Rocket.Chat 会使用 `invalidValue` 字段进行校验，如果用户输入的值与 `invalidValue` 匹配，则会提示错误信息，阻止用户保存无效的设置。

**代码分析:**

`if (isSettingEnterprise(settingFromCode) && !('invalidValue' in settingFromCode)) { ... }` 这段代码用于检查企业版设置项是否缺少 `invalidValue` 选项。

* `isSettingEnterprise(settingFromCode)`: 检查 `settingFromCode` 是否是企业版设置项。
* `!('invalidValue' in settingFromCode)`: 检查 `settingFromCode` 是否包含 `invalidValue` 属性。

如果 `settingFromCode` 是企业版设置项，并且不包含 `invalidValue` 属性，则会记录错误信息并抛出异常。

**原因:**

企业版设置项通常包含更复杂的逻辑和限制，因此更需要 `invalidValue` 字段进行验证，确保用户输入的值有效。这段代码强制要求所有企业版设置项都必须定义 `invalidValue`，否则会报错，从而提高代码的健壮性和安全性。

***

**1. `multiSelect`**

`multiSelect` 用于表示设置项的值可以是 **多个选项**。例如，Rocket.Chat 中有一个设置项 `Accounts_AllowedDomainsList`，用于限制允许用户注册的邮箱域名。该设置项的 `type` 为 `multiSelect`，用户可以选择多个域名，例如 `gmail.com`、`outlook.com`、`qq.com` 等。

**示例:**

JSON

```
{
  "_id": "Accounts_AllowedDomainsList",
  "type": "multiSelect",
  "value": ["gmail.com", "outlook.com", "qq.com"]
}
```

请谨慎使用代码。

**2. `roomPick`**

`roomPick` 用于表示设置项的值是一个或多个 **房间**。例如，Rocket.Chat 中有一个设置项 `Livechat_Routing_Method`，用于配置客服系统的路由方法。该设置项的 `type` 为 `roomPick`，用户可以选择一个或多个房间作为客服接待室。

**示例:**

JSON

```
{
  "_id": "Livechat_Routing_Method",
  "type": "roomPick",
  "value": [
    {
      "_id": "roomId1",
      "name": "Support Channel 1"
    },
    {
      "_id": "roomId2",
      "name": "Support Channel 2"
    }
  ]
}
```

请谨慎使用代码。

**区别:**

* `multiSelect` 的选项通常是预定义的字符串或枚举值，而 `roomPick` 的选项是 Rocket.Chat 中存在的房间。
* `multiSelect` 的值是一个字符串数组，而 `roomPick` 的值是一个包含房间 ID 和名称的对象数组。

### Rooms 集合

| 字段名称          | 数据类型     | 是否必填 | 默认值     | 描述                          | 示例                                                     |
| ------------- | -------- | ---- | ------- | --------------------------- | ------------------------------------------------------ |
| `_id`         | ObjectId | 是    | 自动生成    | MongoDB文档的唯一标识符             | 5f9e8a7c8b7c6f0e8a7c8b7c                               |
| `name`        | String   | 否    |         | 房间名称                        | "general"                                              |
| `default`     | Boolean  | 否    | `false` | 是否为默认房间                     | `true`/`false`                                         |
| `featured`    | Boolean  | 否    | `false` | 是否为特色房间                     | `true`/`false`                                         |
| `muted`       | Array    | 否    | `[]`    | 被用户静音的房间通知类型                | `["channel", "mentions"]`                              |
| `u._id`       | ObjectId | 是    |         | 房间创建者的用户ID                  | 5f9e8a7c8b7c6f0e8a7c8b7d                               |
| `ts`          | Date     | 是    |         | 房间创建时间                      | 2023-10-27T10:00:00.000Z                               |
| `prid`        | ObjectId | 否    |         | 父房间ID (用于讨论组)               | 5f9e8a7c8b7c6f0e8a7c8b7e                               |
| `fname`       | String   | 否    |         | 房间完整名称 (用于讨论组)              | "讨论组 1"                                                |
| `uids`        | Array    | 否    |         | 直接消息中所有用户的ID                | `[5f9e8a7c8b7c6f0e8a7c8b7d, 5f9e8a7c8b7c6f0e8a7c8b7f]` |
| `createdOTR`  | Date     | 否    |         | OTR (Off-the-Record) 会话创建时间 | 2023-10-27T10:00:00.000Z                               |
| `encrypted`   | Boolean  | 否    | `false` | 是否为加密房间                     | `true`/`false`                                         |
| `broadcast`   | Boolean  | 否    | `false` | 是否为广播房间                     | `true`/`false`                                         |
| `teamId`      | ObjectId | 否    |         | 房间所属团队ID                    | 5f9e8a7c8b7c6f0e8a7c8b80                               |
| `teamDefault` | Boolean  | 否    | `false` | 是否为团队默认房间                   | `true`/`false`                                         |
| `t`           | String   | 是    |         | 房间类型                        | "c" (频道), "d" (讨论组), "p" (私聊)                          |

### Rooms 备注

*   default字段：default为true是指默认房间，默认房间是指用户在创建帐户后自动加入的房间。

    **默认房间的作用:**

    * **方便用户入门:** 新用户可以立即开始与其他成员交流，而无需手动查找或加入房间。
    * **提供公告和重要信息:** 管理员可以使用默认房间发布公告、通知或其他重要信息，确保所有用户都能看到。
    * **促进社区建设:** 默认房间可以作为用户聚集和交流的中心场所，帮助建立社区意识和归属感。

### Uploads &  UserDataFiles集合

| 字段名称                 | 数据类型    | 是否必填 | 默认值   | 描述                                                    | 示例                                                             |
| -------------------- | ------- | ---- | ----- | ----------------------------------------------------- | -------------------------------------------------------------- |
| `_id`                | string  | 是    | 系统生成  | 文件的唯一标识符                                              | "aBcDeFgH1jKlMnO"                                              |
| `typeGroup`          | string  | 否    |       | 文件类型分组，例如 "image", "audio", "video" 等                 | "image"                                                        |
| `description`        | string  | 否    |       | 文件的描述信息                                               | "产品设计图"                                                        |
| `type`               | string  | 否    |       | 文件的 MIME 类型，例如 "image/png", "application/pdf" 等       | "image/jpeg"                                                   |
| `name`               | string  | 否    |       | 文件的原始名称                                               | "设计稿.jpg"                                                      |
| `aliases`            | string  | 否    |       | 文件的别名                                                 | "logo"                                                         |
| `extension`          | string  | 否    |       | 文件的扩展名                                                | "jpg"                                                          |
| `complete`           | boolean | 否    | false | 文件是否上传完成                                              | true                                                           |
| `rid`                | string  | 否    |       | 文件所属的房间 ID                                            | "XyZw1234"                                                     |
| `uid`                | string  | 否    |       | 文件上传用户的 ID                                            | "aBcDeFgH"                                                     |
| `uploading`          | boolean | 否    | false | 文件是否正在上传                                              | true                                                           |
| `userId`             | string  | 否    |       | 上传文件的用户 ID                                            | "aBcDeFgH"                                                     |
| `progress`           | number  | 否    | 0     | 文件上传进度，取值范围 0-100                                     | 50                                                             |
| `etag`               | string  | 否    |       | 文件的 ETag 值，用于校验文件完整性                                  | "abcdefg1234567890"                                            |
| `size`               | number  | 否    |       | 文件的大小，单位为字节                                           | 1024                                                           |
| `identify`           | object  | 否    |       | 文件的识别信息，例如图片的格式和尺寸                                    | `{ "format": "jpg", "size": { "width": 800, "height": 600 } }` |
| `store`              | string  | 否    |       | 文件存储方式，例如 "FileSystem", "AmazonS3", "GoogleStorage" 等 | "FileSystem"                                                   |
| `path`               | string  | 否    |       | 文件存储路径                                                | "/uploads/abc.jpg"                                             |
| `token`              | string  | 否    |       | 文件的访问令牌                                               | "xyz123"                                                       |
| `uploadedAt`         | Date    | 否    |       | 文件上传时间                                                | 2024-10-29T10:00:00.000Z                                       |
| `modifiedAt`         | Date    | 否    |       | 文件修改时间                                                | 2024-10-29T11:00:00.000Z                                       |
| `url`                | string  | 否    |       | 文件的访问 URL                                             | "\[移除了无效网址]"                                                   |
| `originalStore`      | string  | 否    |       | 原始文件存储方式                                              | "FileSystem"                                                   |
| `originalId`         | string  | 否    |       | 原始文件的 ID                                              | "aBcDeFgH1jKlMnO"                                              |
| `message_id`         | string  | 否    |       | 文件关联的消息 ID                                            | "mNoPqRsT"                                                     |
| `instanceId`         | string  | 否    |       | Rocket.Chat 实例 ID                                     | "rocketchat-instance-1"                                        |
| `AmazonS3`           | object  | 否    |       | Amazon S3 存储信息                                        | `{ "path": "/uploads/abc.jpg" }`                               |
| `s3`                 | object  | 否    |       | Amazon S3 存储信息 (同 `AmazonS3`)                         | `{ "path": "/uploads/abc.jpg" }`                               |
| `GoogleStorage`      | object  | 否    |       | Google Cloud Storage 存储信息                             | `{ "path": "/uploads/abc.jpg" }`                               |
| `googleCloudStorage` | object  | 否    |       | Google Cloud Storage 存储信息 (同 `GoogleStorage`)         | `{ "path": "/uploads/abc.jpg" }`                               |
| `Webdav`             | object  | 否    |       | WebDAV 存储信息                                           | `{ "path": "/uploads/abc.jpg" }`                               |

### Uploads & UserDataFiles备注

**uploads 集合：**

* 主要存储 **用户上传的与消息相关的文件**，例如图片、视频、文档等。这些文件通常在聊天会话中发送和共享。
* 文件可以存储在不同的位置，包括本地文件系统、Amazon S3、Google Cloud Storage 和 WebDAV 等。
* `uploads` 集合中的文件通常与消息记录关联，可以通过消息 ID (`message_id` 字段) 进行查找。

**userdatafiles 集合：**

* 主要存储 **用户相关的文件数据**，例如用户头像、自定义表情、房间图标等。
* 这些文件通常与用户或房间的设置和配置相关。
* `userdatafiles` 集合中的文件通常与用户 ID (`userId` 字段) 或房间 ID (`roomId` 字段) 关联。

### Team 集合



| 字段名称         | 数据类型       | 是否必填 | 默认值  | 描述         | 示例                                              |
| ------------ | ---------- | ---- | ---- | ---------- | ----------------------------------------------- |
| `_id`        | string     | 是    | 系统生成 | 团队的唯一标识符   | "aBcDeFgH1jKlMnO"                               |
| `_updatedAt` | Date       | 是    | 系统生成 | 团队信息最后更新时间 | 2024-10-29T10:00:00.000Z                        |
| `name`       | string     | 是    | 无    | 团队名称       | "Jindun.Chat 开发团队"                              |
| `type`       | TEAM\_TYPE | 是    | 无    | 团队类型       | "PUBLIC"                                        |
| `roomId`     | string     | 是    | 无    | 团队关联的房间 ID | "XyZw1234"                                      |
| `createdBy`  | object     | 是    | 无    | 创建团队的用户    | `{ '_id': 'aBcDeFgH', 'username': 'john.doe' }` |
| `createdAt`  | Date       | 是    | 系统生成 | 团队创建时间     | 2024-10-27T10:00:00.000Z                        |

### Team 备注

* `TEAM_TYPE` 枚举类型可能包含的值： "PUBLIC", "PRIVATE"
* `createdBy` 字段包含创建者的用户 ID 和用户名。

### TeamMember 集合

| 字段名称         | 数据类型                   | 是否必填 | 默认值  | 描述            | 示例                                              |
| ------------ | ---------------------- | ---- | ---- | ------------- | ----------------------------------------------- |
| `_id`        | string                 | 是    | 系统生成 | 团队成员的唯一标识符    | "aBcDeFgH1jKlMnO"                               |
| `_updatedAt` | Date                   | 是    | 系统生成 | 团队成员信息最后更新时间  | 2024-10-29T10:00:00.000Z                        |
| `teamId`     | string                 | 是    | 无    | 团队 ID         | "XyZw1234"                                      |
| `userId`     | string                 | 是    | 无    | 用户 ID         | "aBcDeFgH"                                      |
| `roles`      | Array\<IRole\['\_id']> | 否    | \[]  | 团队成员的角色 ID 列表 | "\['admin', 'member']"                          |
| `createdBy`  | object                 | 是    | 无    | 创建该团队成员记录的用户  | `{ '_id': 'aBcDeFgH', 'username': 'john.doe' }` |
| `createdAt`  | Date                   | 是    | 系统生成 | 团队成员创建时间      | 2024-10-27T10:00:00.000Z                        |

### TeamMember 备注

* `roles` 字段是一个数组，存储了该成员在团队中扮演的角色 ID。
* `createdBy` 字段包含创建该成员记录的用户的 ID 和用户名。

### Sessions 集合

| 字段名称                | 数据类型           | 是否必填                  | 默认值           | 描述                   | 示例                                                                                                                                          |
| ------------------- | -------------- | --------------------- | ------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `_id`               | string         | 是                     | 自动生成          | 会话的唯一标识符             | "aBcDeFgH1jKlMnO"                                                                                                                           |
| `type`              | 'session' \\   | 'computed-session' \\ | 'user\_daily' | 是                    |                                                                                                                                             |
| `mostImportantRole` | string         | 是                     |               | 用户最重要的角色 ID          | "admin"                                                                                                                                     |
| `userId`            | string         | 是                     |               | 用户的唯一标识符             | "aBcDeFgH1jKlMnO"                                                                                                                           |
| `lastActivityAt`    | Date           | 否                     |               | 用户最后一次活动的时间          | 2024-11-13T10:38:00.000Z                                                                                                                    |
| `device`            | ISessionDevice | 否                     |               | 用户设备信息               | `{ "type": "desktop", "name": "Chrome", "longVersion": "119.0.0.0", "os": { "name": "Windows", "version": "10" }, "version": "119.0.0.0" }` |
| `roles`             | string\[]      | 是                     |               | 用户的角色列表              | `["user", "admin"]`                                                                                                                         |
| `year`              | number         | 是                     |               | 会话创建的年份              | 2024                                                                                                                                        |
| `month`             | number         | 是                     |               | 会话创建的月份              | 11                                                                                                                                          |
| `day`               | number         | 是                     |               | 会话创建的日期              | 13                                                                                                                                          |
| `instanceId`        | string         | 是                     |               | Rocket.Chat 实例的唯一标识符 | "aBcDeFgH1jKlMnO"                                                                                                                           |
| `sessionId`         | string         | 是                     |               | 会话的唯一标识符             | "aBcDeFgH1jKlMnO"                                                                                                                           |
| `_updatedAt`        | Date           | 是                     | 自动生成          | 会话最后更新的时间            | 2024-11-13T10:38:00.000Z                                                                                                                    |
| `createdAt`         | Date           | 是                     | 自动生成          | 会话创建的时间              | 2024-11-13T10:38:00.000Z                                                                                                                    |
| `host`              | string         | 是                     |               | 会话的主机名               | "\[移除了无效网址]"                                                                                                                                |
| `ip`                | string         | 是                     |               | 用户的 IP 地址            | "192.168.1.1"                                                                                                                               |
| `loginAt`           | Date           | 是                     |               | 用户登录的时间              | 2024-11-13T10:38:00.000Z                                                                                                                    |
| `logoutAt`          | Date           | 否                     |               | 用户登出的时间              | 2024-11-13T11:38:00.000Z                                                                                                                    |
| `closedAt`          | Date           | 否                     |               | 会话关闭的时间              | 2024-11-13T11:38:00.000Z                                                                                                                    |
| `logoutBy`          | string         | 否                     |               | 执行登出操作的用户 ID         | "aBcDeFgH1jKlMnO"                                                                                                                           |
| `loginToken`        | string         | 否                     |               | 用户登录的 token          | "aBcDeFgH1jKlMnO"                                                                                                                           |
| `searchTerm`        | string         | 是                     |               | 用户的搜索词               | "Rocket.Chat"                                                                                                                               |

**ISessionDevice 字段解析:**

| 字段名称          | 数据类型   | 是否必填 | 默认值 | 描述        | 示例                                       |
| ------------- | ------ | ---- | --- | --------- | ---------------------------------------- |
| `type`        | string | 是    |     | 设备类型      | "desktop"                                |
| `name`        | string | 是    |     | 设备名称      | "Chrome"                                 |
| `longVersion` | string | 是    |     | 设备版本号（完整） | "119.0.0.0"                              |
| `os`          | object | 是    |     | 操作系统信息    | `{ "name": "Windows", "version": "10" }` |
| `version`     | string | 是    |     | 设备版本号     | "119.0.0.0"                              |

### Sessions 备注

sessions作用：

* 存储所有活跃的会话信息，包括用户会话和客户端会话（例如，Web 客户端、移动客户端）。
* 每个文档代表一个活跃的会话，包含会话 ID、连接信息、用户 ID（如果已认证）、过期时间等。
* 用于跟踪在线用户、管理连接状态、实现消息推送等功能。

***

短连接 Accounts.onLogin -> sauEvents.emit(''accounts.login) -> SAUMonitor listen accounts.login -> Sessions.createOrUpdate。

长连接 ddp-streamer listen logged -> ddp-streamer broadcast accounts.login -> SAUMonitor listen accounts.login -> Sessions.createOrUpdate

所以长短连接都会生成session。



### UsersSession 集合

<table><thead><tr><th>字段名称</th><th>数据类型</th><th width="93">是否必填</th><th>默认值</th><th>描述</th><th>示例</th></tr></thead><tbody><tr><td>_id</td><td>string</td><td>是</td><td>由MongoDB自动生成</td><td>用户会话的唯一标识符</td><td>5f9e4a0b7c70e742b8c84a7b</td></tr><tr><td>connections</td><td>IUserSessionConnection[]</td><td>是</td><td>[]</td><td>用户会话连接的数组，记录用户在不同设备或实例上的连接信息</td><td>[{ "id": "xxx", "instanceId": "xxx", "status": "online", "_createdAt": "2023-10-26T10:00:00.000Z", "_updatedAt": "2023-10-26T11:00:00.0</td></tr></tbody></table>

**IUserSessionConnection：**

| 字段名称        | 数据类型          | 是否必填 | 默认值 | 描述                 | 示例                       |
| ----------- | ------------- | ---- | --- | ------------------ | ------------------------ |
| id          | string        | 是    |     | 会话连接的唯一标识符         | xxx                      |
| instanceId  | string        | 是    |     | Rocket.Chat 实例的 ID | xxx                      |
| status      | UserStatus 枚举 | 是    |     | 用户当前状态             | online                   |
| \_createdAt | Date          | 是    |     | 会话连接创建时间           | 2023-10-26T10:00:00.000Z |
| \_updatedAt | Date          | 是    |     | 会话连接更新时间           | 2023-10-26T11:00:00.000Z |

### UsersSessions 备注

* 专门存储已认证用户的会话信息。
* 每个文档代表一个用户的特定会话，包含会话 ID、用户 ID、连接信息、登录时间、上次活动时间等。
* 用于管理用户的登录状态、实现多设备登录、记录用户活动历史等功能。

### About OAUTH

#### OAuthAccessTokens 集合



#### OAuthAccessTokens 备注

该集合存储访问令牌 (Access Token) 以及与其相关的信息。访问令牌是颁发给客户端应用程序的凭证，允许它们在用户授权后代表用户访问受保护的资源。

#### OAuthApps 集合



#### OAuthApps 备注

该集合存储已注册的 OAuth 应用程序的信息。

#### OAuthAuthCodes 集合



#### OAuthAuthCodes 备注

该集合存储授权码 (Authorization Code) 以及与其相关的信息。授权码是 OAuth 2.0 授权码授权流程中使用的一种临时凭证，用于交换访问令牌。

#### OAuthRefreshTokens 集合



#### OAuthRefreshTokens 备注

存储刷新令牌 (Refresh Token) 以及与其相关的信息。刷新令牌用于在访问令牌过期后获取新的访问令牌，而无需用户再次进行授权。

## 数据关系

> 虽然mongoDB是非关系型数据库，但是在逻辑上，Rocketchat所设计的数据库仍具有关系。例如，Rocket.Chat 中的 `users` 集合和 `rooms` 集合之间就存在着“用户加入聊天室”的逻辑关系，尽管这种关系不是通过外键来实现的。
>
> 之所以IM聊天需要关系型数据库，但是选择了mongoDB，有如下原因：
>
> 1. Rocket.Chat 的数据结构可能会随着功能的增加而发生变化。MongoDB 的文档模型允许您灵活地添加、修改和删除字段，而无需预先定义严格的表结构。这使得 Rocket.Chat 能够更轻松地适应不断变化的需求，而无需频繁地修改数据库模式。
> 2. Rocket.Chat 旨在支持大量用户和消息。MongoDB 提供了内置的分片功能，可以将数据分布到多个服务器上，实现水平扩展，以满足 Rocket.Chat 的高性能和高可用性需求。
> 3. MongoDB 的文档模型与 JavaScript 对象非常相似，这使得开发人员可以更轻松地使用 JavaScript 或 Node.js 等技术来构建 Rocket.Chat 应用程序。
> 4. MongoDB 拥有庞大的社区和丰富的生态系统，提供了各种工具、库和资源，可以帮助开发人员更轻松地使用和管理 MongoDB 数据库。



* **users 和 rooms**：多对多关系，一个用户可以加入多个聊天室，一个聊天室可以有多个成员。
* **users 和 subscriptions**：一对多关系，一个用户可以订阅多个聊天室。

sessions和usersessions的区别：

| 特性     | sessions         | usersessions    |
| ------ | ---------------- | --------------- |
| 存储范围   | 所有活跃会话           | 已认证用户的会话        |
| 主要用途   | 跟踪在线用户、管理连接      | 管理用户登录状态、记录用户活动 |
| 与用户的关联 | 可以与用户关联，也可以是匿名会话 | 始终与特定用户关联       |
