/**
 * Sitecore X-Ray Report Generator
 * 
 * Generates actionable reports with recommendations.
 */

import {
  type AnalysisResult,
  type XRayReport,
  type Recommendation,
  type Issue,
} from './types.js';

/**
 * Generate a full X-Ray report with recommendations.
 */
export function generateReport(
  analysis: AnalysisResult,
  instanceUrl: string,
  scanDuration: number
): XRayReport {
  const recommendations = generateRecommendations(analysis);

  return {
    scanId: analysis.scanId,
    generatedAt: new Date().toISOString(),
    instanceUrl,
    healthScore: analysis.healthScore,
    healthGrade: analysis.healthGrade,
    scanDuration,
    stats: analysis.stats,
    issues: analysis.issues,
    recommendations,
  };
}

/**
 * Generate prioritized recommendations based on analysis.
 */
function generateRecommendations(analysis: AnalysisResult): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const { stats } = analysis;

  // Critical: Security issues
  if (stats.securityIssues > 0) {
    recommendations.push({
      priority: 'high',
      title: 'Fix Security Vulnerabilities',
      description: `${stats.securityIssues} items have overly permissive security settings that could expose content to unauthorized users.`,
      impact: 'Prevents unauthorized access and potential data breaches',
      effort: 'medium',
      affectedItems: stats.securityIssues,
    });
  }

  // Critical: Broken links
  if (stats.brokenLinks > 0) {
    recommendations.push({
      priority: 'high',
      title: 'Repair Broken Links',
      description: `${stats.brokenLinks} broken references found. These cause errors for visitors and hurt SEO.`,
      impact: 'Improves user experience and search rankings',
      effort: 'medium',
      affectedItems: stats.brokenLinks,
    });
  }

  // Critical: Large media
  if (stats.largeMedia > 0) {
    recommendations.push({
      priority: 'high',
      title: 'Optimize Large Media Files',
      description: `${stats.largeMedia} media files exceed recommended size limits, slowing page loads.`,
      impact: 'Faster page loads, better Core Web Vitals',
      effort: 'low',
      affectedItems: stats.largeMedia,
    });
  }

  // Warning: Deep nesting
  if (stats.deeplyNested > 0) {
    recommendations.push({
      priority: 'medium',
      title: 'Flatten Content Structure',
      description: `${stats.deeplyNested} items are nested too deeply, causing performance issues in Sitecore.`,
      impact: 'Improved content editor performance',
      effort: 'high',
      affectedItems: stats.deeplyNested,
    });
  }

  // Warning: Orphaned items
  if (stats.orphanedItems > 0) {
    recommendations.push({
      priority: 'medium',
      title: 'Clean Up Orphaned Items',
      description: `${stats.orphanedItems} items have missing parents and may not be accessible.`,
      impact: 'Cleaner content tree, easier maintenance',
      effort: 'low',
      affectedItems: stats.orphanedItems,
    });
  }

  // Warning: Stale content
  if (stats.staleContent > 0) {
    recommendations.push({
      priority: 'medium',
      title: 'Review Stale Content',
      description: `${stats.staleContent} items haven't been updated in over a year and may be outdated.`,
      impact: 'More accurate, trustworthy content',
      effort: 'medium',
      affectedItems: stats.staleContent,
    });
  }

  // Info: Unused templates
  if (stats.unusedTemplates > 0) {
    recommendations.push({
      priority: 'low',
      title: 'Remove Unused Templates',
      description: `${stats.unusedTemplates} templates have no content items using them.`,
      impact: 'Simpler template structure, easier maintenance',
      effort: 'low',
      affectedItems: stats.unusedTemplates,
    });
  }

  // Info: Unused renderings
  if (stats.unusedRenderings > 0) {
    recommendations.push({
      priority: 'low',
      title: 'Remove Unused Renderings',
      description: `${stats.unusedRenderings} renderings are not used on any pages.`,
      impact: 'Cleaner rendering options for content editors',
      effort: 'low',
      affectedItems: stats.unusedRenderings,
    });
  }

  // Info: Empty containers
  if (stats.emptyContainers > 0) {
    recommendations.push({
      priority: 'low',
      title: 'Clean Up Empty Folders',
      description: `${stats.emptyContainers} folders have no child items.`,
      impact: 'Cleaner content tree',
      effort: 'low',
      affectedItems: stats.emptyContainers,
    });
  }

  // Info: Duplicates
  if (stats.duplicates > 0) {
    recommendations.push({
      priority: 'low',
      title: 'Review Duplicate Items',
      description: `${stats.duplicates} potential duplicate items found with same name and template.`,
      impact: 'Avoid content confusion',
      effort: 'medium',
      affectedItems: stats.duplicates,
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recommendations;
}

/**
 * Generate a summary suitable for display.
 */
export function generateSummary(report: XRayReport): string {
  const lines: string[] = [];

  lines.push(`# Sitecore X-Ray Report`);
  lines.push(``);
  lines.push(`**Instance:** ${report.instanceUrl}`);
  lines.push(`**Scanned:** ${report.generatedAt}`);
  lines.push(`**Duration:** ${(report.scanDuration / 1000).toFixed(1)}s`);
  lines.push(``);
  lines.push(`## Health Score: ${report.healthScore}/100 (${report.healthGrade})`);
  lines.push(``);
  lines.push(`### Statistics`);
  lines.push(`- Total Items: ${report.stats.totalItems.toLocaleString()}`);
  lines.push(`- Total Templates: ${report.stats.totalTemplates.toLocaleString()}`);
  lines.push(`- Total Media: ${report.stats.totalMedia.toLocaleString()}`);
  lines.push(`- Total Renderings: ${report.stats.totalRenderings.toLocaleString()}`);
  lines.push(``);

  // Issue counts
  const criticalCount = report.issues.filter(i => i.severity === 'critical').length;
  const warningCount = report.issues.filter(i => i.severity === 'warning').length;
  const infoCount = report.issues.filter(i => i.severity === 'info').length;

  lines.push(`### Issues Found`);
  lines.push(`- 🔴 Critical: ${criticalCount}`);
  lines.push(`- 🟡 Warning: ${warningCount}`);
  lines.push(`- 🔵 Info: ${infoCount}`);
  lines.push(``);

  if (report.recommendations.length > 0) {
    lines.push(`### Top Recommendations`);
    for (const rec of report.recommendations.slice(0, 5)) {
      const icon = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🔵';
      lines.push(`${icon} **${rec.title}** - ${rec.affectedItems} items`);
    }
  }

  return lines.join('\n');
}

/**
 * Filter issues by category and/or severity.
 */
export function filterIssues(
  issues: Issue[],
  category?: string,
  severity?: string
): Issue[] {
  return issues.filter(issue => {
    if (category && issue.category !== category) return false;
    if (severity && issue.severity !== severity) return false;
    return true;
  });
}
