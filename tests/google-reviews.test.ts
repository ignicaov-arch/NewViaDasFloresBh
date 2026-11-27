import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { selectLatestFiveStarWindow, verifyExactBusinessMatch } from '../scripts/sync_google_reviews.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');

describe('GMN 5-star reviews pipeline and site/linkbio layout contract', () => {
  it('verifies strong anti-homonym business anchors for Floricultura Via das Flores', () => {
    const valid = verifyExactBusinessMatch(
      {
        displayName: { text: 'Floricultura Via das Flores' },
        formattedAddress: 'R. da Bahia, 2741 - Savassi, Belo Horizonte - MG, 30160-012',
        websiteUri: 'https://buque.viadasflores.com.br/',
        nationalPhoneNumber: '(31) 3220-1818'
      },
      {
        nameToken: 'via das flores',
        city: 'belo horizonte',
        domain: 'viadasflores.com.br',
        phoneDigits: '3132201818'
      }
    );
    expect(valid).toBe(true);

    const homonym = verifyExactBusinessMatch(
      {
        displayName: { text: 'Floricultura Via das Flores' },
        formattedAddress: 'Av. Paulista, 100 - São Paulo - SP',
        websiteUri: 'https://outrosite.com.br/',
        nationalPhoneNumber: '(11) 99999-0000'
      },
      {
        nameToken: 'via das flores',
        city: 'belo horizonte',
        domain: 'viadasflores.com.br',
        phoneDigits: '3132201818'
      }
    );
    expect(homonym).toBe(false);
  });

  it('maintains 50->20 sliding window of newest 5-star reviews without freezing at 20', () => {
    const baseMs = Date.UTC(2026, 10, 1, 12, 0, 0);
    const existing = Array.from({ length: 26 }, (_, i) => ({
      reviewId: `old-${i}`,
      authorName: `Cliente ${i}`,
      rating: i % 6 === 0 ? 4 : 5,
      text: `Avaliação real antiga ${i}`,
      publishTime: new Date(baseMs - i * 3600_000).toISOString()
    }));

    const newest = [
      {
        reviewId: 'new-5-star',
        authorName: 'Novo Cliente 5 Estrelas',
        rating: 5,
        text: 'Atendimento impecável na Savassi!',
        publishTime: new Date(baseMs + 3600_000).toISOString()
      },
      {
        reviewId: 'new-3-star',
        authorName: 'Cliente Nota Baixa',
        rating: 3,
        text: 'Demorou um pouco',
        publishTime: new Date(baseMs + 7200_000).toISOString()
      }
    ];

    const { recentPool, fiveStarLatest } = selectLatestFiveStarWindow(newest, existing, {
      fetchLimit: 50,
      displayLimit: 20
    });

    expect(recentPool.length).toBe(28);
    expect(fiveStarLatest.length).toBe(20);
    expect(fiveStarLatest[0]?.reviewId).toBe('new-5-star');
    expect(fiveStarLatest.every((r) => r.rating === 5 && r.text.trim().length > 0)).toBe(true);
    expect(fiveStarLatest.some((r) => r.reviewId === 'new-3-star')).toBe(false);
    expect(fiveStarLatest.some((r) => r.reviewId === 'old-25')).toBe(false);
  });

  it('enforces dual crossed tracks on main site and single row on /linkbio', async () => {
    const [homeHtml, bioHtml, jsonRaw] = await Promise.all([
      fs.readFile(path.join(ROOT, 'index.html'), 'utf8'),
      fs.readFile(path.join(ROOT, 'linkbio/index.html'), 'utf8'),
      fs.readFile(path.join(ROOT, 'public/data/google-reviews.json'), 'utf8')
    ]);

    expect(homeHtml).toContain('data-google-reviews');
    expect(homeHtml).toContain('data-reviews-layout="dual"');
    expect(homeHtml).toContain('data-reviews-row="1"');
    expect(homeHtml).toContain('data-reviews-row="2"');
    expect(homeHtml).toContain('marquee-ltr');
    expect(homeHtml).toContain('marquee-rtl');

    expect(bioHtml).toContain('data-google-reviews');
    expect(bioHtml).toContain('data-reviews-layout="single"');
    expect(bioHtml).toContain('data-reviews-row="1"');
    expect(bioHtml).toContain('marquee-single');
    expect(bioHtml).not.toContain('data-reviews-row="2"');
    expect(bioHtml).not.toContain('data-reviews-layout="dual"');
    expect(bioHtml).not.toContain('marquee-ltr');

    const payload = JSON.parse(jsonRaw) as {
      verified: boolean;
      dataId: string;
      rating: number;
      reviews: Array<{ rating: number; text: string; authorName: string }>;
    };
    expect(payload.verified).toBe(true);
    expect(payload.dataId).toBe('0xa699d79fed3d6f:0x14049ca474e4ff81');
    expect(payload.rating).toBeGreaterThanOrEqual(4.5);
    expect(payload.reviews.length).toBeGreaterThan(0);
    expect(payload.reviews.length).toBeLessThanOrEqual(20);
    expect(payload.reviews.every((r) => r.rating === 5 && r.text.trim().length > 0 && r.authorName.trim().length > 0)).toBe(true);
  });
});
