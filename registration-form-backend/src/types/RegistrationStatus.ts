/**
 * RegistrationStatus 枚举
 * 表示报名的状态，用于标识每条报名记录的处理进度。
 */
export enum RegistrationStatus {
    /**
    * 待验证 (Verification Pending)
    * 专用于临时用户，表示报名信息待验证。
    */
    VerificationPending = -1,

    /**
     * 待审核 (Pending)
     * 默认状态，表示报名记录已提交，等待管理员审核。
     */
    Pending = 0,
  
    /**
     * 已通过 (Approved)
     * 表示报名已被管理员审核通过。
     */
    Approved = 1,
  
    /**
     * 已拒绝 (Rejected)
     * 表示报名被管理员拒绝。
     */
    Rejected = 2,
  
    /**
     * 已取消 (Canceled)
     * 表示用户主动取消了报名。
     */
    Canceled = 3,
  }
  