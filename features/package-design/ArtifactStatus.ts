import { devLog } from '@/features/shared/dev-logger';
import { getCpiBaseUrl } from '@/features/shared/navigation';
import { fetchCpiText, fetchCsrfToken as fetchCsrfTokenShared } from '@/features/shared/fetch-client';
import { showToast } from '@/features/shared/toast';
import {
  SAP_CMD_LIST_ARTIFACTS,
  SAP_RUNTIME_LOCATION_ID,
  SAP_TABLE_SELECTORS,
  SAP_ROW_SELECTORS,
  STATUS_BADGE_CLASS,
  STATUS_CHECKED_ATTR,
} from '@/features/shared/constants';

export interface DeployedArtifactInfo {
  deployState: string | null;
  semanticState: string | null;
  version: string | null;
  deployedOn: string | null;
  deployedBy: string | null;
  artifactId: string | null;
  tenantId: string | null;
  symbolicName: string | null;
}

const LOG_TAG = 'ArtifactStatus';

export class ArtifactStatus {
  private maxAttempts = 60;
  private deployedArtifactsMap: Map<string, DeployedArtifactInfo> = new Map();
  private currentPackageId: string | null = null;
  private isFetching = false;
  private observer: MutationObserver | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private waitInterval: ReturnType<typeof setInterval> | null = null;

  /** Whether a refresh/fetch is currently in progress */
  isLoading = false;
  private loadingListeners: Array<(loading: boolean) => void> = [];

  /** Subscribe to loading state changes. Returns an unsubscribe function. */
  onLoadingChange(listener: (loading: boolean) => void): () => void {
    this.loadingListeners.push(listener);
    return () => {
      this.loadingListeners = this.loadingListeners.filter(l => l !== listener);
    };
  }

  private setLoading(loading: boolean): void {
    this.isLoading = loading;
    for (const listener of this.loadingListeners) {
      listener(loading);
    }
  }

  /**
   * Check if current page is the Package Artifacts page
   */
  isPackageArtifactsPage(): boolean {
    const url = window.location.href;
    return url.includes('/shell/design/contentpackage/') && url.includes('section=ARTIFACTS');
  }

  private getPackageIdFromUrl(): string | null {
    const match = window.location.href.match(/contentpackage\/([^?]+)/);
    return match ? match[1]! : null;
  }

  /**
   * Initialize and show status
   */
  async show(): Promise<void> {
    if (!this.isPackageArtifactsPage()) return;

    const packageId = this.getPackageIdFromUrl();
    if (this.currentPackageId === packageId) {
      return;
    }

    if (this.isFetching) return;

    this.currentPackageId = packageId;
    this.isFetching = true;

    devLog.info(LOG_TAG, 'Package Artifacts page detected. Initializing status check...');
    this.setLoading(true);

    try {
      await this.fetchDeployedArtifacts();
      showToast(`Found ${this.deployedArtifactsMap.size} deployed artifacts`, 'success');
      this.waitForTable();
    } catch (error) {
      devLog.error(LOG_TAG, 'Failed to fetch deployed artifacts', { error: String(error) });
      showToast(`Failed to fetch artifact status: ${error}`, 'error');
      this.currentPackageId = null;
    } finally {
      this.isFetching = false;
      this.setLoading(false);
    }
  }

  /**
   * Clean up: disconnect observer, remove badges.
   * Skips cleanup while actively polling for the table or fetching data
   * (prevents navigation-watcher race condition during SPA transitions).
   */
  hide(): void {
    if (this.waitInterval || this.isFetching) {
      devLog.debug(LOG_TAG, 'hide() skipped - active work in progress');
      return;
    }

    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    // Remove all badges
    document.querySelectorAll(`.${STATUS_BADGE_CLASS}`).forEach(el => el.remove());
    // Remove checked markers so badges reappear on next show()
    document.querySelectorAll(`[${STATUS_CHECKED_ATTR}]`).forEach(el => {
      el.removeAttribute(STATUS_CHECKED_ATTR);
    });

    this.currentPackageId = null;
  }

