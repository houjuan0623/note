# Select & Poll & Epoll

## select

select 允许进程指示内核等待多个事件中的任何一个发生，并只在有一个或多个事件发生或经历一段指定的时间后才唤醒它。

也就是说，我们调用select告知内核对哪些描述符有兴趣以及等到多长时间。我们感兴趣的描述符不局限于套接字，任何描述符都可以使用select来测试。

```c
#include <sys/select.h>
#include <sys/time.h>

int select(int maxfdp1, fd_set *readset, fd_set *write_set, fd_set *exceptset, const struct timeval *timeout);
```

**maxfdp1：**&#x6307;定待测试的描述符的个数，它的值是待测试的最大描述符加1，因此被命名为maxfdp1。比如我们对描述符1、4、5感兴趣，那么maxfdp1就是6。是6不是5的原因在于：描述符是从0开始的。

6 可以明确地告诉了内核 "我所有关心的文件描述符中，最大的那个是 `maxfdp1 - 1`，你只需要检查到这里就可以了，后面的不用管。"  这就大大缩小了内核的检查范围，尤其是在只监视少数几个小的文件描述符时，性能提升非常明显。

**fd\_set（描述符集）：**&#x72;eadset、writeset、exceptset帮助我们指定让内核监听读、写和异常的描述符。目前支持的异常条件有两个：

1. 某个套接字的带外数据到达。带外数据指的是一个连接的某端发生了重要的事情，而且希望迅速通告其对端。这里“迅速”意味着这种通知应该在已经排队等待发送的任何“普通”数据之前发送。也就是说：带外数据被认为比普通数据具有更高的优先级。
2. 某个已置为分组模式的伪终端存在可从其主端读取的控制状态信息。
   * **伪终端（pseudo-terminal）**： 是一种软件模拟的终端设备，通常由一对主从设备组成。主设备用于控制终端的行为，从设备用于模拟实际的终端。
   * **分组模式（packet mode）**： 是一种伪终端的特殊操作模式，在这种模式下，终端输入和输出的数据以数据包（packet）的形式进行传输，而不是逐个字符传输。
   * **主设备（master side）**： 伪终端的主设备，用于控制终端的行为，例如设置终端属性、发送信号等。
   * **控制状态信息**： 指的是关于伪终端当前状态的信息，例如终端大小、波特率、输入模式等。

由以下四个宏负责操作描述符集：

```c
void FD_ZERO(fd_set *fdset);  /* clear all bite in fdset */
void FD_SET(int fd, fd_set *fdset);  /* turn on the bit for fd in fdset */
void FD_CLR(int fd, fd_set *fdset);  /* turn off the bit for fd in fdest */
int FD_ISSET(int fd, fd_set *fdset);  /* is the bit for fd on in fdset? */
```

举个例子，我们用下面的代码顶一个一个fd\_set类型变量，然后打开描述符1、4、5的对应位：

```c
fd_set rset;
FD_ZERO(&rset);  /* 初始化rset，将rset中是所有的位置置为0 */
FD_SET(1, &rset);  /* 在rset中打开描述符1，rset中可以记录1024（一般是1024）个描述符，rset在1对应的位置置为1 */
FD_SET(4, &rset);
FD_SET(5, &rset);
```

select中间的三个参数，如果我们对某个条件不感兴趣，可以将其置为空指针。

**timeout：**&#x544A;知内核等待所指定描述符中的任何一个描述符就绪的最长时间。其中timeval结构用于指定这段时间的秒数和微秒数。

```c
struct timeval{
    long tv_sec;  /* seconds */
    long tv_usec;  /* microseconds */
}
```

这个参数有三个可能：

1. 永远等待下去：仅在有一个描述符准备好I/O以后才返回。此时该参数对应空指针。
2. 等待一个固定的时间：在有一个描述符准备好I/O时才返回，但是不超过由该参数所指向的time\_val结构中指定的秒数和微秒数。
3. 根本不等待：检查描述符后立即返回，这称为轮询（轮询所有描述符）。该参数指向一个time\_val结构，值为0。

> 如果中间的三个参数对应的指针都是空，我们会得到一个比unix的sleep函数更为精确的定时器（sleep是以秒为单位）。

### select最大描述符数

最初设计select的时候，操作系统通常对每个进程可用的最大描述符的上线进行了设置，但是当今的unix版本允许每个进程使用事实上无限数目的描述符。

下面的代码取自\<sys/types.h>

```c
#ifndef FD_SETSIZE
#define FD_SETSIZE    256
#endif
```

为了解决描述符数量上限问题，我们很容易想到将FD\_SETSIZE定义为某个更大的值，但是这样事实上是行不通的。主要是从可移植性的角度考虑这个问题。

