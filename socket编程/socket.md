# 🐶 socket

一个TCP连接套接字对是一个定义该连接的两个端点的四元组：本地IP地址:本地端口号.外地IP地址:外地端口号。套接字对唯一标识一个网络上的每个TCP连接。

标识每个端点的两个值（IP地址和端口号）通常称为一个套接字。

## 套接字地址结构

```c
struct sockaddr_in {
    short            sin_family;   // 地址族（Address Family），如 AF_INET
    unsigned short   sin_port;     // 端口号（Port Number）
    struct in_addr   sin_addr;     // IP 地址（Internet Address）
    char             sin_zero[8];  // 用于对齐的填充字段，应设置为 0
};

struct in_addr {
    unsigned long s_addr;  // 32 位 IPv4 地址
};
```

