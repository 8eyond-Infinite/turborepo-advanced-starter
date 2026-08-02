export const MENU_READER = Symbol('MENU_READER');

export interface MenuRecord {
  id: string;
  parentId: string | null;
  title: string;
  url: string;
  icon: string | null;
  permission: string | null;
}

export interface MenuReader {
  findAllOrdered(): Promise<MenuRecord[]>;
}
