export class BackupService {
  constructor(private repo?: any, private storagePath?: string) {}

  async createBackup(ownerId: number): Promise<any> {
    return { status: 'not-implemented' };
  }

  async listBackups(ownerId: number): Promise<any[]> {
    return [];
  }
}

export default BackupService;
