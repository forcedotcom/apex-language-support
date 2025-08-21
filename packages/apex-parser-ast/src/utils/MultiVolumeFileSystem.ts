/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Volume } from 'memfs';
import { getLogger } from '@salesforce/apex-lsp-shared';

/**
 * Interface for volume configuration
 */
export interface VolumeConfig {
  protocol: string;
  rootPath?: string;
  readOnly?: boolean;
}

/**
 * Interface for file system operations
 */
export interface FileSystemOperations {
  exists(path: string): boolean;
  readFile(path: string, encoding?: string): string | Buffer;
  writeFile(path: string, data: string | Buffer): void;
  mkdir(path: string, options?: { recursive?: boolean }): void;
  readdir(path: string): string[];
  stat(path: string): any;
  unlink(path: string): void;
  rmdir(path: string): void;
  rename(oldPath: string, newPath: string): void;
  copyFile(src: string, dest: string): void;
}

/**
 * Multi-volume file system wrapper around memfs with URI support
 *
 * Features:
 * - Multi-volume support with protocol-based routing
 * - URI-based file paths (e.g., "apex://System/System.cls")
 * - Each volume assigned to a specific URI protocol
 * - Automatic volume creation and management
 * - Fallback to default volume for unknown protocols
 *
 * @example
 * ```typescript
 * const fs = new MultiVolumeFileSystem();
 *
 * // Register volumes
 * fs.registerVolume('apex', { protocol: 'apex', rootPath: '/apex' });
 * fs.registerVolume('custom', { protocol: 'custom', rootPath: '/custom' });
 *
 * // Use URI-based paths
 * fs.writeFile('apex://System/System.cls', 'public class System {}');
 * const content = fs.readFile('apex://System/System.cls', 'utf8');
 *
 * // Use relative paths (defaults to 'file' protocol)
 * fs.writeFile('test.txt', 'Hello World');
 * ```
 */
export class MultiVolumeFileSystem implements FileSystemOperations {
  private volumes: Map<string, Volume> = new Map();
  private volumeConfigs: Map<string, VolumeConfig> = new Map();
  private defaultVolume: Volume;
  private readonly logger = getLogger();

  constructor() {
    // Create default volume for 'file' protocol
    this.defaultVolume = new Volume();
    this.volumes.set('file', this.defaultVolume);
    this.volumeConfigs.set('file', { protocol: 'file' });
  }

  /**
   * Register a new volume for a specific protocol
   * @param protocol The URI protocol (e.g., 'apex', 'custom')
   * @param config Volume configuration
   */
  public registerVolume(protocol: string, config: VolumeConfig): void {
    if (this.volumes.has(protocol)) {
      this.logger.warn(
        () => `Volume for protocol '${protocol}' already exists, replacing...`,
      );
    }

    const volume = new Volume();
    this.volumes.set(protocol, volume);
    this.volumeConfigs.set(protocol, config);

    this.logger.debug(() => `Registered volume for protocol '${protocol}'`);
  }

  /**
   * Unregister a volume
   * @param protocol The URI protocol to unregister
   */
  public unregisterVolume(protocol: string): void {
    if (protocol === 'file') {
      this.logger.warn(() => 'Cannot unregister default file volume');
      return;
    }

    if (this.volumes.has(protocol)) {
      this.volumes.delete(protocol);
      this.volumeConfigs.delete(protocol);
      this.logger.debug(() => `Unregistered volume for protocol '${protocol}'`);
    }
  }

  /**
   * Get volume for a specific protocol
   * @param protocol The URI protocol
   * @returns The volume instance or default volume if not found
   */
  public getVolume(protocol: string): Volume {
    return this.volumes.get(protocol) || this.defaultVolume;
  }

  /**
   * Parse URI to extract protocol and path
   * @param uri The URI to parse
   * @returns Object containing protocol and path
   */
  private parseUri(uri: string): { protocol: string; path: string } {
    // Check if it's a URI with protocol
    if (uri.includes('://')) {
      const [protocol, ...pathParts] = uri.split('://');
      const path = pathParts.join('://'); // Handle paths that might contain ://
      return { protocol, path };
    }

    // Default to file protocol for relative paths
    return { protocol: 'file', path: uri };
  }

