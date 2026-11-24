function mapConditionOperator(rawType: string, negate: boolean): string {
  const op = rawType.toUpperCase().trim();

  const positiveMap: Record<string, string> = {
    CONTAINS: 'contains',
    EQUALS: 'equals',
    MATCH_REGEX: 'matches regex',
    REGEX: 'matches regex',
    STARTS_WITH: 'starts with',
    ENDS_WITH: 'ends with',
    CSS_SELECTOR: 'matches CSS selector',
    GREATER: 'is greater than',
    GREATER_OR_EQUALS: 'is greater than or equal to',
    LESS: 'is less than',
    LESS_OR_EQUALS: 'is less than or equal to',
    URL_MATCHES: 'URL matches',
  };

  const negativeMap: Record<string, string> = {
    CONTAINS: 'does not contain',
    EQUALS: 'does not equal',
    MATCH_REGEX: 'does not match regex',
    REGEX: 'does not match regex',
    STARTS_WITH: 'does not start with',
    ENDS_WITH: 'does not end with',
    CSS_SELECTOR: 'does not match CSS selector',
    GREATER: 'is not greater than',
    GREATER_OR_EQUALS: 'is not greater than or equal to',
    LESS: 'is not less than',
    LESS_OR_EQUALS: 'is not less than or equal to',
    URL_MATCHES: 'URL does not match',
  };

  if (positiveMap[op]) {
    return negate ? negativeMap[op] : positiveMap[op];
  }

  const lower = op.toLowerCase();
  if (lower.includes('contains')) return negate ? 'does not contain' : 'contains';
  if (lower.includes('equals') || lower === '==') return negate ? 'does not equal' : 'equals';
  if (lower.includes('regex') || lower.includes('match')) return negate ? 'does not match regex' : 'matches regex';
  if (lower.includes('starts')) return negate ? 'does not start with' : 'starts with';
  if (lower.includes('ends')) return negate ? 'does not end with' : 'ends with';
  if (lower.includes('css')) return negate ? 'does not match CSS selector' : 'matches CSS selector';

  return negate ? `does not match (${rawType || 'condition'})` : 'matches';
}

