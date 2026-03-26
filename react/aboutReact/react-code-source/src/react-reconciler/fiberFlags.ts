export type Flags = number;

export const NoFlags = 0b0000000;   // 0 表示没有任何副作用或更新的常量
export const Placement = 0b0000001;   // 1 插入
export const Update = 0b0000010;   // 2 更新当前节点
export const ChildDeletion = 0b0000100;    // 4 删除子节点

export const PassiveEffect = 0b0001000;//  8

export const MutationMask = Placement | Update | ChildDeletion;

export const PassiveMask = PassiveEffect | ChildDeletion;
