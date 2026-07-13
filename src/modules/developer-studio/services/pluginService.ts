export class PluginService {
  constructor(private repo?: any) {}

  async list(ownerId?: number): Promise<any[]> {
    return [];
  }

  async enable(pluginId: number): Promise<void> {
    return Promise.resolve();
  }
}

export default PluginService;