  /**
   * Normalize path for the target volume
   * @param protocol The URI protocol
   * @param path The file path
   * @returns Normalized path
   */
  private normalizePath(protocol: string, path: string): string {
    const config = this.volumeConfigs.get(protocol);

    // Normalize path separators to forward slashes for memfs compatibility
    // This ensures Windows backslashes are converted to forward slashes
    const normalizedPath = path.replace(/\\/g, '/');

    if (config?.rootPath) {
      // Remove leading slash from path if rootPath already has one
      const cleanPath = normalizedPath.startsWith('/')
        ? normalizedPath.slice(1)
        : normalizedPath;
      return `${config.rootPath}/${cleanPath}`;
    }

    // For volumes without rootPath, ensure we have a proper path structure
    // If the path doesn't start with '/', treat it as a relative path from root
    return normalizedPath.startsWith('/')
      ? normalizedPath
      : `/${normalizedPath}`;
  }

  /**
   * Check if file exists
   * @param path The file path (can be URI or relative path)
   * @returns true if file exists
   */
  public exists(path: string): boolean {
    const { protocol, path: filePath } = this.parseUri(path);
    const volume = this.getVolume(protocol);
    const normalizedPath = this.normalizePath(protocol, filePath);

    try {
      return volume.existsSync(normalizedPath);
    } catch {
      return false;
    }
  }

  /**
   * Read file content
   * @param path The file path (can be URI or relative path)
   * @param encoding The encoding (defaults to 'utf8')
   * @returns File content as string or Buffer
   */
  public readFile(path: string, encoding: string = 'utf8'): string | Buffer {
    const { protocol, path: filePath } = this.parseUri(path);
    const volume = this.getVolume(protocol);
    const normalizedPath = this.normalizePath(protocol, filePath);

    try {
      return volume.readFileSync(normalizedPath, encoding);
    } catch (error) {
      this.logger.error(() => `Failed to read file '${path}': ${error}`);
      throw error;
    }
  }

  /**
   * Write file content
   * @param path The file path (can be URI or relative path)
   * @param data The data to write
   */
  public writeFile(path: string, data: string | Buffer): void {
    const { protocol, path: filePath } = this.parseUri(path);
    const volume = this.getVolume(protocol);
    const normalizedPath = this.normalizePath(protocol, filePath);
    const config = this.volumeConfigs.get(protocol);

    if (config?.readOnly) {
      throw new Error(`Volume for protocol '${protocol}' is read-only`);
    }

    try {
      // Ensure directory exists
      const lastSlashIndex = normalizedPath.lastIndexOf('/');
      if (lastSlashIndex > 0) {
        const dirPath = normalizedPath.substring(0, lastSlashIndex);
        if (!volume.existsSync(dirPath)) {
          volume.mkdirSync(dirPath, { recursive: true });
        }
      }

      volume.writeFileSync(normalizedPath, data);
    } catch (error) {
      this.logger.error(() => `Failed to write file '${path}': ${error}`);
      throw error;
    }
  }

  /**
   * Create directory
   * @param path The directory path (can be URI or relative path)
   * @param options Directory creation options
   */
  public mkdir(path: string, options: { recursive?: boolean } = {}): void {
    const { protocol, path: dirPath } = this.parseUri(path);
    const volume = this.getVolume(protocol);
    const normalizedPath = this.normalizePath(protocol, dirPath);
    const config = this.volumeConfigs.get(protocol);

    if (config?.readOnly) {
      throw new Error(`Volume for protocol '${protocol}' is read-only`);
    }

    try {
      volume.mkdirSync(normalizedPath, options);
    } catch (error) {
      this.logger.error(() => `Failed to create directory '${path}': ${error}`);
      throw error;
    }
  }

