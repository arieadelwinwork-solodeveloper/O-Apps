import { useMemo } from "react";
import {
  categoriesForRole,
  categoryLabel,
  menuCategoryForRole,
  menusForRole,
} from "../../config/menuItems";
import type { MenuItem } from "../../config/menuItems";
import type { UserRole } from "../../types";

export interface MenuBlockItem {
  item: MenuItem;
  stripe: boolean;
}

export interface MenuBlock {
  cat: string;
  label: string;
  items: MenuBlockItem[];
}

export function useMenuBlocks(role: UserRole): MenuBlock[] {
  const menus = useMemo(() => menusForRole(role), [role]);

  return useMemo(() => {
    const order = categoriesForRole(role);
    let stripeIndex = 0;
    return order
      .map((cat) => ({
        cat,
        label: categoryLabel(cat, role),
        items: menus
          .filter((m) => menuCategoryForRole(m, role) === cat)
          .map((item) => {
            const stripe = stripeIndex % 2 === 0;
            stripeIndex += 1;
            return { item, stripe };
          }),
      }))
      .filter((b) => b.items.length > 0);
  }, [menus, role]);
}
