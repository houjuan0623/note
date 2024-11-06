# 为什么有些函数直接返回undefinedd

[源码位置](https://github.com/RocketChat/Rocket.Chat/blob/6.9.5/apps/meteor/server/models/raw/BaseRaw.ts#L104)

```typescript
protected modelIndexes(): IndexDescription[] | undefined {
    return undefined;
}

public async createIndexes() {
	const indexes = this.modelIndexes();
	if (this.options?._updatedAtIndexOptions) {
		indexes?.push({ ...this.options._updatedAtIndexOptions, key: { _updatedAt: 1 } });
	}

	if (indexes?.length) {
		if (this.pendingIndexes) {
			await this.pendingIndexes;
		}

		this.pendingIndexes = this.col.createIndexes(indexes) as unknown as Promise<void>;

		void this.pendingIndexes.finally(() => {
			this.pendingIndexes = undefined;
		});

		return this.pendingIndexes;
	}
}

```

虽然 `modelIndexes()` 返回 `undefined`，但代码中仍然调用 `createIndexes()` 是有原因的，这与 **MongoDB 索引的默认行为** 和 **代码的健壮性** 有关。

**1. MongoDB 的默认索引**

即使 `modelIndexes()` 没有显式定义索引，MongoDB 也会自动为每个集合创建 `_id` 索引。`createIndexes()` 方法可以用来管理集合的所有索引，包括默认的 `_id` 索引。

这段代码的逻辑是，即使没有自定义索引，也要确保 `_id` 索引存在，并进行可能的更新 (例如，添加 `_updatedAtIndexOptions`)。

**2. 代码的健壮性**

* **未来扩展:** `modelIndexes()` 当前返回 `undefined`，但这可能是为了未来扩展预留的。以后，这个方法可能会返回自定义索引的定义，这时 `createIndexes()` 就会创建这些自定义索引。
* **提高代码健壮性，防止意外错误:** 即使 `modelIndexes()` 现在不返回任何东西，调用 `createIndexes()` 可以确保索引创建逻辑的完整性。即使出现意外情况，例如 `modelIndexes()` 被错误地修改，`createIndexes()` 仍然可以确保至少 `_id` 索引被正确创建和管理。
