export class TemplateService {
  constructor(private repo?: any) {}

  async list(ownerId?: number): Promise<any[]> {
    return [];
  }

  async create(ownerId: number, payload: any): Promise<any> {
    return payload;
  }
}

export default TemplateService;
