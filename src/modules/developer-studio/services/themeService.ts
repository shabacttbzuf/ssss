export class ThemeService {
  constructor(private options?: any) {}

  async getTheme(ownerId?: number): Promise<any> {
    return { colors: {}, fonts: {}, logoUrl: null };
  }

  async setTheme(ownerId: number, theme: any): Promise<void> {
    // persist theme via repository (not implemented in skeleton)
    return Promise.resolve();
  }
}

export default ThemeService;
