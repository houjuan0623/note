# 🐶 调试Libuv

## 准备阶段

```bash
# 在普通用户中执行下面的操作，构建debug版本的libuv
export CFLAGS="-g -O0"
sh autogen.sh
./configure
make
make check
sudo make install
```

## .vscode>launch.json

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "debug libuv",
            "type": "cppdbg",
            "request": "launch",
            "program": "${workspaceFolder}/libuvTest/tcp",
            "args": [],
            "stopAtEntry": true,
            "cwd": "${workspaceFolder}",
            "environment": [
                {
                    "name": "LD_LIBRARY_PATH",
                    "value": "/usr/local/lib" //或者你libuv.so所在的目录
                }
            ],
            "externalConsole": false,
            "MIMode": "gdb",
            "preLaunchTask": "build libuv example",
            "sourceFileMap": {
                "/home/seconp/桌面/workspace/CORC++/libuv-1.42.0": "${workspaceFolder}/../libuv-1.42.0"
            },
            "setupCommands": [
                {
                    "description": "Enable pretty-printing for gdb",
                    "text": "-enable-pretty-printing",
                    "ignoreFailures": true
                },
                {
                    "description": "Add source code directory",
                    "text": "directory ${workspaceFolder}",
                    "ignoreFailures": true
                }
            ]
        }
    ]
}
```

## .vscode>tasks.json

```json
{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "build libuv example",  // 任务名称
            "type": "shell",
            "command": "gcc -g ${workspaceFolder}/libuvTest/file.c -o ${workspaceFolder}/libuvTest/file -luv",  // 编译命令
            "group": {
                "kind": "build",
                "isDefault": true
            }
        }
    ]
}
```

