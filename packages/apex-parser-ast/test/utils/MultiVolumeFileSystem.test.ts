/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  MultiVolumeFileSystem,
  VolumeConfig,
} from '../../src/utils/MultiVolumeFileSystem';

describe('MultiVolumeFileSystem', () => {
  let fs: MultiVolumeFileSystem;

  beforeEach(() => {
    fs = new MultiVolumeFileSystem();
  });

  afterEach(() => {
    fs.reset();
  });

  describe('Volume Registration', () => {
    it('should register volumes for different protocols', () => {
      const apexConfig: VolumeConfig = {
        protocol: 'apex',
        rootPath: '/apex',
        readOnly: false,
      };

      const customConfig: VolumeConfig = {
        protocol: 'custom',
        rootPath: '/custom',
        readOnly: true,
      };

      fs.registerVolume('apex', apexConfig);
      fs.registerVolume('custom', customConfig);

      expect(fs.getRegisteredProtocols()).toContain('apex');
      expect(fs.getRegisteredProtocols()).toContain('custom');
      expect(fs.getRegisteredProtocols()).toContain('file'); // Default volume

      expect(fs.getVolumeConfig('apex')).toEqual(apexConfig);
      expect(fs.getVolumeConfig('custom')).toEqual(customConfig);
    });

    it('should replace existing volume when registering same protocol', () => {
      const config1: VolumeConfig = { protocol: 'test', rootPath: '/test1' };
      const config2: VolumeConfig = { protocol: 'test', rootPath: '/test2' };

      fs.registerVolume('test', config1);
      fs.registerVolume('test', config2);

      expect(fs.getVolumeConfig('test')).toEqual(config2);
    });

    it('should not allow unregistering default file volume', () => {
      fs.unregisterVolume('file');
      expect(fs.getRegisteredProtocols()).toContain('file');
    });

    it('should unregister custom volumes', () => {
      fs.registerVolume('test', { protocol: 'test' });
      expect(fs.getRegisteredProtocols()).toContain('test');

      fs.unregisterVolume('test');
      expect(fs.getRegisteredProtocols()).not.toContain('test');
    });
  });

  describe('URI Parsing', () => {
    it('should parse URI with protocol', () => {
      fs.registerVolume('apex', { protocol: 'apex' });

      fs.writeFile('apex://System/System.cls', 'public class System {}');
      expect(fs.exists('apex://System/System.cls')).toBe(true);
      expect(fs.readFile('apex://System/System.cls')).toBe(
        'public class System {}',
      );
    });

    it('should default to file protocol for relative paths', () => {
      fs.writeFile('test.txt', 'Hello World');
      expect(fs.exists('test.txt')).toBe(true);
      expect(fs.readFile('test.txt')).toBe('Hello World');
    });

    it('should handle paths with colons in the path part', () => {
      fs.registerVolume('git', { protocol: 'git' });
      fs.writeFile('git://repo:branch/file.txt', 'content');
      expect(fs.exists('git://repo:branch/file.txt')).toBe(true);
      expect(fs.readFile('git://repo:branch/file.txt')).toBe('content');
    });
  });

  describe('Path Normalization', () => {
    it('should normalize paths with rootPath', () => {
      fs.registerVolume('apex', { protocol: 'apex', rootPath: '/apex' });

      fs.writeFile('apex://System/System.cls', 'public class System {}');

      // The file should be stored at /apex/System/System.cls internally
      const volume = fs.getVolume('apex');
      expect(volume.existsSync('/apex/System/System.cls')).toBe(true);
    });

    it('should handle paths without rootPath', () => {
      fs.registerVolume('custom', { protocol: 'custom' });

      fs.writeFile('custom://file.txt', 'content');

      // The file should be stored at /file.txt internally (with leading slash)
      const volume = fs.getVolume('custom');
      expect(volume.existsSync('/file.txt')).toBe(true);
    });
  });

  describe('File Operations', () => {
    beforeEach(() => {
      fs.registerVolume('apex', { protocol: 'apex', rootPath: '/apex' });
      fs.registerVolume('custom', { protocol: 'custom' });
    });

    it('should write and read files across different volumes', () => {
      fs.writeFile('apex://System/System.cls', 'public class System {}');
      fs.writeFile('custom://config.json', '{"key": "value"}');
      fs.writeFile('local.txt', 'local content');

      expect(fs.readFile('apex://System/System.cls')).toBe(
        'public class System {}',
      );
      expect(fs.readFile('custom://config.json')).toBe('{"key": "value"}');
      expect(fs.readFile('local.txt')).toBe('local content');
    });

    it('should create directories recursively', () => {
      fs.mkdir('apex://System/Utils', { recursive: true });
      fs.writeFile('apex://System/Utils/Helper.cls', 'public class Helper {}');

      expect(fs.exists('apex://System/Utils/Helper.cls')).toBe(true);
    });

    it('should list directory contents', () => {
      fs.writeFile('apex://System/System.cls', 'content1');
      fs.writeFile('apex://System/String.cls', 'content2');
      fs.mkdir('apex://System/Utils', { recursive: true });

      const contents = fs.readdir('apex://System');
      expect(contents).toContain('System.cls');
      expect(contents).toContain('String.cls');
      expect(contents).toContain('Utils');
    });

    it('should get file stats', () => {
      fs.writeFile('apex://System/System.cls', 'public class System {}');

      const stats = fs.stat('apex://System/System.cls');
      expect(stats.isFile()).toBe(true);
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should delete files', () => {
      fs.writeFile('apex://System/System.cls', 'content');
      expect(fs.exists('apex://System/System.cls')).toBe(true);

      fs.unlink('apex://System/System.cls');
      expect(fs.exists('apex://System/System.cls')).toBe(false);
    });

    it('should remove directories', () => {
      fs.mkdir('apex://System/Utils', { recursive: true });
      fs.writeFile('apex://System/Utils/Helper.cls', 'content');

      fs.unlink('apex://System/Utils/Helper.cls');
      fs.rmdir('apex://System/Utils');

      expect(fs.exists('apex://System/Utils')).toBe(false);
    });

    it('should rename files within same volume', () => {
      fs.writeFile('apex://System/System.cls', 'public class System {}');
      fs.rename('apex://System/System.cls', 'apex://System/SystemClass.cls');

      expect(fs.exists('apex://System/System.cls')).toBe(false);
      expect(fs.exists('apex://System/SystemClass.cls')).toBe(true);
      expect(fs.readFile('apex://System/SystemClass.cls')).toBe(
        'public class System {}',
      );
    });

    it('should copy files within same volume', () => {
      fs.writeFile('apex://System/System.cls', 'public class System {}');
      fs.copyFile('apex://System/System.cls', 'apex://System/SystemCopy.cls');

      expect(fs.exists('apex://System/System.cls')).toBe(true);
      expect(fs.exists('apex://System/SystemCopy.cls')).toBe(true);
      expect(fs.readFile('apex://System/SystemCopy.cls')).toBe(
        'public class System {}',
      );
    });
  });

  describe('Read-Only Volumes', () => {
    it('should prevent writes to read-only volumes', () => {
      fs.registerVolume('readonly', { protocol: 'readonly', readOnly: true });

      expect(() => {
        fs.writeFile('readonly://file.txt', 'content');
      }).toThrow("Volume for protocol 'readonly' is read-only");

      expect(() => {
        fs.mkdir('readonly://dir');
      }).toThrow("Volume for protocol 'readonly' is read-only");

      expect(() => {
        fs.unlink('readonly://file.txt');
      }).toThrow("Volume for protocol 'readonly' is read-only");
    });

    it('should allow reads from read-only volumes', () => {
      // First write to a writable volume, then make it read-only
      fs.registerVolume('test', { protocol: 'test' });
      fs.writeFile('test://file.txt', 'content');

      // Now make it read-only by updating the config
      const volume = fs.getVolume('test');
      const config = fs.getVolumeConfig('test');
      if (config) {
        config.readOnly = true;
      }

      expect(fs.exists('test://file.txt')).toBe(true);
      expect(fs.readFile('test://file.txt')).toBe('content');
    });
  });

  describe('Cross-Volume Operations', () => {
    beforeEach(() => {
      fs.registerVolume('apex', { protocol: 'apex' });
      fs.registerVolume('custom', { protocol: 'custom' });
    });

    it('should prevent rename across different protocols', () => {
      fs.writeFile('apex://System.cls', 'content');

      expect(() => {
        fs.rename('apex://System.cls', 'custom://System.cls');
      }).toThrow('Cannot rename across different protocols');
    });

    it('should prevent copy across different protocols', () => {
      fs.writeFile('apex://System.cls', 'content');

      expect(() => {
        fs.copyFile('apex://System.cls', 'custom://System.cls');
      }).toThrow('Cannot copy across different protocols');
    });
  });

  describe('Volume Management', () => {
    it('should export and import volumes', () => {
      fs.registerVolume('apex', { protocol: 'apex' });
      fs.writeFile('apex://System.cls', 'public class System {}');

      const exported = fs.exportToJSON('apex');
      expect(exported.apex).toBeDefined();
      expect(exported.apex['/System.cls']).toBe('public class System {}');

      // Reset and import
      fs.reset('apex');
      expect(fs.exists('apex://System.cls')).toBe(false);

      fs.importFromJSON(exported.apex, 'apex');
      expect(fs.exists('apex://System.cls')).toBe(true);
      expect(fs.readFile('apex://System.cls')).toBe('public class System {}');
    });

    it('should export all volumes', () => {
      fs.registerVolume('apex', { protocol: 'apex' });
      fs.registerVolume('custom', { protocol: 'custom' });

      fs.writeFile('apex://System.cls', 'apex content');
      fs.writeFile('custom://config.json', 'custom content');
      fs.writeFile('local.txt', 'local content');

      const exported = fs.exportToJSON();
      expect(exported.apex).toBeDefined();
      expect(exported.custom).toBeDefined();
      expect(exported.file).toBeDefined();
    });

    it('should reset specific volumes', () => {
      fs.registerVolume('apex', { protocol: 'apex' });
      fs.writeFile('apex://System.cls', 'content');
      fs.writeFile('local.txt', 'local content');

      fs.reset('apex');

      expect(fs.exists('apex://System.cls')).toBe(false);
      expect(fs.exists('local.txt')).toBe(true); // File volume should remain
    });

    it('should reset all volumes', () => {
      fs.registerVolume('apex', { protocol: 'apex' });
      fs.writeFile('apex://System.cls', 'content');
      fs.writeFile('local.txt', 'local content');

      fs.reset();

      expect(fs.exists('apex://System.cls')).toBe(false);
      expect(fs.exists('local.txt')).toBe(false);
    });
  });

  describe('Statistics', () => {
    it('should provide volume statistics', () => {
      fs.registerVolume('apex', { protocol: 'apex' });
      fs.registerVolume('custom', { protocol: 'custom' });

      fs.writeFile('apex://System.cls', 'public class System {}');
      fs.writeFile('apex://String.cls', 'public class String {}');
      fs.writeFile('custom://config.json', '{"key": "value"}');
      fs.writeFile('local.txt', 'local content');

      const stats = fs.getStatistics();

      expect(stats.apex.files).toBe(2);
      expect(stats.apex.size).toBeGreaterThan(0);
      expect(stats.custom.files).toBe(1);
      expect(stats.custom.size).toBeGreaterThan(0);
      expect(stats.file.files).toBe(1);
      expect(stats.file.size).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent files gracefully', () => {
      expect(fs.exists('nonexistent.txt')).toBe(false);
      expect(() => fs.readFile('nonexistent.txt')).toThrow();
    });

    it('should handle non-existent directories', () => {
      expect(() => fs.readdir('nonexistent/')).toThrow();
    });

    it('should handle invalid volume operations', () => {
      expect(() => fs.exportToJSON('nonexistent')).toThrow(
        "Volume for protocol 'nonexistent' not found",
      );
      expect(() => fs.importFromJSON({}, 'nonexistent')).toThrow(
        "Volume for protocol 'nonexistent' not found",
      );
    });
  });

  describe('Real-world Usage Example', () => {
    it('should demonstrate typical Apex development workflow', () => {
      // Register volumes for different types of content
      fs.registerVolume('apex', { protocol: 'apex', rootPath: '/apex' });
      fs.registerVolume('metadata', {
        protocol: 'metadata',
        rootPath: '/metadata',
      });
      fs.registerVolume('temp', { protocol: 'temp', readOnly: false });

      // Create Apex classes
      fs.writeFile('apex://System/System.cls', 'public class System {}');
      fs.writeFile('apex://Database/Database.cls', 'public class Database {}');
      fs.writeFile('apex://String/String.cls', 'public class String {}');

      // Create metadata files
      fs.writeFile(
        'metadata://package.xml',
        '<?xml version="1.0"?><Package xmlns="http://soap.sforce.com/2006/04/metadata"/>',
      );
      fs.writeFile(
        'metadata://destructiveChanges.xml',
        '<?xml version="1.0"?><Package xmlns="http://soap.sforce.com/2006/04/metadata"/>',
      );

      // Create temporary files
      fs.writeFile('temp://build.log', 'Build started...');
      fs.writeFile('temp://cache.json', '{"timestamp": "2025-01-01"}');

      // Verify all files exist
      expect(fs.exists('apex://System/System.cls')).toBe(true);
      expect(fs.exists('metadata://package.xml')).toBe(true);
      expect(fs.exists('temp://build.log')).toBe(true);

      // List files in directories
      const apexFiles = fs.readdir('apex://');
      expect(apexFiles).toContain('System');
      expect(apexFiles).toContain('Database');
      expect(apexFiles).toContain('String');

      // Get statistics
      const stats = fs.getStatistics();
      expect(stats.apex.files).toBe(3);
      expect(stats.metadata.files).toBe(2);
      expect(stats.temp.files).toBe(2);

      // Export specific volume
      const apexExport = fs.exportToJSON('apex');
      expect(Object.keys(apexExport.apex)).toHaveLength(3);
    });
  });
});
