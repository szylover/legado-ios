import { db } from '../db';
import type { ReplaceRule } from '../entities/ReplaceRule';

export const ReplaceRuleDao = {
  getAll: () => db.replaceRules.orderBy('order').toArray(),
  getEnabled: () => db.replaceRules.filter(r => r.enabled).sortBy('order'),
  upsert: (rule: ReplaceRule) => db.replaceRules.put(rule),
  delete: (id: number) => db.replaceRules.delete(id),
  setEnabled: (id: number, enabled: boolean) => db.replaceRules.update(id, { enabled }),
};
