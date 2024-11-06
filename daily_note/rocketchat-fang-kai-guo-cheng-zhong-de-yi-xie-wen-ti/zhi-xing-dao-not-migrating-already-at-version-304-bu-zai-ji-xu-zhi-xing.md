# 🐞 执行到Not migrating, already at version 304不再继续执行。

1、如下注释文件中的代码 apps/meteor/server/lib/migrations.ts：

```typescript
export async function onServerVersionChange(cb: () => Promise<void>): Promise<void> {
	// const result = await Migrations.findOneAndUpdate(
	// 	{
	// 		_id: 'upgrade',
	// 	},
	// 	{
	// 		$set: {
	// 			hash: Info.commit.hash,
	// 		},
	// 	},
	// 	{
	// 		upsert: true,
	// 	},
	// );

	// if (result.value?.hash === Info.commit.hash) {
	// 	return;
	// }

	await cb();
}
```

2、修改 /tmp/ufs 的权限：

chmod -R 777 /tmp/ufs

