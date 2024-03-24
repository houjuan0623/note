# 🐶 TCP

## TCP 三次握手

1. 客服端发起TCP三次握手之前，服务器必须准备好接受外来的连接。通过调用socket\&bind\&listen来完成，这被称为被动打开。
2. 客户端通过connect激发三次握手的过程，这被称为主动打开。
   1. 客户端发送SYN（Synchronize Sequence Numbers）同步序列编号，告诉服务器客户端将在待建立的连接中发送的数据的初始序列号。
   2. 服务器必须确认（ACK）客服端的SYN，同时自己也发送一个SYN，其中ACK=SYN+1，告诉客户端服务器将在待建立的连接中发送的数据的初始序列号。
   3. 客户端必须发送确认（ACK），其中ACK=SYN+1。

<figure><img src=".gitbook/assets/image.png" alt=""><figcaption><p>TCP 三次握手</p></figcaption></figure>