export function minifyGTM(rawJsonStr: string): any {
  function safeParse(jsonStr: string) {
    try {
      return JSON.parse(jsonStr);
    } catch (e: any) {
      throw new Error(`Error parsing JSON: ${e.message}`);
    }
  }

  function stripFields(obj: any) {
    if (!obj || typeof obj !== 'object') return;
    delete obj.fingerprint;
    delete obj.monitoringMetadata;
    delete obj.accountId;
    delete obj.containerId;
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (v && typeof v === 'object') stripFields(v);
    }
  }

  function arrayToMap(arr: any[], idKey: string, nameKey: string) {
    const m: Record<string, string> = {};
    if (!Array.isArray(arr)) return m;
    for (const it of arr) {
      if (!it) continue;
      const id = it[idKey];
      const name = it[nameKey] || it.name || null;
      if (id != null) m[String(id)] = name || String(id);
    }
    return m;
  }

  function replaceVarTokensInString(s: any, varMap: Record<string, string>) {
    if (typeof s !== 'string') return s;
    return s.replace(/\{\{_u:(\d+)\}\}/g, (m, id) => {
      const name = varMap[String(id)];
      return name ? `{{${name}}}` : m;
    });
  }

  function parseNode(node: any, varMap: Record<string, string>): any {
    if (node == null || typeof node !== 'object') return node;
    const t = node.type;

    if ((t === 'TEMPLATE' || t === 'BOOLEAN' || t === 'INTEGER' || t === 'NUMBER') && 'value' in node) {
      return replaceVarTokensInString(node.value, varMap);
    }

    if (t === 'MAP' && Array.isArray(node.map)) {
      const out: any = {};
      for (const entry of node.map) {
        if (!entry || !entry.key) continue;
        if (entry.type === 'LIST' && Array.isArray(entry.list)) {
          out[entry.key] = entry.list.map((x: any) => parseNode(x, varMap));
        } else if (entry.type === 'MAP' && Array.isArray(entry.map)) {
          out[entry.key] = parseNode(entry, varMap);
        } else {
          out[entry.key] = replaceVarTokensInString(entry.value, varMap);
        }
      }
      return out;
    }

    if (t === 'LIST' && Array.isArray(node.list)) {
      return node.list.map((x: any) => parseNode(x, varMap));
    }

    if (Array.isArray(node.parameter)) {
      const obj: any = {};
      for (const p of node.parameter) {
        if (!p || !p.key) continue;
        if (p.type === 'LIST' && Array.isArray(p.list)) {
          obj[p.key] = p.list.map((x: any) => parseNode(x, varMap));
        } else if (p.type === 'MAP' && Array.isArray(p.map)) {
          obj[p.key] = parseNode(p, varMap);
        } else {
          obj[p.key] = replaceVarTokensInString(p.value, varMap);
        }
      }
      return obj;
    }

    const copy: any = Array.isArray(node) ? [] : {};
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (typeof v === 'string') copy[k] = replaceVarTokensInString(v, varMap);
      else if (Array.isArray(v)) copy[k] = v.map((x: any) => parseNode(x, varMap));
      else if (v && typeof v === 'object') copy[k] = parseNode(v, varMap);
      else copy[k] = v;
    }
    return copy;
  }

  function normalizeParameters(parameterArray: any[], varMap: Record<string, string>) {
    if (!Array.isArray(parameterArray)) return {};
    const out: any = {};
    for (const p of parameterArray) {
      if (!p || !p.key) continue;
      const key = p.key;
      if (p.type === 'LIST' && Array.isArray(p.list)) {
        const parsedList = p.list.map((el: any) => parseNode(el, varMap));
        if (
          parsedList.every(
            (item: any) =>
              item &&
              typeof item === 'object' &&
              ('parameter' in item || 'parameterValue' in item || 'parameterName' in item),
          )
        ) {
          const merged: any = {};
          for (const item of parsedList) {
            const paramName = item.parameter || item.parameterName || null;
            const paramVal = item.parameterValue || item.value || item.parameter_val || null;
            if (paramName) {
              merged[paramName] = replaceVarTokensInString(String(paramVal ?? ''), varMap);
            } else {
              Object.assign(merged, item);
            }
          }
          out[key] = merged;
        } else {
          out[key] = parsedList;
        }
      } else if (p.type === 'MAP' && Array.isArray(p.map)) {
        out[key] = parseNode({ type: 'MAP', map: p.map }, varMap);
      } else {
        out[key] = replaceVarTokensInString(p.value === undefined ? '' : String(p.value), varMap);
      }
    }
    return out;
  }

  function formatCondition(cond: any, varMap: Record<string, string>): string {
    const paramObj: any = {};
    for (const p of cond.parameter) {
      if (!p || !p.key) continue;
      paramObj[p.key] = p.value;
    }

    const rawArg0 = paramObj.arg0 ?? paramObj.parameter ?? paramObj.left ?? '';
    const rawArg1 = paramObj.arg1 ?? paramObj.parameterValue ?? paramObj.right ?? '';
    const rawType = String(cond.type || paramObj.type || paramObj.operator || paramObj.matchType || '');
    const negate = String(paramObj.negate ?? '').toLowerCase() === 'true';
    const ignoreCase = String(paramObj.ignore_case ?? '').toLowerCase() === 'true';

    const arg0 = replaceVarTokensInString(String(rawArg0), varMap);
    const arg1 = replaceVarTokensInString(String(rawArg1), varMap);
    const opWord = mapConditionOperator(rawType, negate);
    const caseSuffix = ignoreCase ? ' (case-insensitive)' : '';

    return `${arg0} ${opWord} ${arg1}${caseSuffix}`.trim();
  }

  function humanizeTriggers(
    triggerArray: any[],
    varMap: Record<string, string>,
    triggerMap: Record<string, string>,
  ) {
    if (!Array.isArray(triggerArray)) return [];
    for (const trig of triggerArray) {
      delete trig.fingerprint;
      delete trig.monitoringMetadata;
      delete trig.accountId;
      delete trig.containerId;

      const conditions: string[] = [];

      for (const prop of Object.keys(trig)) {
        const val = trig[prop];
        if (!Array.isArray(val)) continue;
        const looksLikeConditionArray =
          val.length > 0 && val.every((el) => el && Array.isArray(el.parameter));
        if (!looksLikeConditionArray) continue;

        for (const cond of val) {
          conditions.push(formatCondition(cond, varMap));
        }

        delete trig[prop];
      }

      if (Array.isArray(trig.firingTriggerId)) {
        trig.firingTriggerNames = trig.firingTriggerId.map((id: any) => triggerMap[String(id)] || id);
        delete trig.firingTriggerId;
      }

      if (Array.isArray(trig.blockingTriggerId)) {
        trig.blockingTriggerNames = trig.blockingTriggerId.map((id: any) => triggerMap[String(id)] || id);
        delete trig.blockingTriggerId;
      }

      if (conditions.length) trig.conditions = conditions;

      for (const k of Object.keys(trig)) {
        if (typeof trig[k] === 'string') trig[k] = replaceVarTokensInString(trig[k], varMap);
      }
    }
    return triggerArray;
  }

  function finalizeStrings(node: any, varMap: Record<string, string>): any {
    if (typeof node === 'string') {
      const resolved = node.replace(/\{\{_u:(\d+)\}\}/g, (_m, id) => {
        const name = varMap[String(id)];
        return `{{${name || `_u:${id}`}}}`;
      });
      return resolved.replace(/\n{2,}/g, '\n');
    }
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        node[i] = finalizeStrings(node[i], varMap);
      }
      return node;
    }
    if (node && typeof node === 'object') {
      for (const k of Object.keys(node)) {
        node[k] = finalizeStrings(node[k], varMap);
      }
    }
    return node;
  }

  const data = safeParse(rawJsonStr);
  const root = data?.containerVersion ? data.containerVersion : data;

  const varMap = arrayToMap(root.variable || [], 'variableId', 'name');
  const triggerMap = arrayToMap(root.trigger || [], 'triggerId', 'name');
  const customTemplateMap = arrayToMap(root.customTemplate || [], 'templateId', 'name');

  if (Array.isArray(root.tag)) {
    for (const t of root.tag) {
      delete t.fingerprint;
      delete t.monitoringMetadata;
      delete t.accountId;
      delete t.containerId;

      if (Array.isArray(t.parameter)) {
        t.params = normalizeParameters(t.parameter, varMap);
        delete t.parameter;
      }

      if (Array.isArray(t.firingTriggerId)) {
        t.firingTriggers = t.firingTriggerId.map((id: any) => triggerMap[String(id)] || id);
        delete t.firingTriggerId;
      }

      if (Array.isArray(t.blockingTriggerId)) {
        t.blockingTriggers = t.blockingTriggerId.map((id: any) => triggerMap[String(id)] || id);
        delete t.blockingTriggerId;
      }

      if (typeof t.type === 'string' && t.type.indexOf('cvt_') === 0) {
        const m = t.type.match(/cvt_[^_]*_(\d+)/);
        if (m && m[1]) {
          const tmplName = customTemplateMap[String(m[1])];
          t.type = tmplName ? `[Template] ${tmplName}` : `[Template:${m[1]}]`;
        }
      }

      if (t.name && typeof t.name === 'string') {
        t.name = replaceVarTokensInString(t.name, varMap);
      }

      if (t.params && typeof t.params === 'object') {
        const stack = [t.params];
        while (stack.length) {
          const node = stack.pop();
          if (!node || typeof node !== 'object') continue;
          for (const k of Object.keys(node)) {
            const v = node[k];
            if (typeof v === 'string') node[k] = replaceVarTokensInString(v, varMap);
            else if (v && typeof v === 'object') stack.push(v);
          }
        }
      }
    }
  }

  if (Array.isArray(root.trigger)) {
    humanizeTriggers(root.trigger, varMap, triggerMap);
  }

  if (Array.isArray(root.variable)) {
    for (const v of root.variable) {
      delete v.fingerprint;
      delete v.monitoringMetadata;
      delete v.accountId;
      delete v.containerId;
      if (v.name && typeof v.name === 'string') {
        v.name = replaceVarTokensInString(v.name, varMap);
      }
    }
  }

  if (Array.isArray(root.customTemplate)) {
    for (const c of root.customTemplate) {
      const keep: any = { templateId: c.templateId, name: c.name };
      if (c.templateData && typeof c.templateData === 'string') {
        let td = c.templateData;
        td = td
          .replace(/___TESTS___[\s\S]*?(?=___|$)/, '')
          .replace(/___INFO___[\s\S]*?(?=___|$)/, '');
        keep.templateData = td.trim();
      }
      Object.keys(c).forEach((k) => delete c[k]);
      Object.assign(c, keep);
    }
  }

  stripFields(root);
  delete data.accountId;
  delete data.containerId;

  return finalizeStrings(data, varMap);
}

export function minifyGTMToString(rawJsonStr: string): string {
  return JSON.stringify(minifyGTM(rawJsonStr));
}
