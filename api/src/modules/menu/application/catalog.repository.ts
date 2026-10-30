import { Catalog } from '../domain/catalog';

export abstract class CatalogRepository {
  abstract load(): Promise<Catalog>;
}
