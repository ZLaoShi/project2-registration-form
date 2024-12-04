interface GenidOptions {
    Method?: number; // 雪花计算方法，（1-漂移算法|2-传统算法），默认 1
    BaseTime?: number; // 基础时间（ms 单位），不能超过当前系统时间
    WorkerId: number; // 机器码，必须由外部设定，最大值 2^WorkerIdBitLength-1
    WorkerIdBitLength?: number; // 机器码位长，默认值 6，取值范围 [1, 15]
    SeqBitLength?: number; // 序列数位长，默认值 6，取值范围 [3, 21]
    MaxSeqNumber?: number; // 最大序列数（含），默认值 0，表示最大序列数取最大值
    MinSeqNumber?: number; // 最小序列数（含），默认值 5
    TopOverCostCount?: number; // 最大漂移次数（含），默认 2000
  }
  
  class Genid {
    private Method: bigint;
    private BaseTime: bigint;
    private WorkerId: bigint;
    private WorkerIdBitLength: bigint;
    private SeqBitLength: bigint;
    private MaxSeqNumber: bigint;
    private MinSeqNumber: bigint;
    private TopOverCostCount: bigint;
  
    private _TimestampShift: bigint;
    private _CurrentSeqNumber: bigint;
  
    private _LastTimeTick: bigint;
    private _TurnBackTimeTick: bigint;
    private _TurnBackIndex: bigint;
    private _IsOverCost: boolean;
    private _OverCostCountInOneTerm: bigint;
  
    constructor(options: GenidOptions) {
      if (options.WorkerId === undefined) {
        throw new Error("WorkerId is required");
      }
  
      // Default values
      const BaseTime = 1577836800000;
      const WorkerIdBitLength = 6;
      const SeqBitLength = 6;
      const MinSeqNumber = 5;
      const TopOverCostCount = 2000;
  
      options.BaseTime = options.BaseTime ?? BaseTime;
      options.WorkerIdBitLength = options.WorkerIdBitLength ?? WorkerIdBitLength;
      options.SeqBitLength = options.SeqBitLength ?? SeqBitLength;
      options.MinSeqNumber = options.MinSeqNumber ?? MinSeqNumber;
      options.TopOverCostCount = options.TopOverCostCount ?? TopOverCostCount;
  
      const MaxSeqNumber = (1 << options.SeqBitLength) - 1;
      options.MaxSeqNumber = options.MaxSeqNumber ?? MaxSeqNumber;
  
      this.Method = BigInt(options.Method ?? 1);
      this.BaseTime = BigInt(options.BaseTime);
      this.WorkerId = BigInt(options.WorkerId);
      this.WorkerIdBitLength = BigInt(options.WorkerIdBitLength);
      this.SeqBitLength = BigInt(options.SeqBitLength);
      this.MaxSeqNumber = BigInt(options.MaxSeqNumber);
      this.MinSeqNumber = BigInt(options.MinSeqNumber);
      this.TopOverCostCount = BigInt(options.TopOverCostCount);
  
      this._TimestampShift = this.WorkerIdBitLength + this.SeqBitLength;
      this._CurrentSeqNumber = this.MinSeqNumber;
  
      this._LastTimeTick = BigInt(0);
      this._TurnBackTimeTick = BigInt(0);
      this._TurnBackIndex = BigInt(0);
      this._IsOverCost = false;
      this._OverCostCountInOneTerm = BigInt(0);
    }
  
    private GetCurrentTimeTick(): bigint {
      const millis = BigInt(Date.now());
      return millis - this.BaseTime;
    }
  
    private GetNextTimeTick(): bigint {
      let tempTimeTicker = this.GetCurrentTimeTick();
      while (tempTimeTicker <= this._LastTimeTick) {
        tempTimeTicker = this.GetCurrentTimeTick();
      }
      return tempTimeTicker;
    }
  
    private CalcId(useTimeTick: bigint): bigint {
      const result =
        (useTimeTick << this._TimestampShift) +
        (this.WorkerId << this.SeqBitLength) +
        this._CurrentSeqNumber;
      this._CurrentSeqNumber++;
      return result;
    }
  
    private CalcTurnBackId(useTimeTick: bigint): bigint {
      const result =
        (useTimeTick << this._TimestampShift) +
        (this.WorkerId << this.SeqBitLength) +
        this._TurnBackIndex;
      this._TurnBackTimeTick--;
      return result;
    }
  
    private NextOverCostId(): bigint {
      const currentTimeTick = this.GetCurrentTimeTick();
      if (currentTimeTick > this._LastTimeTick) {
        this._LastTimeTick = currentTimeTick;
        this._CurrentSeqNumber = this.MinSeqNumber;
        this._IsOverCost = false;
        this._OverCostCountInOneTerm = BigInt(0);
        return this.CalcId(this._LastTimeTick);
      }
      if (this._OverCostCountInOneTerm >= this.TopOverCostCount) {
        this._LastTimeTick = this.GetNextTimeTick();
        this._CurrentSeqNumber = this.MinSeqNumber;
        this._IsOverCost = false;
        this._OverCostCountInOneTerm = BigInt(0);
        return this.CalcId(this._LastTimeTick);
      }
      if (this._CurrentSeqNumber > this.MaxSeqNumber) {
        this._LastTimeTick++;
        this._CurrentSeqNumber = this.MinSeqNumber;
        this._IsOverCost = true;
        this._OverCostCountInOneTerm++;
        return this.CalcId(this._LastTimeTick);
      }
      return this.CalcId(this._LastTimeTick);
    }
  
    private NextNormalId(): bigint {
      const currentTimeTick = this.GetCurrentTimeTick();
      if (currentTimeTick < this._LastTimeTick) {
        if (this._TurnBackTimeTick < 1) {
          this._TurnBackTimeTick = this._LastTimeTick - BigInt(1);
          this._TurnBackIndex++;
          if (this._TurnBackIndex > BigInt(4)) {
            this._TurnBackIndex = BigInt(1);
          }
        }
        return this.CalcTurnBackId(this._TurnBackTimeTick);
      }
      if (this._TurnBackTimeTick > BigInt(0)) {
        this._TurnBackTimeTick = BigInt(0);
      }
      if (currentTimeTick > this._LastTimeTick) {
        this._LastTimeTick = currentTimeTick;
        this._CurrentSeqNumber = this.MinSeqNumber;
        return this.CalcId(this._LastTimeTick);
      }
      if (this._CurrentSeqNumber > this.MaxSeqNumber) {
        this._LastTimeTick++;
        this._CurrentSeqNumber = this.MinSeqNumber;
        this._IsOverCost = true;
        this._OverCostCountInOneTerm = BigInt(1);
        return this.CalcId(this._LastTimeTick);
      }
      return this.CalcId(this._LastTimeTick);
    }
  
    public NextId(): number {
      if (this._IsOverCost) {
        return Number(this.NextOverCostId());
      } else {
        return Number(this.NextNormalId());
      }
    }
  }
  
  export default Genid;
  