  /**
   * Read directory contents
   * @param path The directory path (can be URI or relative path)
   * @returns Array of file/directory names
   */
  public readdir(path: string): string[] {
    const { protocol, path: dirPath } = this.parseUri(path);
    const volume = this.getVolume(protocol);
    const normalizedPath = this.normalizePath(protocol, dirPath);

    try {
      const result = volume.readdirSync(normalizedPath);
      // Handle different return types from memfs
      if (Array.isArray(result)) {
        return result.map((item) => {
          if (typeof item === 'string') {
            return item;
          }
          if (typeof item === 'object' && item !== null && 'name' in item) {
            return (item as any).name;
          }
          return String(item);
        });
      }
      return [];
    } catch (error) {
      this.logger.error(() => `Failed to read directory '${path}': ${error}`);
      throw error;
    }
  }

  /**
   * Get file/directory stats
   * @param path The file/directory path (can be URI or relative path)
   * @returns File stats
   */
  public stat(path: string): any {
    const { protocol, path: filePath } = this.parseUri(path);
    const volume = this.getVolume(protocol);
    const normalizedPath = this.normalizePath(protocol, filePath);

    try {
      return volume.statSync(normalizedPath);
    } catch (error) {
      this.logger.error(() => `Failed to get stats for '${path}': ${error}`);
      throw error;
    }
  }

  /**
   * Delete file
   * @param path The file path (can be URI or relative path)
   */
  public unlink(path: string): void {
    const { protocol, path: filePath } = this.parseUri(path);
    const volume = this.getVolume(protocol);
    const normalizedPath = this.normalizePath(protocol, filePath);
    const config = this.volumeConfigs.get(protocol);

    if (config?.readOnly) {
      throw new Error(`Volume for protocol '${protocol}' is read-only`);
    }

    try {
      volume.unlinkSync(normalizedPath);
    } catch (error) {
      this.logger.error(() => `Failed to delete file '${path}': ${error}`);
      throw error;
    }
  }

  /**
   * Remove directory
   * @param path The directory path (can be URI or relative path)
   */
  public rmdir(path: string): void {
    const { protocol, path: dirPath } = this.parseUri(path);
    const volume = this.getVolume(protocol);
    const normalizedPath = this.normalizePath(protocol, dirPath);
    const config = this.volumeConfigs.get(protocol);

    if (config?.readOnly) {
      throw new Error(`Volume for protocol '${protocol}' is read-only`);
    }

    try {
      volume.rmdirSync(normalizedPath);
    } catch (error) {
      this.logger.error(() => `Failed to remove directory '${path}': ${error}`);
      throw error;
    }
  }

  /**
   * Rename file or directory
   * @param oldPath The old path (can be URI or relative path)
   * @param newPath The new path (can be URI or relative path)
   */
  public rename(oldPath: string, newPath: string): void {
    const { protocol: oldProtocol, path: oldFilePath } = this.parseUri(oldPath);
    const { protocol: newProtocol, path: newFilePath } = this.parseUri(newPath);

    // Ensure both paths use the same protocol
    if (oldProtocol !== newProtocol) {
      throw new Error('Cannot rename across different protocols');
    }

    const volume = this.getVolume(oldProtocol);
    const oldNormalizedPath = this.normalizePath(oldProtocol, oldFilePath);
    const newNormalizedPath = this.normalizePath(newProtocol, newFilePath);
    const config = this.volumeConfigs.get(oldProtocol);

    if (config?.readOnly) {
      throw new Error(`Volume for protocol '${oldProtocol}' is read-only`);
    }

    try {
      volume.renameSync(oldNormalizedPath, newNormalizedPath);
    } catch (error) {
      this.logger.error(
        () => `Failed to rename '${oldPath}' to '${newPath}': ${error}`,
      );
      throw error;
    }
  }