### select实现TCP回射服务器程序

在第一个客户建立连接之前TCP服务端应该存在一个监听描述符。下图中用一个圆点来表示。

<figure><img src="../.gitbook/assets/image (13).png" alt=""><figcaption><p>第一个客户建立连接前的服务器状态</p></figcaption></figure>

此时服务器应该维护一个描述符集，假设服务器是在前台（通过中断控制台启动的），那么描述符0、1、2将会分别被设置为标准输入、标准输出、标准错误输出。所以监听套接字的第一个可用监听描述符是3。下图中展示的client数组，包含每个客户的已连接套接字描述符，数组中的数据被初始化为-1。

<figure><img src="../.gitbook/assets/image (18).png" alt=""><figcaption><p>仅有一个监听套接字的TCP服务器的数据结构</p></figcaption></figure>

此时描述符集中唯一的非零项是表示监听套接字的项。此时maxfd1为4。

第一个客户和服务器建立连接的时候，监听套接字变为可读，我们的服务器于是调用accept。下面假设accept返回的描述符是4。

<figure><img src="../.gitbook/assets/image (16).png" alt=""><figcaption><p>第一个客户建立连接后的TCP服务器</p></figcaption></figure>

client数组会记录下每个新的已连接描述符，并把它加入到描述符集中去。

<figure><img src="../.gitbook/assets/image (19).png" alt=""><figcaption><p>第一个客户连接建立后的数据结构</p></figcaption></figure>

第二个客户和服务器建立连接的时候，监听套接字变为可读，我们的服务器于是调用accept。下面假设accept返回的描述符是5。

<figure><img src="../.gitbook/assets/image (20).png" alt=""><figcaption><p>第二个客户建立连接后的TCP服务器</p></figcaption></figure>

新的已连接描述符必须被记住，TCP服务器对应下面的数据结构。

<figure><img src="../.gitbook/assets/image (21).png" alt=""><figcaption><p>第二个客户建立连接后的数据结构</p></figcaption></figure>

接下来我们假设第一个客户终止它的连接，该客户的TCP发送一个FIN，将会使得描述符4变为可读。当服务器读这个已连接套接字时，read将返回0，我们于是关闭该套接字并相应地更新数据结构。把client\[0]置为-1，把描述符集中描述符4的位设置为0。如下图所示：\


<figure><img src="../.gitbook/assets/image (23).png" alt=""><figcaption><p>第一个客户终止连接后的数据结构</p></figcaption></figure>

当有其他的客户到达时，我们使用client数组中的第一个可用项记录其已连接套接字的描述符，同时将该描述符更新到对应的描述符集中。

下面是上述版本对应的服务器代码：

```c
#include "udp.h"

int main(int argc, char **argv){
    int i, maxi, maxfd, listenfd, connfd, sockfd;
    int nready, client[FD_SETSIZE];
    ssize_t n;
    fd_set rset, allset;
    char buf[MAXLINE];
    socklen_t clilen;
    struct sockaddr_in cliaddr, servaddr;
    
    listenfd = Socket(AF_INET, SOCK_STREAM, 0);
    
    bzero(&servaddr, sizeof(servaddr));
    servaddr.sin_family = AF_INET;
    servaddr.sin_addr.s_addr = htonl(INADDR_ANY);
    servaddr.sin_port = htons(SERV_PORT);
    
    Bind(listenfd, (SA *) &servaddr, sizeof(servaddr));
    
    Listen(listenfd, LISTENQ);
    maxfd = listenfd;
    maxi = -1;
    // 初始化cient array
    for(i = 0; i < F_SETSIZE; i++)
        client[i] = -1;
    FD_ZERO(&allset);
    FD_SET(listenfd, &allset);
    
    for(;;) {
        rset =  allset;
        // 首次循环的时候，select的唯一描述符是监听描述符。
        // select等待某个事件的发生：或是新客户连接的建立，或是数据、FIN或RST的到达。
        nready = Select(maxfd+1, &rset, NULL, NULL, NULL);
        // 检查listenfd是否可读，可读的话说明监听到了新的连接到来。下面我们调用accept并相应地更新数据结构
        // 使用client数组中的第一个未用项记录这个已连接描述符。
        if(FD_ISSET(listenfd, &rset)){
            clilen = sizeof(cliaddr);
            connfd = Accept(listenfd, (SA *) &cliaddr, &clilen);
            
            for(i = 0; i < FD_SETSIZE; i++){
                if(client[i] < 0){
                    // 位置i对应的client[i]为-1，说明此位置可以用来记录描述符。
                    client[i] = connfd;
                    ;
                }
            }
            if(i == FD_SETSIZE) {
                err_quit("too many clients");
            }
            FD_SET(connfd, &allset); // 设置描述符集
            if(connfd > maxfd)
                maxfd = connfd;
            if(i > maxi)
                maxi = i;
            // 使用select的返回值来避免检查未就绪的描述符。
            if(--nready <= 0)
                continue; // 说明只有一个listenfd接收到数据了，其他的描述符还没有接收到数据
        }
        for(i = 0; i <= maxi; i++){
            if((sockfd = client[i]) < 0)
                continue; // i位置对应-1，之前连接过，但是后来断开了
            if(FD_ISSET(sockfd, &rset)) {
                // 如果连接被对方关闭，返回值为 0，表示已经读取到文件末尾（FIN）
                if((n = Read(sockfd, buf, MAXLINE)) == 0){
                    // 此时客户端主动关闭了连接
                    Close(sockfd);
                    FD_CLR(sockfd, &allset);
                    client[i] = -1;
                } else {
                    Writen(sockfd, buf, n);
                }
                if(--nready <= 0)
                    break;
            }
        }
    }
}
```

