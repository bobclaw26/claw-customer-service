import { sheets_v4 } from 'googleapis';
import NodeCache from 'node-cache';

export interface KnowledgeBaseEntry {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
  lastUpdated?: number;
}

export class KnowledgeBaseService {
  private sheetsAPI: sheets_v4.Sheets;
  private spreadsheetId: string;
  private cache: NodeCache;
  private cacheKeyPrefix = 'kb:';

  constructor(sheetsAPI: sheets_v4.Sheets, spreadsheetId: string) {
    this.sheetsAPI = sheetsAPI;
    this.spreadsheetId = spreadsheetId;
    this.cache = new NodeCache({ stdTTL: 3600 }); // 1 hour cache
  }

  /**
   * Load knowledge base from Google Sheet
   * Expected sheet format:
   * | Category | Question | Answer | Keywords |
   */
  async loadKnowledgeBase(): Promise<KnowledgeBaseEntry[]> {
    const cacheKey = `${this.cacheKeyPrefix}all`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached as KnowledgeBaseEntry[];
    }

    try {
      const response = await this.sheetsAPI.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'KB!A2:D1000' // Skip header row
      });

      const rows = response.data.values || [];
      const entries: KnowledgeBaseEntry[] = [];

      rows.forEach((row, index) => {
        if (row.length >= 3) {
          entries.push({
            id: `kb-${index}`,
            category: row[0]?.trim() || 'General',
            question: row[1]?.trim() || '',
            answer: row[2]?.trim() || '',
            keywords: (row[3]?.split(',') || []).map((k: string) => k.trim().toLowerCase()),
            lastUpdated: Date.now()
          });
        }
      });

      this.cache.set(cacheKey, entries);
      return entries;
    } catch (error) {
      console.error('Error loading knowledge base from Google Sheets:', error);
      throw error;
    }
  }

  /**
   * Get formatted knowledge base as context string for LLM
   */
  async getFormattedContext(category?: string): Promise<string> {
    const entries = await this.loadKnowledgeBase();
    const filtered = category
      ? entries.filter(e => e.category.toLowerCase() === category.toLowerCase())
      : entries;

    if (filtered.length === 0) {
      return 'No knowledge base entries available.';
    }

    const formatted = filtered
      .map(entry => `Q: ${entry.question}\nA: ${entry.answer}`)
      .join('\n\n');

    return `KNOWLEDGE BASE:\n${formatted}`;
  }

  /**
   * Find relevant entries for a query
   */
  async findRelevantEntries(query: string, limit: number = 5): Promise<KnowledgeBaseEntry[]> {
    const entries = await this.loadKnowledgeBase();
    const queryWords = query.toLowerCase().split(/\s+/);

    const scored = entries.map(entry => {
      let score = 0;

      // Check if keywords match
      queryWords.forEach(word => {
        entry.keywords.forEach(keyword => {
          if (keyword.includes(word) || word.includes(keyword)) {
            score += 2;
          }
        });

        // Check question and answer
        if (entry.question.toLowerCase().includes(word)) {score += 1;}
        if (entry.answer.toLowerCase().includes(word)) {score += 0.5;}
      });

      return { entry, score };
    });

    return scored
      .filter(s => s.score > 0)
      .toSorted((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.entry);
  }

  /**
   * Add a new entry to the knowledge base
   */
  async addEntry(entry: Omit<KnowledgeBaseEntry, 'id' | 'lastUpdated'>): Promise<void> {
    try {
      await this.sheetsAPI.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'KB!A:D',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [
            [
              entry.category,
              entry.question,
              entry.answer,
              entry.keywords.join(', ')
            ]
          ]
        }
      });

      // Clear cache after modification
      this.cache.del(`${this.cacheKeyPrefix}all`);
    } catch (error) {
      console.error('Error adding knowledge base entry:', error);
      throw error;
    }
  }

  /**
   * Update an existing entry (by row index)
   */
  async updateEntry(rowIndex: number, entry: Partial<KnowledgeBaseEntry>): Promise<void> {
    try {
      const updates: any = {};
      const row = rowIndex + 2; // +1 for header, +1 for sheet row offset

      if (entry.category) {updates['KB!A' + row] = entry.category;}
      if (entry.question) {updates['KB!B' + row] = entry.question;}
      if (entry.answer) {updates['KB!C' + row] = entry.answer;}
      if (entry.keywords) {updates['KB!D' + row] = entry.keywords.join(', ');}

      await this.sheetsAPI.spreadsheets.values.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          data: Object.entries(updates).map(([range, value]) => ({
            range,
            values: [[value]]
          })),
          valueInputOption: 'USER_ENTERED'
        }
      });

      // Clear cache after modification
      this.cache.del(`${this.cacheKeyPrefix}all`);
    } catch (error) {
      console.error('Error updating knowledge base entry:', error);
      throw error;
    }
  }

  /**
   * Get statistics about the knowledge base
   */
  async getStats(): Promise<{
    total_entries: number;
    categories: Record<string, number>;
    last_updated: number;
  }> {
    const entries = await this.loadKnowledgeBase();
    const categories: Record<string, number> = {};

    entries.forEach(entry => {
      categories[entry.category] = (categories[entry.category] || 0) + 1;
    });

    return {
      total_entries: entries.length,
      categories,
      last_updated: Date.now()
    };
  }

  /**
   * Clear cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.cache.flushAll();
  }

  /**
   * Export knowledge base as JSON
   */
  async exportAsJSON(): Promise<KnowledgeBaseEntry[]> {
    return this.loadKnowledgeBase();
  }

  /**
   * Import knowledge base from JSON
   */
  async importFromJSON(entries: KnowledgeBaseEntry[]): Promise<void> {
    try {
      // Clear existing data first
      await this.sheetsAPI.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: 'KB!A2:D'
      });

      // Add all entries
      const values = entries.map(e => [
        e.category,
        e.question,
        e.answer,
        e.keywords.join(', ')
      ]);

      if (values.length > 0) {
        await this.sheetsAPI.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: 'KB!A2',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values }
        });
      }

      this.cache.flushAll();
    } catch (error) {
      console.error('Error importing knowledge base:', error);
      throw error;
    }
  }
}

/**
 * Helper to create KB service from Google Sheets API
 */
export async function createKnowledgeBaseService(
  sheetsAPI: sheets_v4.Sheets,
  spreadsheetId: string
): Promise<KnowledgeBaseService> {
  const service = new KnowledgeBaseService(sheetsAPI, spreadsheetId);

  // Verify the sheet exists and is accessible
  try {
    await service.loadKnowledgeBase();
    console.log('Knowledge Base Service initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Knowledge Base Service:', error);
    throw error;
  }

  return service;
}