  /**
   * Copy file
   * @param src The source path (can be URI or relative path)
   * @param dest The destination path (can be URI or relative path)
   */
  public copyFile(src: string, dest: string): void {
    const { protocol: srcProtocol, path: srcPath } = this.parseUri(src);
    const { protocol: destProtocol, path: destPath } = this.parseUri(dest);

    // Ensure both paths use the same protocol
    if (srcProtocol !== destProtocol) {
      throw new Error('Cannot copy across different protocols');
    }

    const volume = this.getVolume(srcProtocol);
    const srcNormalizedPath = this.normalizePath(srcProtocol, srcPath);
    const destNormalizedPath = this.normalizePath(destProtocol, destPath);
    const config = this.volumeConfigs.get(srcProtocol);

    if (config?.readOnly) {
      throw new Error(`Volume for protocol '${srcProtocol}' is read-only`);
    }

    try {
      // Read source file
      const data = volume.readFileSync(srcNormalizedPath);

      // Ensure destination directory exists
      const destDir = destNormalizedPath.substring(
        0,
        destNormalizedPath.lastIndexOf('/'),
      );
      if (destDir && !volume.existsSync(destDir)) {
        volume.mkdirSync(destDir, { recursive: true });
      }

      // Write to destination
      volume.writeFileSync(destNormalizedPath, data);
    } catch (error) {
      this.logger.error(() => `Failed to copy '${src}' to '${dest}': ${error}`);
      throw error;
    }
  }

  /**
   * Get all registered protocols
   * @returns Array of registered protocol names
   */
  public getRegisteredProtocols(): string[] {
    return Array.from(this.volumes.keys());
  }

  /**
   * Get volume configuration for a protocol
   * @param protocol The URI protocol
   * @returns Volume configuration or undefined if not found
   */
  public getVolumeConfig(protocol: string): VolumeConfig | undefined {
    return this.volumeConfigs.get(protocol);
  }

  /**
   * Export volume to JSON
   * @param protocol The URI protocol (optional, exports all if not specified)
   * @returns JSON representation of the volume(s)
   */
  public exportToJSON(protocol?: string): Record<string, any> {
    if (protocol) {
      const volume = this.volumes.get(protocol);
      if (!volume) {
        throw new Error(`Volume for protocol '${protocol}' not found`);
      }
      return { [protocol]: volume.toJSON() };
    }

    const result: Record<string, any> = {};
    for (const [protocol, volume] of this.volumes.entries()) {
      result[protocol] = volume.toJSON();
    }
    return result;
  }

  /**
   * Import volume from JSON
   * @param data JSON data to import
   * @param protocol The URI protocol to import to
   */
  public importFromJSON(data: Record<string, any>, protocol: string): void {
    const volume = this.volumes.get(protocol);
    if (!volume) {
      throw new Error(`Volume for protocol '${protocol}' not found`);
    }

    try {
      volume.fromJSON(data);
    } catch (error) {
      this.logger.error(
        () => `Failed to import JSON for protocol '${protocol}': ${error}`,
      );
      throw error;
    }
  }

  /**
   * Reset a specific volume or all volumes
   * @param protocol The URI protocol to reset (optional, resets all if not specified)
   */
  public reset(protocol?: string): void {
    if (protocol) {
      const volume = this.volumes.get(protocol);
      if (volume) {
        volume.reset();
        this.logger.debug(() => `Reset volume for protocol '${protocol}'`);
      }
    } else {
      for (const [_protocol, volume] of this.volumes.entries()) {
        volume.reset();
      }
      this.logger.debug(() => 'Reset all volumes');
    }
  }

  /**
   * Get statistics for all volumes
   * @returns Statistics object
   */
  public getStatistics(): Record<string, { files: number; size: number }> {
    const stats: Record<string, { files: number; size: number }> = {};

    for (const [protocol, volume] of this.volumes.entries()) {
      const json = volume.toJSON();
      const files = Object.keys(json).length;
      const size = Object.values(json).reduce(
        (total: number, content: any) =>
          total + (typeof content === 'string' ? content.length : 0),
        0,
      );

      stats[protocol] = { files, size };
    }

    return stats;
  }
}