  private async fetchDeployedArtifacts(): Promise<void> {
    const baseUrl = getCpiBaseUrl();

    const url = `${baseUrl}${SAP_CMD_LIST_ARTIFACTS}?runtimeLocationId=${encodeURIComponent(SAP_RUNTIME_LOCATION_ID)}`;

    devLog.info(LOG_TAG, 'Fetching deployed artifacts', { url });
    const text = await fetchCpiText(url);
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, 'text/xml');

    let artifacts = xmlDoc.getElementsByTagName('artifactInformation');
    if (artifacts.length === 0) {
      artifacts = xmlDoc.getElementsByTagName('artifactInformations');
    }

    this.deployedArtifactsMap.clear();
    for (const artifact of Array.from(artifacts)) {
      const symbolicName = artifact.querySelector('symbolicName')?.textContent;
      const name = artifact.querySelector('name')?.textContent;
      const deployState = artifact.querySelector('deployState')?.textContent ?? null;
      const semanticState = artifact.querySelector('semanticState')?.textContent ?? null;
      const version = artifact.querySelector('version')?.textContent ?? null;
      const deployedOn = artifact.querySelector('deployedOn')?.textContent ?? null;
      const deployedBy = artifact.querySelector('deployedBy')?.textContent ?? null;
      const artifactId = artifact.querySelector('id')?.textContent ?? null;
      const tenantId = artifact.querySelector('tenantId')?.textContent ?? null;

      const info: DeployedArtifactInfo = {
        deployState, semanticState, version, deployedOn, deployedBy,
        artifactId, tenantId, symbolicName: symbolicName ?? null,
      };

      // Store under symbolicName (primary key)
      if (symbolicName) {
        this.deployedArtifactsMap.set(symbolicName, info);
      }
      // Also store under name if different (design-time name may differ)
      if (name && name !== symbolicName) {
        this.deployedArtifactsMap.set(name, info);
      }
    }

