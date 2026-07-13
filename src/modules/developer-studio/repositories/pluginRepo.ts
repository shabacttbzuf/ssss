export class PluginRepo {
  async findAllByOwner(ownerId: number): Promise<any[]> {
    return [];
  }

  async create(manifest: any): Promise<any> {
    return manifest;
  }
}

export default PluginRepo;
