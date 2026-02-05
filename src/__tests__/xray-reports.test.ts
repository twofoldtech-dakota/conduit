/**
 * X-Ray Reports Tests
 */

import { describe, it, expect } from 'vitest';
import { generateReport, generateSummary } from '../xray/reports.js';
import type { AnalysisResult, AnalysisStats } from '../xray/types.js';

describe('generateReport', () => {
  const baseStats: AnalysisStats = {
    totalItems: 100,
    totalTemplates: 10,
    totalMedia: 20,
    totalRenderings: 15,
    orphanedItems: 0,
    unusedTemplates: 0,
    unusedRenderings: 0,
    brokenLinks: 0,
    duplicates: 0,
    securityIssues: 0,
    deeplyNested: 0,
    largeMedia: 0,
    staleContent: 0,
    circularRefs: 0,
    emptyContainers: 0,
    invalidFields: 0,
    avgDepth: 3,
    maxDepth: 5,
    itemsPerTemplate: {},
  };

  it('generates basic report', () => {
    const analysis: AnalysisResult = {
      scanId: 'scan-123',
      analyzedAt: '2024-01-01T00:00:00Z',
      healthScore: 85,
      healthGrade: 'B',
      issues: [],
      stats: baseStats,
    };

    const report = generateReport(analysis, 'https://sitecore.local', 5000);

    expect(report.scanId).toBe('scan-123');
    expect(report.instanceUrl).toBe('https://sitecore.local');
    expect(report.healthScore).toBe(85);
    expect(report.healthGrade).toBe('B');
    expect(report.scanDuration).toBe(5000);
    expect(report.generatedAt).toBeDefined();
    expect(report.stats).toEqual(baseStats);
    expect(report.issues).toEqual([]);
    expect(report.recommendations).toBeDefined();
  });

  it('generates security recommendations for security issues', () => {
    const analysis: AnalysisResult = {
      scanId: 'scan-sec',
      analyzedAt: new Date().toISOString(),
      healthScore: 60,
      healthGrade: 'D',
      issues: [],
      stats: { ...baseStats, securityIssues: 5 },
    };

    const report = generateReport(analysis, 'https://site.com', 1000);

    expect(report.recommendations.length).toBeGreaterThan(0);
    const secRec = report.recommendations.find(r => r.title === 'Fix Security Vulnerabilities');
    expect(secRec).toBeDefined();
    expect(secRec?.priority).toBe('high');
    expect(secRec?.affectedItems).toBe(5);
  });

  it('generates broken link recommendations', () => {
    const analysis: AnalysisResult = {
      scanId: 'scan-links',
      analyzedAt: new Date().toISOString(),
      healthScore: 70,
      healthGrade: 'C',
      issues: [],
      stats: { ...baseStats, brokenLinks: 10 },
    };

    const report = generateReport(analysis, 'https://site.com', 1000);

    const linkRec = report.recommendations.find(r => r.title === 'Repair Broken Links');
    expect(linkRec).toBeDefined();
    expect(linkRec?.priority).toBe('high');
    expect(linkRec?.affectedItems).toBe(10);
  });

  it('generates large media recommendations', () => {
    const analysis: AnalysisResult = {
      scanId: 'scan-media',
      analyzedAt: new Date().toISOString(),
      healthScore: 75,
      healthGrade: 'C',
      issues: [],
      stats: { ...baseStats, largeMedia: 15 },
    };

    const report = generateReport(analysis, 'https://site.com', 1000);

    const mediaRec = report.recommendations.find(r => r.title === 'Optimize Large Media Files');
    expect(mediaRec).toBeDefined();
    expect(mediaRec?.priority).toBe('high');
    expect(mediaRec?.effort).toBe('low');
  });

  it('generates deep nesting recommendations', () => {
    const analysis: AnalysisResult = {
      scanId: 'scan-nest',
      analyzedAt: new Date().toISOString(),
      healthScore: 80,
      healthGrade: 'B',
      issues: [],
      stats: { ...baseStats, deeplyNested: 8 },
    };

    const report = generateReport(analysis, 'https://site.com', 1000);

    const nestRec = report.recommendations.find(r => r.title === 'Flatten Content Structure');
    expect(nestRec).toBeDefined();
    expect(nestRec?.priority).toBe('medium');
  });

  it('generates orphan recommendations', () => {
    const analysis: AnalysisResult = {
      scanId: 'scan-orphan',
      analyzedAt: new Date().toISOString(),
      healthScore: 85,
      healthGrade: 'B',
      issues: [],
      stats: { ...baseStats, orphanedItems: 3 },
    };

    const report = generateReport(analysis, 'https://site.com', 1000);

    const orphanRec = report.recommendations.find(r => r.title === 'Clean Up Orphaned Items');
    expect(orphanRec).toBeDefined();
    expect(orphanRec?.priority).toBe('medium');
  });

  it('generates stale content recommendations', () => {
    const analysis: AnalysisResult = {
      scanId: 'scan-stale',
      analyzedAt: new Date().toISOString(),
      healthScore: 85,
      healthGrade: 'B',
      issues: [],
      stats: { ...baseStats, staleContent: 12 },
    };

    const report = generateReport(analysis, 'https://site.com', 1000);

    const staleRec = report.recommendations.find(r => r.title === 'Review Stale Content');
    expect(staleRec).toBeDefined();
    expect(staleRec?.priority).toBe('medium');
  });

  it('generates unused template recommendations', () => {
    const analysis: AnalysisResult = {
      scanId: 'scan-templates',
      analyzedAt: new Date().toISOString(),
      healthScore: 90,
      healthGrade: 'A',
      issues: [],
      stats: { ...baseStats, unusedTemplates: 4 },
    };

    const report = generateReport(analysis, 'https://site.com', 1000);

    const templateRec = report.recommendations.find(r => r.title === 'Remove Unused Templates');
    expect(templateRec).toBeDefined();
    expect(templateRec?.priority).toBe('low');
  });

  it('generates unused rendering recommendations', () => {
    const analysis: AnalysisResult = {
      scanId: 'scan-renderings',
      analyzedAt: new Date().toISOString(),
      healthScore: 90,
      healthGrade: 'A',
      issues: [],
      stats: { ...baseStats, unusedRenderings: 6 },
    };

    const report = generateReport(analysis, 'https://site.com', 1000);

    const renderRec = report.recommendations.find(r => r.title === 'Remove Unused Renderings');
    expect(renderRec).toBeDefined();
    expect(renderRec?.priority).toBe('low');
  });

  it('generates empty container recommendations', () => {
    const analysis: AnalysisResult = {
      scanId: 'scan-empty',
      analyzedAt: new Date().toISOString(),
      healthScore: 92,
      healthGrade: 'A',
      issues: [],
      stats: { ...baseStats, emptyContainers: 7 },
    };

    const report = generateReport(analysis, 'https://site.com', 1000);

    const emptyRec = report.recommendations.find(r => r.title === 'Clean Up Empty Folders');
    expect(emptyRec).toBeDefined();
    expect(emptyRec?.priority).toBe('low');
  });

  it('generates duplicate recommendations', () => {
    const analysis: AnalysisResult = {
      scanId: 'scan-dupes',
      analyzedAt: new Date().toISOString(),
      healthScore: 88,
      healthGrade: 'B',
      issues: [],
      stats: { ...baseStats, duplicates: 9 },
    };

    const report = generateReport(analysis, 'https://site.com', 1000);

    const dupeRec = report.recommendations.find(r => r.title === 'Review Duplicate Items');
    expect(dupeRec).toBeDefined();
    expect(dupeRec?.priority).toBe('low');
  });

  it('prioritizes high priority recommendations first', () => {
    const analysis: AnalysisResult = {
      scanId: 'scan-priority',
      analyzedAt: new Date().toISOString(),
      healthScore: 60,
      healthGrade: 'D',
      issues: [],
      stats: {
        ...baseStats,
        unusedTemplates: 1, // low
        orphanedItems: 2,   // medium
        securityIssues: 3,  // high
      },
    };

    const report = generateReport(analysis, 'https://site.com', 1000);

    expect(report.recommendations.length).toBe(3);
    expect(report.recommendations[0].priority).toBe('high');
    expect(report.recommendations[1].priority).toBe('medium');
    expect(report.recommendations[2].priority).toBe('low');
  });
});

