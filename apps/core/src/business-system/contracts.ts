export type BusinessSystemConnectionProbe = { connected: boolean };

export type BusinessSystemCompany = { externalRef?: string; displayName?: string; legalName?: string; taxId?: string };
export type BusinessSystemProduct = { externalRef?: string; code?: string; name: string; barcode?: string; category?: string; brand?: string; unit?: string; salePrice?: number; minimumSalePrice?: number; stockBalance?: number };
export type BusinessSystemStockLevel = { location: string; quantity: number; lastUpdatedAt?: string };
export type BusinessSystemPriceTable = { externalRef?: string; name: string };
export type BusinessSystemProductPrice = { productCode?: string; productName?: string; salePrice?: number };
export type BusinessSystemParty = { externalRef?: string; displayName?: string; legalName?: string; taxId?: string; email?: string; phone?: string; customer: boolean; supplier: boolean };
export type BusinessSystemOrder = { externalRef?: string; code: number; customerName?: string; status?: string; total?: number; createdAt?: string; invoiceNumber?: string };
export type BusinessSystemPage = { pageSize?: number; skip?: number };

export interface BusinessSystemReadProvider {
  probe(): Promise<BusinessSystemConnectionProbe>;
  listCompanies(): Promise<BusinessSystemCompany[]>;
  searchProducts(input?: BusinessSystemPage & { code?: string; name?: string; category?: string; brand?: string; barcode?: string }): Promise<BusinessSystemProduct[]>;
  getProductStock(input: { productCode: string; location: string }): Promise<BusinessSystemStockLevel[]>;
  listPriceTables(input?: BusinessSystemPage & { name?: string }): Promise<BusinessSystemPriceTable[]>;
  searchPriceTableProducts(input: BusinessSystemPage & { priceTableExternalRef: string; product?: string; category?: string; brand?: string }): Promise<BusinessSystemProductPrice[]>;
  searchParties(input?: BusinessSystemPage & { displayName?: string; taxId?: string; email?: string; customer?: boolean; supplier?: boolean }): Promise<BusinessSystemParty[]>;
  searchOrders(input?: BusinessSystemPage & { code?: number; customerName?: string; customerTaxId?: string; status?: string; createdFrom?: string; createdTo?: string }): Promise<BusinessSystemOrder[]>;
}
