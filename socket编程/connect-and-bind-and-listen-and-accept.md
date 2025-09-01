# connect\&bind\&listen\&accept

## connect

调用connect传递套接字地址结构的方向是：用户进程->内核进程

客户端在调用connect的时候不用非要调用bind函数，调用的时操作系统内核会自动为该连接选择一个合适的源 IP 地址（通常是与目标服务器通信所使用的网络接口的 IP 地址）和一个临时的端口号作为源端口。这个临时端口号通常是一个动态分配的、未被占用的端口号。

connect调用将激发TCP三次握手的过程：



## bind

## listen

## accept