describe('generateSummary', () => {
  it('generates summary with all sections', () => {
    const report = {
      scanId: 'scan-123',
      generatedAt: '2024-01-01T12:00:00Z',
      instanceUrl: 'https://sitecore.example.com',
      healthScore: 85,
      healthGrade: 'B' as const,
      scanDuration: 5000,
      stats: {
        totalItems: 1000,
        totalTemplates: 50,
        totalMedia: 200,
        totalRenderings: 75,
      } as any,
      issues: [
        { id: '1', severity: 'critical' as const, category: 'security' as const, title: 'Issue 1', description: 'Desc 1', itemPath: '/path1' },
        { id: '2', severity: 'warning' as const, category: 'performance' as const, title: 'Issue 2', description: 'Desc 2', itemPath: '/path2' },
        { id: '3', severity: 'info' as const, category: 'quality' as const, title: 'Issue 3', description: 'Desc 3', itemPath: '/path3' },
      ],
      recommendations: [
        { priority: 'high' as const, title: 'Fix Security', description: 'Desc', affectedItems: 5 },
        { priority: 'medium' as const, title: 'Clean Orphans', description: 'Desc', affectedItems: 3 },
      ],
    };

    const summary = generateSummary(report);

    expect(summary).toContain('Sitecore X-Ray Report');
    expect(summary).toContain('https://sitecore.example.com');
    expect(summary).toContain('Health Score: 85/100 (B)');
    expect(summary).toContain('Total Items: 1,000');
    expect(summary).toContain('Total Templates: 50');
    expect(summary).toContain('Total Media: 200');
    expect(summary).toContain('Total Renderings: 75');
    expect(summary).toContain('Critical: 1');
    expect(summary).toContain('Warning: 1');
    expect(summary).toContain('Info: 1');
    expect(summary).toContain('Fix Security');
    expect(summary).toContain('Clean Orphans');
  });

  it('formats scan duration', () => {
    const report = {
      scanId: 'scan-duration',
      generatedAt: '2024-01-01T00:00:00Z',
      instanceUrl: 'https://site.com',
      healthScore: 90,
      healthGrade: 'A' as const,
      scanDuration: 12345,
      stats: { totalItems: 0, totalTemplates: 0, totalMedia: 0, totalRenderings: 0 } as any,
      issues: [],
      recommendations: [],
    };

    const summary = generateSummary(report);
    expect(summary).toContain('12.3s');
  });

  it('shows top 5 recommendations only', () => {
    const recommendations = Array.from({ length: 10 }, (_, i) => ({
      priority: 'high' as const,
      title: `Rec ${i + 1}`,
      description: 'Desc',
      affectedItems: i + 1,
    }));

    const report = {
      scanId: 'scan-many-recs',
      generatedAt: '2024-01-01T00:00:00Z',
      instanceUrl: 'https://site.com',
      healthScore: 70,
      healthGrade: 'C' as const,
      scanDuration: 1000,
      stats: { totalItems: 0, totalTemplates: 0, totalMedia: 0, totalRenderings: 0 } as any,
      issues: [],
      recommendations,
    };

    const summary = generateSummary(report);

    // Should contain first 5
    expect(summary).toContain('Rec 1');
    expect(summary).toContain('Rec 5');
    // Should not contain 6th and beyond
    expect(summary).not.toContain('Rec 6');
  });

  it('uses correct icons for priorities', () => {
    const report = {
      scanId: 'scan-icons',
      generatedAt: '2024-01-01T00:00:00Z',
      instanceUrl: 'https://site.com',
      healthScore: 80,
      healthGrade: 'B' as const,
      scanDuration: 1000,
      stats: { totalItems: 0, totalTemplates: 0, totalMedia: 0, totalRenderings: 0 } as any,
      issues: [],
      recommendations: [
        { priority: 'high' as const, title: 'High Priority', description: 'Desc', affectedItems: 1 },
        { priority: 'medium' as const, title: 'Med Priority', description: 'Desc', affectedItems: 2 },
        { priority: 'low' as const, title: 'Low Priority', description: 'Desc', affectedItems: 3 },
      ],
    };

    const summary = generateSummary(report);

    // High priority should have red icon
    const highLine = summary.split('\n').find(l => l.includes('High Priority'));
    expect(highLine).toContain('🔴');

    // Medium priority should have yellow icon
    const medLine = summary.split('\n').find(l => l.includes('Med Priority'));
    expect(medLine).toContain('🟡');

    // Low priority should have blue icon
    const lowLine = summary.split('\n').find(l => l.includes('Low Priority'));
    expect(lowLine).toContain('🔵');
  });
});