    devLog.info(LOG_TAG, `Found ${this.deployedArtifactsMap.size} deployed artifacts`);
  }

  private waitForTable(): void {
    // Clear any previously leaked interval
    if (this.waitInterval) {
      clearInterval(this.waitInterval);
      this.waitInterval = null;
    }

    let attempts = 0;
    const intervalId = setInterval(() => {
      attempts++;

      const tables = document.querySelectorAll(SAP_TABLE_SELECTORS);

      // Diagnostic log on first attempt
      if (attempts === 1) {
        const rowCount = Array.from(tables).reduce(
          (n, t) => n + t.querySelectorAll(SAP_ROW_SELECTORS).length, 0
        );
        devLog.debug(LOG_TAG, 'waitForTable: scanning', {
          tables: tables.length,
          rows: rowCount,
          deployed: this.deployedArtifactsMap.size,
        });
      }

      let found = false;

      for (const table of Array.from(tables)) {
        const rows = table.querySelectorAll(SAP_ROW_SELECTORS);
        if (rows.length === 0) continue;
        if (!this.isArtifactsTable(table)) continue;

        clearInterval(intervalId);
        this.waitInterval = null;
        devLog.info(LOG_TAG, 'Found artifacts table', { rows: rows.length });
        this.enhanceTable(rows);
        this.observeTableChanges(table);
        found = true;
        break;
      }

      if (!found && attempts > this.maxAttempts) {
        clearInterval(intervalId);
        this.waitInterval = null;
        this.currentPackageId = null; // Allow show() to retry later
        devLog.warn(LOG_TAG, 'Could not find artifacts table', { attempts: this.maxAttempts });
      }
    }, 1000);

    this.waitInterval = intervalId;
  }

  /**
   * Identify the artifacts table by its header columns (Name + Type + Version).
   * The deploy-status of individual artifacts must NOT influence detection —
   * a package whose artifacts are all undeployed still has a valid artifacts
   * table that needs to be enhanced (with "NOT DEPLOYED" badges).
   */
  private isArtifactsTable(table: Element): boolean {
    const headerRow = table.querySelector(
      'tr.sapMListTblHeaderRow, .sapMListTblHeader, thead tr'
    );
    if (!headerRow) return false;
    const headerTexts = new Set<string>();
    const walker = document.createTreeWalker(headerRow, NodeFilter.SHOW_TEXT, null);
    let n: Node | null;
    while ((n = walker.nextNode())) {
      const t = n.textContent?.trim();
      if (t) headerTexts.add(t);
    }
    return (
      headerTexts.has('Name') &&
      headerTexts.has('Version') &&
      (headerTexts.has('Type') || headerTexts.has('Typ'))
    );
  }

  private isHeaderRow(row: Element): boolean {
    return row.classList.contains('sapMListTblHeaderRow') ||
           row.classList.contains('sapMListTblHeader') ||
           row.querySelector('th') !== null;
  }

  private enhanceTable(rows: NodeListOf<Element>): void {
    rows.forEach(row => {
      if (row.getAttribute(STATUS_CHECKED_ATTR)) return;

      // Skip header rows
      if (this.isHeaderRow(row)) {
        row.setAttribute(STATUS_CHECKED_ATTR, 'true');
        return;
      }

      const rowEl = row as HTMLElement;
      const textNodes = this.getAllTextNodes(rowEl);

      if (textNodes.length === 0) {
        row.setAttribute(STATUS_CHECKED_ATTR, 'true');
        return;
      }

      let foundSymbolicName: string | null = null;
      let nameElement: HTMLElement | null = null;

      for (const text of textNodes) {
        if (this.deployedArtifactsMap.has(text)) {
          foundSymbolicName = text;
          nameElement = this.findElementWithText(rowEl, text);
          break;
        }
      }

      if (foundSymbolicName && nameElement) {
        const status = this.deployedArtifactsMap.get(foundSymbolicName)!;
        // Extract design-time version from the row's DOM (shown in version column)
        const designTimeVersion = this.extractVersionFromRow(textNodes);
        devLog.debug(LOG_TAG, 'Version comparison', {
          artifactKey: foundSymbolicName,
          runtimeVersion: status.version,
          designTimeVersion: designTimeVersion ?? '(not found in DOM)',
          hasMismatch: !!(status.version && designTimeVersion && status.version !== designTimeVersion),
        });
        this.addStatusIndicator(nameElement, status, designTimeVersion);
      } else if (textNodes.length > 0 && !foundSymbolicName) {
        // Artifact is not in the deployed map — show "NOT DEPLOYED"
        const candidateText = textNodes[0]!;
        const candidateElement = this.findElementWithText(rowEl, candidateText);
        if (candidateElement) {
          this.addNotDeployedIndicator(candidateElement);
        }
      }

      row.setAttribute(STATUS_CHECKED_ATTR, 'true');
    });
  }

  private findElementWithText(root: HTMLElement, text: string): HTMLElement | null {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) {
      if (node.textContent?.trim() === text) {
        return node.parentElement;
      }
    }
    return null;
  }

  /**
   * Extract the design-time version from a table row by scanning for version-like text.
   * The SAP CPI package overview shows the version (e.g. "1.0.49") in a separate column.
   */
  private extractVersionFromRow(textNodes: string[]): string | null {
    const versionRegex = /^\d+\.\d+\.\d+$/;
    for (const text of textNodes) {
      if (versionRegex.test(text)) {
        return text;
      }
    }
    return null;
  }

  private getAllTextNodes(element: HTMLElement): string[] {
    const texts: string[] = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent?.trim();
      if (text) texts.push(text);
    }
    return texts;
  }

  private addStatusIndicator(targetElement: HTMLElement, status: DeployedArtifactInfo, designTimeVersion: string | null): void {
    const statusBadge = document.createElement('span');
    statusBadge.className = `sapMObjectStatus sapMObjectStatusLarge ${STATUS_BADGE_CLASS}`;

    let color = '#666';
    let icon = '';
    let backgroundColor = '#f0f0f0';

    if (status.deployState === 'DEPLOYED') {
      if (status.semanticState === 'STARTED') {
        color = '#107e3e';
        backgroundColor = '#f5fae5';
        icon = '[OK]';
      } else {
        color = '#e9730c';
        backgroundColor = '#fdf4e3';
        icon = '[!]';
      }
    } else if (status.deployState === 'ERROR') {
      color = '#bb0000';
      backgroundColor = '#ffebeb';
      icon = '[X]';
    }

    // Check for version mismatch
    const runtimeVersion = status.version;
    const hasMismatch = runtimeVersion && designTimeVersion && runtimeVersion !== designTimeVersion;

    if (hasMismatch) {
      color = '#0854a0';
      backgroundColor = '#e8f0fe';
      icon = '[~]';
    }

    statusBadge.style.cssText = `
      color: ${color};
      border: 1px solid ${color};
      background-color: ${backgroundColor};
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: normal;
      margin-left: 8px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      vertical-align: middle;
      line-height: 12px;
      cursor: help;
    `;

    const date = status.deployedOn ? new Date(status.deployedOn).toLocaleString() : '';
    const versionText = hasMismatch
      ? `v${runtimeVersion} -> v${designTimeVersion}`
      : `v${status.version}`;
    statusBadge.textContent = `${icon} ${status.deployState} | ${versionText} | ${date}`;

    if (hasMismatch) {
      statusBadge.title = `Runtime Version: ${runtimeVersion}\nDesign-Time Version: ${designTimeVersion}\nVersion mismatch - redeployment needed\n\nState: ${status.semanticState}\nDeployed by: ${status.deployedBy || 'Unknown'}\nDeployed on: ${status.deployedOn || 'Unknown'}`;
    } else {
      statusBadge.title = `Version: ${status.version}\nState: ${status.semanticState}\nDeployed by: ${status.deployedBy || 'Unknown'}\nDeployed on: ${status.deployedOn || 'Unknown'}`;
    }

    this.insertBadgeAfter(targetElement, statusBadge);
  }

  private addNotDeployedIndicator(targetElement: HTMLElement): void {
    const statusBadge = document.createElement('span');
    statusBadge.className = `sapMObjectStatus ${STATUS_BADGE_CLASS}`;

    statusBadge.style.cssText = `
      color: #666;
      border: 1px solid #bbb;
      background-color: #f0f0f0;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: normal;
      margin-left: 8px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      vertical-align: middle;
      line-height: 12px;
      cursor: help;
    `;

    statusBadge.textContent = 'NOT DEPLOYED';
    statusBadge.title = 'This artifact is not deployed to the runtime.';

    this.insertBadgeAfter(targetElement, statusBadge);
  }

  private insertBadgeAfter(targetElement: HTMLElement, badge: HTMLElement): void {
    let insertTarget = targetElement;
    if (targetElement.tagName === 'SPAN' && targetElement.parentElement?.tagName === 'A') {
      insertTarget = targetElement.parentElement;
    }

    insertTarget.insertAdjacentElement('afterend', badge);
  }

  private observeTableChanges(table: Element): void {
    this.observer = new MutationObserver(() => {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        const rows = table.querySelectorAll(SAP_ROW_SELECTORS);
        this.enhanceTable(rows);
      }, 300);
    });

    this.observer.observe(table, { childList: true, subtree: true });
  }

  /**
   * Returns all deployed artifacts (deployState === 'DEPLOYED') from the last fetch.
   */
  getDeployedArtifactsMap(): Map<string, DeployedArtifactInfo> {
    return this.deployedArtifactsMap;
  }

  /**
   * Fetches a CSRF token from the SAP API.
   */
  async fetchCsrfToken(): Promise<string> {
    return fetchCsrfTokenShared();
  }

  /**
   * Public refresh — resets state and re-fetches deployed artifacts.
   * Called by ArtifactRefreshTool.
   */
  refresh(): void {
    // Reset state so show() re-fetches
    this.currentPackageId = null;
    // Clean existing badges so they get regenerated
    document.querySelectorAll(`.${STATUS_BADGE_CLASS}`).forEach(el => el.remove());
    document.querySelectorAll(`[${STATUS_CHECKED_ATTR}]`).forEach(el => {
      el.removeAttribute(STATUS_CHECKED_ATTR);
    });
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.show();
  }
}
