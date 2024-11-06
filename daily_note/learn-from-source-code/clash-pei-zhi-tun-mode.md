---
icon: cat
---

# clash 配置tun mode

启动 TUN 模式需要进行如下操作：

1. 软件打开的界面未做任何设置的情况下如图所示。要启用 TUN 模式需要先安装 **Service Mode** 服务，点击后面 Manage 安装。

<figure><img src="../.gitbook/assets/image (34).png" alt=""><figcaption></figcaption></figure>

> 为什么使用tun mode需要安装service mode？
>
> 在 Clash for Windows 中，TUN 模式需要安装 Service Mode 的原因在于 TUN 模式的实现机制和权限需求。
>
> **TUN 模式的实现机制**
>
> TUN 模式的工作原理是创建一个虚拟网络适配器，并将所有网络流量都通过这个虚拟适配器进行路由。这就需要 Clash for Windows 能够深度接管系统的网络功能，而这需要更高的系统权限。
>
> **Service Mode 的作用**
>
> Service Mode 就是为了满足 TUN 模式对权限的需求而设计的。它会将 Clash for Windows 以 Windows 服务的形式运行，从而赋予其更高的系统权限，使其能够：
>
> * 创建和管理虚拟网络适配器。
> * 拦截和转发所有网络流量。
> * 修改系统路由表。
> * 访问更底层的网络接口。
>
> **为什么需要更高的权限**
>
> 如果 Clash for Windows 不以 Service Mode 运行，它将无法获得足够的权限来完成上述操作，也就无法实现 TUN 模式的功能。例如，普通用户程序无法创建虚拟网络适配器或修改系统路由表，这些操作都需要管理员权限。
>
> **总结**
>
> 简而言之，TUN 模式需要 Service Mode 的原因是为了获得更高的系统权限，以便 Clash for Windows 能够深度控制系统的网络功能，实现流量的拦截、转发和路由。

2. 点击 **Service Mode** 后的 Manage 后会弹出如图所示对话框，当前的状态显示为 **无效** 我们点击 **Install。**

<figure><img src="../.gitbook/assets/image (35).png" alt=""><figcaption></figcaption></figure>

3. Service Mode 服务安装完成后 Clash for Windows 会自动重启，**Service Mode** 后面会显示一个绿色的小地球，表示安装成功

<figure><img src="../.gitbook/assets/image (36).png" alt=""><figcaption></figcaption></figure>

4. 配置好 Clash for Windows 代理，开启 **TUN Mode** 后面的开关,然后再开启 **System Proxy** 就可以使用 TUN 代理上网了。

notice：clash有了继任者----[clash-verge-rev](https://github.com/clash-verge-rev/clash-verge-rev)

参考文章：

1. [最新 clash for windows 设置TUN模式实现真全局模式(有限真全局)](https://doc.miyun.app/app/clash-for-windows-tun/)