## poll

```c
#include <poll.h>
// 返回：若有就绪描述符，就返回其数目，若超时则为0，若出错则为-1。
int poll(struct pollfd *fdarray, unsigned long nfdx, int timeout);
```

第一个参数是指向结构数组第一个元素的指针。每个数组元素都是pollfd的结构，用于指定测试某个给定描述符fd的条件。

```c
struct pollfd {
    int fd; // 描述符
    short events; // 针对该描述符感兴趣的事件
    short revents; // 在fd上发生的事件（和events相对应）
}
```

<table><thead><tr><th width="172" align="center">常        值</th><th width="175" align="center">作为events的输入？</th><th width="195" align="center">作为revents的输入？</th><th align="center">说     明</th></tr></thead><tbody><tr><td align="center">POLLIN<br>POLLRDNORM<br>POLLRDBAND<br>POLLPRI</td><td align="center"><span data-gb-custom-inline data-tag="emoji" data-code="26ab">⚫</span><br><span data-gb-custom-inline data-tag="emoji" data-code="26ab">⚫</span><br><span data-gb-custom-inline data-tag="emoji" data-code="26ab">⚫</span><br><span data-gb-custom-inline data-tag="emoji" data-code="26ab">⚫</span></td><td align="center"><span data-gb-custom-inline data-tag="emoji" data-code="26ab">⚫</span><br><span data-gb-custom-inline data-tag="emoji" data-code="26ab">⚫</span><br><span data-gb-custom-inline data-tag="emoji" data-code="26ab">⚫</span><br><span data-gb-custom-inline data-tag="emoji" data-code="26ab">⚫</span></td><td align="center">普通或优先级数据可读<br>普通数据可读<br>优先级数据可读<br>高优先级数据可读</td></tr><tr><td align="center">POLLOUT<br>POLLWRNORM<br>POLLERBAND</td><td align="center"><span data-gb-custom-inline data-tag="emoji" data-code="26ab">⚫</span><br><span data-gb-custom-inline data-tag="emoji" data-code="26ab">⚫</span><br><span data-gb-custom-inline data-tag="emoji" data-code="26ab">⚫</span></td><td align="center"><span data-gb-custom-inline data-tag="emoji" data-code="26ab">⚫</span><br><span data-gb-custom-inline data-tag="emoji" data-code="26ab">⚫</span><br><span data-gb-custom-inline data-tag="emoji" data-code="26ab">⚫</span></td><td align="center">普通数据或优先级可写<br>普通数据可写<br>优先级数据可写</td></tr><tr><td align="center">POLLERR<br>POLLHUP<br>POLLNVAL</td><td align="center"></td><td align="center"><span data-gb-custom-inline data-tag="emoji" data-code="26ab">⚫</span><br><span data-gb-custom-inline data-tag="emoji" data-code="26ab">⚫</span><br><span data-gb-custom-inline data-tag="emoji" data-code="26ab">⚫</span></td><td align="center">发生错误<br>发生挂起<br>描述非打开的文件</td></tr></tbody></table>

上表中POLLIN等数据可以作为events的值赋给pollfd，但是POLLERR等不能作为events的值赋给pollfd。右侧说明中表达的是该常量对应的含义。

