// types/storage.ts
export interface StorageStats {
  public_files_count: number;
  private_files_count: number;
  public_storage_bytes: number;
  private_storage_bytes: number;
  total_files_count: number;
  total_storage_bytes: number;
  file_types: {
    [extension: string]: {
      count: number;
      size: number;
    }
  };
  daily_stats: {
    [date: string]: {
      count: number;
      size: number;
    }
  };
  bucket_info?: {
    public_bucket: string;
    private_bucket: string;
    same_bucket: boolean;
  };
}
