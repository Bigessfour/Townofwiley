export type OrdinanceQuestionScope = 'empty' | 'ordinance' | 'out-of-scope';

/**
 * Courtesy filter for the public page. The Town API enforces the same
 * rules in infrastructure/terraform/stacks/ordinance-assistant/lambda/ask.py
 * before it retrieves a section or calls the model.
 */
const MISUSE_PATTERNS: readonly RegExp[] = [
  /\b(homework|essay|term paper|book report|poem|short story|fanfic|tarea|ensayo)\b/i,
  /\b(python|javascript|typescript|\bjava\b|c\+\+|sql)\b/i,
  /\b(recipe|movie|celebrity|stock price|horoscope|netflix|receta|pel[ií]cula)\b/i,
  /\b(?:write|draft|redacta|escribe)(?:\s+\w+){0,3}\s+(?:a |an |my |un |una )?(?:poem|story|email|code|script|essay|paper|correo|ensayo|c[oó]digo)\b/i,
  /\b\d+\s*[+*/x×]\s*\d+\b/,
  /\b\d+\s+-\s+\d+\b/,
];

const ORDINANCE_PATTERNS: readonly RegExp[] = [
  /\b(ordinance|municipal code|wiley|section|sec\.|chapter|permit|zoning|dog|animal|fence|weed|grass|lawn|yard|building|alcohol|noise|parking|water|sewer|trash|garbage|license|penalty|trustee|mayor|annexation|subdivision|franchise|utility|sidewalk|traffic|offense|sanitation|nuisance|livestock|rabies|vehicle|car|automobile|truck|street|abandoned|tree|junk)\b/i,
  /\b(pets?|cats?|chickens?|poultry|leash|bark(?:ing)?|kennels?|sheds?|decks?|garages?|setbacks?|variances?|burns?|fireworks|snow|rv|trailers?|campers?|signs?|business(?:es)?|vendors?|pools?|curfew|recycl(?:e|ing)|meters?|alleys?|easements?|coops?)\b/i,
  /\b(ordenanza|c[oó]digo municipal|permisos?|zonificaci[oó]n|perros?|animal(?:es)?|licencias?|alcald[eí]|anexi[oó]n|basura|agua|alcantarillado|ruido|estacionamiento|estacionar|acera|tr[aá]fico|multas?|malezas|pasto|c[eé]sped|cerc[ao]s?|veh[ií]culos?|carros?|calles?|abandonad)\b/i,
  /\b(mascotas?|gatos?|gallinas?|pollos?|vallas?|quejas?|construir|construcci[oó]n|patios?|negocios?|remolques?|nieve|quemas?|letreros?)\b/i,
  /\b\d{1,2}-\d{1,2}-\d{1,3}\b/,
];

export function assessOrdinanceQuestion(text: string): OrdinanceQuestionScope {
  const trimmed = text.trim();
  if (!trimmed) {
    return 'empty';
  }

  if (MISUSE_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return 'out-of-scope';
  }

  if (ORDINANCE_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return 'ordinance';
  }

  return 'out-of-scope';
}
