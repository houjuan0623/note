# 🐶 TCP

## TCP 三次握手

1. 客服端发起TCP三次握手之前，服务器必须准备好接受外来的连接。通过调用socket\&bind\&listen来完成，这被称为被动打开。
2. 客户端通过connect激发三次握手的过程，这被称为主动打开。
   1. 客户端发送SYN（Synchronize Sequence Numbers）同步序列编号，告诉服务器客户端将在待建立的连接中发送的数据的初始序列号。
   2. 服务器必须确认（ACK）客服端的SYN，同时自己也发送一个SYN，其中ACK=SYN+1，告诉客户端服务器将在待建立的连接中发送的数据的初始序列号。
   3. 客户端必须发送确认（ACK），其中ACK=SYN+1。

<figure><img src=".gitbook/assets/image.png" alt=""><figcaption><p>TCP 三次握手</p></figcaption></figure>

> 什么是ACK？ACK中的确认号是发送ACK的一端所期待的下一个序列号。因为SYN已经占据一个字节的空间，所以每一个SYN对应的ACK应该是SYN+1。

## TCP 四次挥手

1. 某个进程首次调用close，我们称之为主动关闭。该端的TCP于是发送一个FIN，表示要终结当前连接。
2. 接收到这个FIN的对端执行被动关闭流程。FIN作为一个文件结束符传递给接收端应用进程（放在已排队等候处理的任何其他数据之后），因为FIN的接收意味着接收端进程在相应连接上再无额外数据可接收。
3. 一段时间之后（这段时间可长可短，应用进程用来处理FIN之前的数据），接收到文件结束符的应用进程将会调用close关闭套接字。这导致TCP会发送一个FIN。
4. 接受这个FIN的原发送端会确认这个FIN。

<figure><img src=".gitbook/assets/image (1).png" alt=""><figcaption><p>TCP四次挥手</p></figcaption></figure>

> 大部分情况下，被动关闭方会将ACK和SYN一起发送。

## 完整的TCP连接

<figure><img src=".gitbook/assets/image (4).png" alt=""><figcaption></figcaption></figure>

## TCP状态转换图

TCP涉及建立连接和连接终止的操作可以用状态转化图来表示。TCP为一个连接定义了11种状态，并且规定了如何基于当前状态转化到另一个状态。

<figure><img src=".gitbook/assets/image (3).png" alt=""><figcaption><p>TCP状态转化</p></figcaption></figure>

### TIME\_WAIT状态

**注意：执行主动关闭的一方才会有TIME\_WAIT状态。**

停留在这个状态的时间最长是2MSL（maximum segment lifetime），最长分节生命时间的两倍。MSL是指IP数据报能够在因特网中存活的最长时间。

任何TCP连接都必须为MSL选择一个值。RFC 1122的建议值是2mins，在Berkeley的实现中使用的是30s，所以TIME\_WAIT在1mins-4mins之间。

> MSL：任何IP数据报在能够在因特网中存活的最长时间。

**TIME\_WAIT 存在的理由1：可靠地实现TCP全双工连接的终止。**

在上图[#wan-zheng-de-tcp-lian-jie](tcp.md#wan-zheng-de-tcp-lian-jie "mention")中，假设ACK N+1丢失，服务器端将重新发送FIN N，因此客户端必须维护状态信息，以允许服务器发送最终的那个FIN。要是客户端不维护这个状态信息，它将响应一个RST，该分节将被服务器响应为另外一种错误。如果TCP打算彻底终止某个连接上两个方向的数据流，那么它必须正确处理终止序列中4个分节任意一个分节丢失的情况。本例中说明了处于TIME\_WAIT状态的那一端可能是不得不重新传输ACK的那一端。

**TIME\_WAIT 存在的理由2：允许老的重复分节在网络中消失。**

“迷途数据报”指在IP数据报传输过程中，刚好遇到某个异常的路由器，对于路由器来讲，最少需要花费数秒的时间自动修复链路。这段时间内，该数据报在两个路由之间循环发送（路由器A把数据报发送给路由器B，路由器B再把数据报发送给路由器A）。在此期间，发送端可能触发超时重传机制，而且这个重传的分组可能通过某条正常的链路先于“迷途数据报”到达目的地。然而不久后“迷途数据报”也达到了目的地。

假设不存在TIME\_WAIT状态，我们的TCP链接正常关闭后且又重新建立了一条和之前相同的连接（假设之前的连接是172.16.17.100:3000.172.16.17.101:3000，现在又建立的连接也是172.16.17.100:3000.172.16.17.101:3000），“迷途数据报”会将现在建立的连接误以为是之前的连接，影响新建的TCP连接。

所以需要一个TIME\_WAIT状态，且其持续时间是2MSL秒，同时TCP不允许处于TIME\_WAIT状态的连接发起和接收建立新连接的请求。

