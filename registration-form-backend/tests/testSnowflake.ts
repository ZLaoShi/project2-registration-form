import Genid from '../src/utils/SonwFlake';

function testSnowflake() {
    // 创建一个 Snowflake 实例
    const snowflake = new Genid({
      WorkerId: 1, // 设置机器 ID
    });
  
    // 显式定义 ids 的类型为 number[]
    const ids: number[] = [];
    for (let i = 0; i < 10; i++) {
      ids.push(snowflake.NextId());
    }
  
    console.log('Generated IDs:', ids);
  
    // 检查 ID 是否唯一
    const uniqueIds = new Set<number>(ids);
    console.log('Unique IDs:', uniqueIds.size === ids.length ? 'All IDs are unique' : 'Duplicate IDs found');
  }

testSnowflake();
