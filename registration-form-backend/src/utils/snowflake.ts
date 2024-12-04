import Genid from '../utils/SonwFlake'; // 引入实现雪花 ID 的核心类

// 单例模式，确保全局唯一
const snowflake = new Genid({
  WorkerId: 1, // 当前节点的机器 ID，确保分布式情况下唯一
  BaseTime: 1577836800000, // 基础时间，可选
  WorkerIdBitLength: 6, // 机器 ID 位长，可选
  SeqBitLength: 6, // 序列号位长，可选
});

export function generateTempUserId(): bigint {
  return BigInt(-snowflake.NextId()); // 显式转换为 bigint
}

/**
 * 分布式系统中的雪花 ID 生成注意事项：
 * 1. **WorkerId 唯一性**：
 *    - 每个节点（机器）必须有一个唯一的 `WorkerId`，以确保不同节点生成的 ID 不会冲突。
 *    - `WorkerId` 的最大值由 `WorkerIdBitLength` 决定，默认情况下为 6 位，最大支持 64 个节点。
 *    - 需要确保每台机器的 `WorkerId` 不重复。对于大规模的分布式部署，可能需要专门的机制来分配 `WorkerId`。
 * 
 * 2. **时间戳管理**：
 *    - 雪花 ID 生成依赖系统时间戳，因此确保系统时间的准确性和同步非常重要。
 *    - 如果机器的时间发生回拨，可能会导致重复的 ID，通常需要实现时间回拨检测机制。
 *    - 在大部分应用中，`BaseTime` 用于设置基础时间，减少时间戳的溢出。
 * 
 * 3. **序列号的使用**：
 *    - `SeqBitLength` 确定了每毫秒生成的最大 ID 数量。确保它足够大，以避免在高并发情况下生成重复的 ID。
 *    - 在每毫秒内生成多个 ID 时，`SeqBitLength` 可以帮助区分这些 ID。如果每毫秒生成的 ID 数量较大，可以适当增加 `SeqBitLength` 的值。
 * 
 * 4. **ID 生成的全局唯一性**：
 *    - 雪花 ID 的全局唯一性依赖于 `WorkerId`、`BaseTime` 和 `SeqBitLength`。通过这些参数的配置，可以确保在分布式环境中生成唯一且有序的 ID。
 * 
 * 5. **雪花 ID 的顺序性**：
 *    - 雪花 ID 具有时间有序性，意味着生成的 ID 按照时间升序排列。在大多数分布式应用中，ID 的顺序性是非常重要的，特别是用于数据库排序时。
 * 
 * 6. **负载均衡与雪花 ID**：
 *    - 当应用部署在多个节点上时，合理分配 `WorkerId` 对于避免冲突非常重要。避免节点间 `WorkerId` 冲突是分布式系统中重要的一环。
 */

export default snowflake;