poll函数不存在[#select-zui-da-miao-shu-fu-shu](select-and-poll-and-epoll.md#select-zui-da-miao-shu-fu-shu "mention")所引起的问题。因为分配一个pollfd结构的数组并把该数组中元素的数目通知内核成了调用者的责任，内核不需要知道类似fd\_set的数据。

### poll实现TCP回射服务器

```c
#include "unp.h"
#include <limits.h>

int main(int argc, chat **argv){
    int i, maxi, listenfd, connfd, sockfd;
    int nready;
    ssize_t n;
    char buf[MAXLINE];
    socklen_t chilen;
    struct pollfd client[OPEN_MAX]; // 这里设置client数组长度为OPEN_MAX
    struct sockaddr_in, cliaddr, servaddr;
    
    listenfd = Socket(AF_INFT, SOCK_STREAM, 0);
    
    bzero(&servaddr, sizeof(servaddr));
    servaddr.sin_family = AF_INET;
    servaddr.sin_addr.s_addr = htonl(INADDR_ANY);
    servaddr.sin_port = htons(SERV_PORT);
    
    Bind(listenfd, (SA *) &servaddr, sizeof(servaddr));
    
    Listen(listenfd, LISTENQ);
    
    /* 把client数组的第一项用于监听套接字，并把其余各项描述符成员设置为-1。
       将第一项的事件设置为POLLRNDORM，这样当有新的连接准备好被接收时poll将通知我们。
      */
    client[0].fd = listenfd;
    client[0].events = POLLRDNORM;
    for(i = 1; i < OPEN_MAX; i++)
        client[i].fd = -1;  // -1 代表可用的空间
    maxi = 0;  // 代表当前client有效描述符对应的最大索引位置
    for(;;){
        // 调用poll等待新的连接或者现有连接上有数据可读。
        nready = Poll(client, maxi + 1, INFTIM);
        // 一个新的连接被接收后，在client数组中查找到第一个描述符为负的可用项，将新连接的描述符保存到其中。
        if(client[0].revents & POLLRDNORM){
            clilen = sizeof(cliaddr);
            connfd = accept(listenfd, (SA *) &cliaddr, &clilen);
            
            for(i = 1; i < OPEN_MAX; i++)
                if(client[i].fd < 0){
                    client[i].fd = connfd;
                    break;
                }
            if(i == OPEN_MAX)
                err_quit("too many clients");
                
            client[i].events = POLLRDNORM;
            if(i > maxi)
                maxi = i; // max index in client array
                
            if(--nready <= 0)
                continue;
        }
        
        for(i = 1; i <= maxi; i++){
            if((sockfd = client[i].fd) < 0)
                continue;
            // 检查POLLRDNORM | POLLERR，我们并没有在events中设立第二个事件，但是它在条件成立时就会返回。
            if(client[i].revents & (POLLRDNORM | POLLERR)){
                if((n = read(socketfd, buf, MAXLINE)) < 0) {
                     if(errno == ECONNRESET){
                         Close(sockfd);
                         client[i].fd = -1;
                     } else 
                         err_sys("read error");
                 } else if(n == 0) {
                     Close(sockfd);
                     client[i].fd = -1;
                 } else
                     Writen(sockfd, buf, n);
                 
                 if(--nready <= 0)
                     break;
             }
        }
    }
}
```

## epoll

对于epoll，内核**不再需要轮询**，而是采用了一种更高效的**事件驱动（Event-driven）机制**。

### 三大系统调用

*   `epoll_create()`: 在内核中创建一个`epoll`实例。可以把它想象成在内核里建立了一个专门的“事件中心”。这个“中心”被创建后，会返回一个文件描述符（`epfd`）给用户进程，用于后续操作。

    > epoll\_create创建的数据结构：
    >
    > 1. 红黑树：每一个`epoll`实例在内核中都对应一棵红黑树。这棵树用来存储所有通过`epoll_ctl`添加进来需要监视的FD。
    > 2. **就绪链表 (Ready List)**：这是一个双向链表，用来存放已经就绪（即IO事件已经发生）的FD。


* `epoll_ctl()`: 这是`epoll`的管理接口。通过这个函数，进程可以向内核的“事件中心”**添加**（`ADD`）、**修改**（`MOD`）或**删除**（`DEL`）需要监视的文件描述符（`fd`）。
* `epoll_wait()`: 这是进程等待事件的接口。进程调用它后，如果“事件中心”里没有任何就绪的FD，进程就会进入睡眠状态；一旦有FD就绪，这个函数就会被唤醒并返回就绪的FD列表。

### epoll实现TCP回射服务器

```c
#include "unp.h"
#include <sys/epoll.h>
#include <limits.h>

int main(int argc, char **argv) {
    int i, listenfd, connfd, sockfd, epfd, nfds;
    ssize_t n;
    char buf[MAXLINE];
    socklen_t clilen;
    struct epoll_event ev, events[OPEN_MAX];
    struct sockaddr_in cliaddr, servaddr;

    listenfd = Socket(AF_INET, SOCK_STREAM, 0);

    bzero(&servaddr, sizeof(servaddr));
    servaddr.sin_family = AF_INET;
    servaddr.sin_addr.s_addr = htonl(INADDR_ANY);
    servaddr.sin_port = htons(SERV_PORT);

    Bind(listenfd, (SA *)&servaddr, sizeof(servaddr));

    Listen(listenfd, LISTENQ);

    epfd = epoll_create1(0);
    if (epfd == -1)
        err_sys("epoll_create1 error");

    ev.events = EPOLLIN;
    ev.data.fd = listenfd;
    if (epoll_ctl(epfd, EPOLL_CTL_ADD, listenfd, &ev) == -1)
        err_sys("epoll_ctl: listen_sock error");

    for (;;) {
        nfds = epoll_wait(epfd, events, OPEN_MAX, -1);
        if (nfds == -1)
            err_sys("epoll_wait error");

        for (i = 0; i < nfds; i++) {
            if (events[i].data.fd == listenfd) {  // 新连接
                clilen = sizeof(cliaddr);
                connfd = Accept(listenfd, (SA *)&cliaddr, &clilen);

                ev.events = EPOLLIN | EPOLLET; // 使用边缘触发模式
                ev.data.fd = connfd;
                if (epoll_ctl(epfd, EPOLL_CTL_ADD, connfd, &ev) == -1)
                    err_sys("epoll_ctl: conn_sock error");
            } else {  // 已有连接上有数据可读
                sockfd = events[i].data.fd;
                if ((n = read(sockfd, buf, MAXLINE)) < 0) {
                    if (errno == ECONNRESET) {
                        close(sockfd);
                        if (epoll_ctl(epfd, EPOLL_CTL_DEL, sockfd, NULL) == -1)
                            err_sys("epoll_ctl: conn_sock error");
                    } else
                        err_sys("read error");
                } else if (n == 0) {
                    close(sockfd);
                    if (epoll_ctl(epfd, EPOLL_CTL_DEL, sockfd, NULL) == -1)
                        err_sys("epoll_ctl: conn_sock error");
                } else
                    Writen(sockfd, buf, n);
            }
        }
    }
}
```

**第1步：服务器启动和`epoll`设置**

1. **创建监听socket**：调用`socket()`创建一个文件描述符（比如`listen_fd`），然后调用`bind()`和`listen()`，让它在 SERV\_PORT 端口上监听新的连接请求。
2. **创建epoll实例**：调用`epoll_create()`，内核会为这个进程创建一个`epoll`实例（可以想象成一个私有的“事件中心”），并返回一个代表该实例的文件描述符（比如`epfd`）。
3.

    **注册回调函数**：服务器调用`epoll_ctl(epfd, EPOLL_CTL_ADD, listen_fd, ...)`。

    * **这是关键的第一步**。当执行这个调用时，内核不仅仅是将`listen_fd`添加到`epfd`的红黑树中进行管理。
    * **内核还会为`listen_fd`建立一个关联**。它会在与`listen_fd`相关的数据结构（`struct file`）中**注册一个回调函数**。这个回调函数本质上是一段内核代码，它的作用是：“如果这个`listen_fd`上发生了事件，就执行我这段代码”。这段代码的核心逻辑就是将`listen_fd`添加到`epfd`的“就绪链表”里。
      * **内核中已存在一个“标准”的回调函数**。在Linux内核的`epoll`实现中，有一个内部函数 `ep_poll_callback` 这个函数是内核开发者写好的、固定的，它的功能就是我们之前描述的：**将事件对应的文件描述符（fd）添加到`epoll`实例的“就绪链表”中，并唤醒正在等待的进程。**
      * **`epoll_ctl` 的作用是建立“关联”**。当你调用 `epoll_ctl` 把一个`fd`添加到一个`epoll`实例（`epfd`）时，内核会在与这个`fd`关联的内核数据结构中，建立一个**指向** `ep_poll_callback` 函数的**钩子（Hook）**。同时，这个钩子还会记录下是哪个`epoll`实例（`epfd`）对它感兴趣。
      * **事件触发钩子**。当网卡驱动程序收到数据，确认`fd`已经就绪时，它不会去关心上层是哪个进程在使用这个`fd`。它只会去调用在这个`fd`上预设好的钩子。
      * **钩子执行标准的回调函数**。这个钩子被触发后，就会执行内核中早已定义好的 `ep_poll_callback` 函数。这个函数根据之前`epoll_ctl`设置的记录，准确地找到对应的`epoll`实例（`epfd`），并将`fd`放入它的就绪链表。

**第2步：硬件事件发生（客户端请求连接）**

1. 一个客户端（比如你的浏览器）向服务器的IP地址和 SERV\_PORT 端口发送了一个TCP SYN包，请求建立连接。
2. 这个数据包通过网络到达服务器的**网卡（NIC）**。

**第3步：硬件中断**

1. 网卡是硬件设备。它收到数据包后，通过DMA（直接内存访问）技术，将数据包的内容写入内核预先分配好的一块内存缓冲区中。
2. 数据写入完成后，网卡会向CPU发送一个**硬件中断信号**。这就像按下了CPU的“门铃”。

**第4步：中断处理与回调函数被激活**

1. CPU收到“门铃”后，会立即**暂停**当前正在执行的任何任务（比如其他某个进程的代码）。
2. 它会跳转去执行**预先注册好的中断服务程序（ISR）**，也就是**网卡驱动程序**中的代码。
3. 网卡驱动程序开始分析刚刚收到的数据包。它解析包头，发现这是一个发往80端口的TCP SYN请求。
4. 驱动程序知道这个SYN包对应的是`listen_fd`这个监听socket。
5. **这就是魔法发生的地方**：驱动程序在处理完数据后，会**调用在第1步中为`listen_fd`注册的那个回调函数**。

**第5步：回调函数执行它的任务**

这个被激活的回调函数，执行非常简单但高效的操作：

1. 它访问`epfd`这个`epoll`实例的内部数据结构。
2. 它将`listen_fd`这个文件描述符**添加（或移动）到`epfd`的“就绪链表”**（ready list）中。
3. 然后，它检查是否有进程正在`epoll_wait(epfd, ...)`上睡眠。它发现我们的服务器进程正在睡觉。
4. 于是，它**唤醒**这个正在睡眠的服务器进程。

**第6步：服务器进程被唤醒并处理事件**

1. `epoll_wait()`从阻塞中返回。它不再需要遍历检查任何东西，因为内核已经通过“就绪链表”直接告诉了它哪些FD是就绪的。
2. `epoll_wait()`返回的结果中包含了`listen_fd`。
3. 服务器进程看到`listen_fd`就绪了，就知道有新的连接请求。于是它调用`accept()`来接受这个新连接，并得到一个新的文件描述符`conn_fd`用于与这个客户端通信。
4. 服务器可以将这个新的`conn_fd`也通过`epoll_ctl()`加入到`epfd`的监视列表中，然后再次调用`epoll_wait()`，等待下一个事件（可能是另一个新连接，也可能是`conn_fd`上有数据可读）。

### 水平触发&边缘触发

#### 水平触发

* 只要文件描述符关联的读内核缓冲区非空，有数据可以读取，就一直发出可读信号进行通知。
* 当文件描述符关联的内核写缓冲区不满，有空间可以写入，就一直发出可写信号进行通知。

#### 边缘触发

* 当文件描述符关联的读内核缓冲区由空转化为非空的时候，则发出可读信号进行通知。
* 当文件描述符关联的内核写缓冲区由满转化为不满的时候，则发出可写信号进行通知

#### 二者的区别

水平触发是只要读缓冲区有数据，就会一直触发可读信号，而边缘触发仅仅在空变为非空的时候通知一次，举个例子：

1. 读缓冲区刚开始是空的
2. 读缓冲区写入2KB数据
3. 水平触发和边缘触发模式此时都会发出可读信号
4. 收到信号通知后，读取了1kb的数据，读缓冲区还剩余1KB数据
5. 水平触发会再次进行通知，而边缘触发不会再进行通知

在使用 epoll 的边缘触发（EPOLLET）模式时，可能出现的一种潜在问题：

* **场景设置**：
  1. 我们有一个管道（pipe），它的读取端文件描述符 `rfd` 被注册到了 epoll 实例中，并且使用了边缘触发模式。
  2. 管道的写入端写入 2KB 数据。
  3. 调用 `epoll_wait`，`rfd` 被返回，表示有数据可读。
  4. 从 `rfd` 中读取 1KB 数据。
  5. 再次调用 `epoll_wait`。
* **问题**：
  * 在步骤 5 中，`epoll_wait` 可能会挂起（阻塞），即使输入缓冲区中还有剩余数据未读。
  * 这是因为边缘触发模式下，epoll 只在文件描述符状态发生变化时才会产生事件。
  * 在步骤 2 中，写入数据导致 `rfd` 状态变为可读，触发了一个事件，这个事件在步骤 3 中被 `epoll_wait` 消费。
  * 虽然步骤 4 中只读取了部分数据，但 `rfd` 仍然处于可读状态，它的状态没有发生变化。
  * 因此，在步骤 5 中，`epoll_wait` 不会再收到任何事件通知，从而导致挂起。
* **影响**：
  * 这种情况下，管道的另一端（写入端）可能正在等待读取端的响应，但读取端却因为 `epoll_wait` 挂起而无法及时处理数据，导致通信停滞。

所以使用边缘触发模式时需要注意：

* **及时处理事件**：当 epoll 通知文件描述符就绪时，应用程序需要尽可能地读取或写入数据，直到遇到 `EAGAIN` 错误，确保文件描述符的状态发生变化，以便下次能再次触发事件。
* **非阻塞 I/O**：为了避免 `epoll_wait` 挂起，通常需要将文件描述符设置为非阻塞模式，这样在读取或写入数据时，如果操作无法立即完成，会返回 `EAGAIN` 错误，而不是阻塞等待。
* **循环处理**：在边缘触发模式下，一次 `epoll_wait` 可能只会通知一部分就绪事件。因此，应用程序需要使用循环来处理所有就绪的文件描述符，直到没有更多的就绪事件为止。

解决边缘出发模式的思想：

* **使用非阻塞文件描述符**：这是使用 `EPOLLET` 的前提条件。
* **仅在 `read` 或 `write` 返回 `EAGAIN` 后才等待事件**：这是 `EPOLLET` 的关键用法。

**为什么要这样做？**

* **避免事件丢失**：在 `EPOLLET` 模式下，如果一次 `epoll_wait` 返回后，您没有完全处理完文件描述符上的所有就绪事件（例如只读取了部分数据），那么后续的 `epoll_wait` 调用可能不会再通知您该文件描述符，即使还有数据可读或可写空间。
* **提高效率**：通过在 `read` 或 `write` 返回 `EAGAIN` 后才等待事件，可以避免不必要的 `epoll_wait` 调用，从而提高程序的效率。

```c
// 假设 sockfd 是一个非阻塞套接字，已经注册到 epoll 实例中，使用 EPOLLET 模式
int nfds = epoll_wait(epfd, events, MAX_EVENTS, -1);

for (int i = 0; i < nfds; i++) {
    if (events[i].data.fd == sockfd) {
        if (events[i].events & EPOLLIN) {
            // 处理可读事件
            while (1) {
                ssize_t n = read(sockfd, buf, sizeof(buf));
                if (n > 0) {
                    // 处理读取到的数据
                } else if (n == 0) {
                    // 连接关闭
                    close(sockfd);
                    break;
                } else {
                    if (errno == EAGAIN) {
                        // 没有更多数据可读，退出循环
                        break;
                    } else {
                        // 处理错误
                        perror("read");
                        close(sockfd);
                        break;
                    }
                }
            }
        } 
        // ... 处理其他事件 ...
    }
}
```

## select vs poll vs epoll

> 关于水平触发和边缘触发：
>
> 水平触发（Level Triggered, LT）和边缘触发（Edge Triggered, ET）是 I/O 多路复用中两种不同的事件触发方式，它们决定了内核何时通知应用程序文件描述符已经就绪。
>
> **水平触发（LT）**
>
> * **特点**：只要文件描述符处于就绪状态，就会一直触发事件。
> * **行为**：
>   * 当文件描述符变为可读或可写时，内核会通知应用程序。
>   * 如果应用程序没有立即处理该事件，并且文件描述符仍然保持就绪状态，内核会在下一次 `epoll_wait` 或 `poll` 调用时再次通知应用程序。
>   * 这种方式更安全，因为应用程序不会错过任何事件，但可能会导致频繁的通知，增加系统开销。
>
> **边缘触发（ET）**
>
> * **特点**：只有当文件描述符状态发生变化时才会触发事件。
> * **行为**：
>   * 当文件描述符从不可读变为可读，或者从不可写变为可写时，内核会通知应用程序。
>   * 如果应用程序没有立即处理该事件，并且文件描述符仍然保持就绪状态，内核不会再次通知应用程序，直到文件描述符状态再次发生变化。
>   * 这种方式效率更高，因为避免了不必要的通知，但要求应用程序必须及时处理事件，否则可能会错过事件。

| 特性            | select                | poll                  | epoll                |
| ------------- | --------------------- | --------------------- | -------------------- |
| **底层实现**      | 线性扫描                  | 线性扫描                  | 事件驱动                 |
| **最大文件描述符限制** | 有限制，通常为 1024          | 没有硬性限制，但受限于系统资源       | 没有硬性限制，但受限于系统资源      |
| **性能**        | 每次调用都需要遍历所有文件描述符，性能较差 | 每次调用都需要遍历所有文件描述符，性能较差 | 只处理活跃的连接，性能优秀        |
| **数据拷贝**      | 每次调用都需要进行数据拷贝         | 每次调用都需要进行数据拷贝         | 只需一次从用户空间到内核空间的数据拷贝  |
| **可移植性**      | 几乎所有 Unix/Linux 系统都支持 | 几乎所有 Unix/Linux 系统都支持 | 仅 Linux 系统支持         |
| **触发模式**      | 仅支持水平触发（LT）           | 仅支持水平触发（LT）           | 支持水平触发（LT）和边缘触发（ET）  |
| **使用场景**      | 适用于少量连接且活跃连接较多的场景     | 适用于少量连接且活跃连接较多的场景     | 适用于大量并发连接，且活跃连接较少的场景 |
| **编程复杂度**     | 相对简单                  | 相对简单                  | 相对复杂                 |

## 描述符就绪条件

我们一直在讨论等待某个描述符准备好I/O或是等待其上发生一个待处理的异常条件。尽管可读性和可写性对于普通文件这样的描述符显而易见，然而对于引起套接字“就绪”的条件我们必须再详细讨论下：

### 读就绪

1. 该套接字接收缓冲区中的数据字节数大于等于套接字接收缓冲区低水位标记的大小。对这样的套接字执行读的操作不会阻塞并将返回一个大于0的值（也就是返回准备好读入的数据）。我们可以使用SO\_RCVLOWAT套接字选项设置改套接字低水位标记。
2. 该连接的读半部关闭（也就是接收了FIN的连接）。对这样的套接字的读操作将不阻塞并返回0（也就是EOF）。
3. 该套接字是一个监听套接字且已完成的连接数大于0。对这样的套接字的accept通常不会阻塞。
4. 其上有一个套接字错误待处理，对这样的套接字的读操作将不阻塞并返回-1（也就是返回-1），同时把errno设置为确切的错误条件。

### 写就绪

1. 该套接字的发送缓冲区的可用空间字节数大于等于套接字发送缓冲区低水位标记的当前大小，并且或者该套接字已连接，或者该套接字不需要连接（如UDP套接字）。这意味着如果我们把这样的套接字设置为非阻塞，写操作将不阻塞并返回一个正值（例如由传输层接受的字节数）。我们可以使用SO\_SNDLOWAT套接字选项来设置该套接字的低水位标记。对于TCP和UDP套接字而言，其默认值是2048。
2. 该连接的写半部关闭。对这样的套接字的写操作将产生SIGPIPE信号。
3. 使用非阻塞connect的套接字已建立连接，或者connect以失败而告终。
4. 其上有一个套接字错误待处理。对这样的套接字的写操作将不阻塞并返回-1，同时把errno设置为确切的错误条件。

### 带外标记

如果一个套接字存在带外数据（带外数据指的是一个连接的某端发生了重要的事情，而且希望迅速通告其对端。这里“迅速”意味着这种通知应该在已经排队等待发送的任何“普通”数据之前发送。也就是说：带外数据被认为比普通数据具有更高的优先级），那么它有异常待处理。

## 软件怎么实现的监测数据的到来

### 中心思想

无论是select poll epoll，都避免不了在程序层面通过主（死）循环监测数据，但是使用这些手段可以减少CPU资源的浪费。

**为什么服务器程序需要循环：**

* **持续运行：** 服务器程序通常需要长时间运行，以提供持续的服务。循环可以保证程序不会在处理完一个请求后就退出。
* **事件驱动：** 即使在异步IO模型中，服务器程序也需要一个循环来驱动事件的处理。事件循环不断地从事件队列中获取事件，并调用相应的回调函数来处理事件。

服务器程序通常需要一个主循环来驱动程序的运行，这个循环可以是事件循环、定时器循环或者信号处理循环。虽然循环会占用一定的CPU资源，但通过使用异步IO、多路复用、硬件加速等技术，可以大大减少CPU的消耗，提高服务器程序的性能和可伸缩性。

## 硬件是怎么实现的监测数据的到来

硬件电路可以通过时钟信号、状态机等机制来实现连续的信号检测，而不需要显式的循环。这是因为硬件电路是并行执行的，可以在一个时钟周期内完成多个操作。

> 其实在硬件层面，可以把接收器加电的状态类比为for循环，加电的状态是持续的，逻辑电路可以类比为for循环内部的处理逻辑。

## 关于使用主循环的一些弊端

* **效率低下：** 如果使用 for 循环来等待信号，处理器会一直处于忙等待状态，浪费大量的 CPU 资源。
* **实时性差：** for 循环内部的某段程序执行时间是不确定的，可能会导致信号接收的延迟，影响系统的实时性。

但是应用服务器离不开主（死）循环。

## 猜测：IO模型中，一定有...

<figure><img src="../.gitbook/assets/image (2).png" alt=""><figcaption></figcaption></figure>

所以能够提升效率的地方在哪儿呢？

1、硬件层面：逻辑电路应该把接收到的数据放在一个应用进程（我们自己编写的服务器）触手可及的地方。也就是内核和用户共享的内存区。放在这里可以使应用进程在获取数据的时候不用进行用户-内核态的转换。

2、软件层面：在没有数据处理的时候，尽量少占CPU资源，进程投入睡眠。
