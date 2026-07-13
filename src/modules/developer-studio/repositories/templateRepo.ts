export class TemplateRepo {
  async findAllByOwner(ownerId: number): Promise<any[]> {
    return [];
  }

  async create(template: any): Promise<any> {
    return template;
  }
}

export default TemplateRepo;
