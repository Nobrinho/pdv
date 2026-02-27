class CompanyContext {
  private static currentCompanyId: string | null = null;

  static setCompany(companyId: string) {
    this.currentCompanyId = companyId;
    console.log(`[CompanyContext] Empresa definida: ${companyId}`);
  }

  static getCompany(): string | null {
    return this.currentCompanyId;
  }

  static clear() {
    this.currentCompanyId = null;
  }
}

export default CompanyContext;
