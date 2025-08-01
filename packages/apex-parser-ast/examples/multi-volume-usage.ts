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
} from '../src/utils/MultiVolumeFileSystem';
import { ResourceLoader } from '../src/utils/resourceLoader';

/**
 * Example demonstrating MultiVolumeFileSystem usage with Apex development
 *
 * This example shows how to:
 * - Set up multiple volumes for different types of content
 * - Use URI-based file paths for clear separation
 * - Integrate with existing ResourceLoader
 * - Handle different file types and protocols
 */
export class MultiVolumeExample {
  private fs: MultiVolumeFileSystem;
  private resourceLoader: ResourceLoader;

  constructor() {
    this.fs = new MultiVolumeFileSystem();
    this.resourceLoader = ResourceLoader.getInstance();
    this.setupVolumes();
  }

  /**
   * Set up volumes for different types of content
   */
  private setupVolumes(): void {
    // Apex source code volume
    this.fs.registerVolume('apex', {
      protocol: 'apex',
      rootPath: '/apex',
      readOnly: false,
    });

    // Metadata files volume
    this.fs.registerVolume('metadata', {
      protocol: 'metadata',
      rootPath: '/metadata',
      readOnly: false,
    });

    // Temporary build artifacts volume
    this.fs.registerVolume('temp', {
      protocol: 'temp',
      rootPath: '/temp',
      readOnly: false,
    });

    // Read-only standard library volume
    this.fs.registerVolume('stdlib', {
      protocol: 'stdlib',
      rootPath: '/stdlib',
      readOnly: true,
    });

    // Configuration files volume
    this.fs.registerVolume('config', {
      protocol: 'config',
      rootPath: '/config',
      readOnly: false,
    });
  }

  /**
   * Initialize the file system with sample data
   */
  public async initialize(): Promise<void> {
    console.log('Initializing MultiVolumeFileSystem with sample data...');

    // Load standard library from ResourceLoader
    await this.loadStandardLibrary();

    // Create sample Apex classes
    this.createSampleApexClasses();

    // Create metadata files
    this.createMetadataFiles();

    // Create configuration files
    this.createConfigurationFiles();

    // Create temporary build files
    this.createBuildFiles();

    console.log('Initialization complete!');
  }

  /**
   * Load standard library from ResourceLoader into stdlib volume
   */
  private async loadStandardLibrary(): Promise<void> {
    console.log('Loading standard library...');

    // Get all available classes from ResourceLoader
    const availableClasses = this.resourceLoader.getAvailableClasses();

    for (const className of availableClasses) {
      try {
        const content = await this.resourceLoader.getFile(className);
        if (content) {
          // Store in stdlib volume with URI path
          this.fs.writeFile(`stdlib://${className}`, content);
        }
      } catch (error) {
        console.warn(`Failed to load ${className}:`, error);
      }
    }

    console.log(`Loaded ${availableClasses.length} standard library classes`);
  }

  /**
   * Create sample Apex classes in the apex volume
   */
  private createSampleApexClasses(): void {
    console.log('Creating sample Apex classes...');

    const sampleClasses = {
      'AccountService.cls': `public class AccountService {
    public static Account createAccount(String name, String industry) {
        Account acc = new Account();
        acc.Name = name;
        acc.Industry = industry;
        insert acc;
        return acc;
    }
    
    public static List<Account> getAccountsByIndustry(String industry) {
        return [SELECT Id, Name, Industry FROM Account WHERE Industry = :industry];
    }
}`,
      'ContactService.cls': `public class ContactService {
    public static Contact createContact(String firstName, String lastName, Id accountId) {
        Contact con = new Contact();
        con.FirstName = firstName;
        con.LastName = lastName;
        con.AccountId = accountId;
        insert con;
        return con;
    }
}`,
      'Utils/Helper.cls': `public class Helper {
    public static String formatPhone(String phone) {
        if (String.isBlank(phone)) return '';
        return phone.replaceAll('[^0-9]', '');
    }
    
    public static Boolean isValidEmail(String email) {
        return email != null && email.contains('@') && email.contains('.');
    }
}`,
    };

    for (const [fileName, content] of Object.entries(sampleClasses)) {
      this.fs.writeFile(`apex://${fileName}`, content);
    }

    console.log(
      `Created ${Object.keys(sampleClasses).length} sample Apex classes`,
    );
  }

  /**
   * Create metadata files in the metadata volume
   */
  private createMetadataFiles(): void {
    console.log('Creating metadata files...');

    const metadataFiles = {
      'package.xml': `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>AccountService</members>
        <members>ContactService</members>
        <members>Helper</members>
        <name>ApexClass</name>
    </types>
    <version>58.0</version>
</Package>`,
      'destructiveChanges.xml': `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>OldClass</members>
        <name>ApexClass</name>
    </types>
    <version>58.0</version>
</Package>`,
      'profiles/Admin.profile': `<?xml version="1.0" encoding="UTF-8"?>
<Profile xmlns="http://soap.sforce.com/2006/04/metadata">
    <classAccesses>
        <apexClass>AccountService</apexClass>
        <enabled>true</enabled>
    </classAccesses>
    <classAccesses>
        <apexClass>ContactService</apexClass>
        <enabled>true</enabled>
    </classAccesses>
</Profile>`,
    };

    for (const [fileName, content] of Object.entries(metadataFiles)) {
      this.fs.writeFile(`metadata://${fileName}`, content);
    }

    console.log(`Created ${Object.keys(metadataFiles).length} metadata files`);
  }

  /**
   * Create configuration files in the config volume
   */
  private createConfigurationFiles(): void {
    console.log('Creating configuration files...');

    const configFiles = {
      'sfdx-project.json': `{
  "packageDirectories": [
    {
      "path": "force-app/main/default",
      "default": true
    }
  ],
  "namespace": "",
  "sfdcLoginUrl": "https://login.salesforce.com",
  "sourceApiVersion": "58.0"
}`,
      '.forceignore': `# LWC configuration files
**/jsconfig.json
**/.eslintrc.json

# LWC Jest
**/__tests__/**/*.js

# LWC coverage
**/coverage/**/*.js

# LWC static resources
**/staticresources/**/*.js`,
      'vscode/settings.json': `{
  "salesforcedx-vscode-apex.enable-semantic-errors": true,
  "salesforcedx-vscode-apex.enable-sobject-intellisense": true,
  "salesforcedx-vscode-lightning.enable-sobject-intellisense": true
}`,
    };

    for (const [fileName, content] of Object.entries(configFiles)) {
      this.fs.writeFile(`config://${fileName}`, content);
    }

    console.log(
      `Created ${Object.keys(configFiles).length} configuration files`,
    );
  }

  /**
   * Create temporary build files in the temp volume
   */
  private createBuildFiles(): void {
    console.log('Creating temporary build files...');

    const buildFiles = {
      'build.log': `[INFO] Build started at ${new Date().toISOString()}
[INFO] Compiling Apex classes...
[INFO] AccountService.cls - Compilation successful
[INFO] ContactService.cls - Compilation successful
[INFO] Helper.cls - Compilation successful
[INFO] Build completed successfully`,
      'coverage.json': `{
  "AccountService": {
    "lines": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    "covered": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    "percentage": 100
  },
  "ContactService": {
    "lines": [1, 2, 3, 4, 5, 6, 7],
    "covered": [1, 2, 3, 4, 5, 6, 7],
    "percentage": 100
  }
}`,
      'cache/compilation-cache.json': `{
  "lastCompilation": "${new Date().toISOString()}",
  "compiledClasses": ["AccountService", "ContactService", "Helper"],
  "dependencies": {
    "AccountService": ["System", "Database"],
    "ContactService": ["System", "Database"],
    "Helper": ["System"]
  }
}`,
    };

    for (const [fileName, content] of Object.entries(buildFiles)) {
      this.fs.writeFile(`temp://${fileName}`, content);
    }

    console.log(
      `Created ${Object.keys(buildFiles).length} temporary build files`,
    );
  }

  /**
   * Demonstrate file operations across volumes
   */
  public demonstrateOperations(): void {
    console.log('\n=== Demonstrating File Operations ===');

    // List files in different volumes
    console.log('\nFiles in apex volume:');
    const apexFiles = this.fs.readdir('apex://');
    console.log(apexFiles);

    console.log('\nFiles in metadata volume:');
    const metadataFiles = this.fs.readdir('metadata://');
    console.log(metadataFiles);

    // Read and display file contents
    console.log('\nReading AccountService.cls:');
    const accountServiceContent = this.fs.readFile('apex://AccountService.cls');
    console.log(accountServiceContent);

    // Demonstrate file copying within same volume
    console.log('\nCopying AccountService.cls to AccountServiceBackup.cls...');
    this.fs.copyFile(
      'apex://AccountService.cls',
      'apex://AccountServiceBackup.cls',
    );
    console.log('Copy completed');

    // Demonstrate cross-volume operations (should fail)
    console.log('\nAttempting to copy across volumes (should fail):');
    try {
      this.fs.copyFile(
        'apex://AccountService.cls',
        'metadata://AccountService.cls',
      );
    } catch (error) {
      console.log('Expected error:', error.message);
    }

    // Demonstrate read-only volume protection
    console.log(
      '\nAttempting to write to read-only stdlib volume (should fail):',
    );
    try {
      this.fs.writeFile('stdlib://test.cls', 'test content');
    } catch (error) {
      console.log('Expected error:', error.message);
    }
  }

  /**
   * Demonstrate volume management features
   */
  public demonstrateVolumeManagement(): void {
    console.log('\n=== Demonstrating Volume Management ===');

    // Get statistics
    const stats = this.fs.getStatistics();
    console.log('\nVolume Statistics:');
    for (const [protocol, stat] of Object.entries(stats)) {
      console.log(`${protocol}: ${stat.files} files, ${stat.size} bytes`);
    }

    // Export specific volume
    console.log('\nExporting apex volume:');
    const apexExport = this.fs.exportToJSON('apex');
    console.log(
      `Exported ${Object.keys(apexExport.apex).length} files from apex volume`,
    );

    // List all registered protocols
    console.log('\nRegistered protocols:');
    const protocols = this.fs.getRegisteredProtocols();
    console.log(protocols);
  }

  /**
   * Demonstrate integration with ResourceLoader
   */
  public demonstrateResourceLoaderIntegration(): void {
    console.log('\n=== Demonstrating ResourceLoader Integration ===');

    // Check if standard library classes are accessible
    const stdlibFiles = this.fs.readdir('stdlib://');
    console.log(`\nStandard library classes available: ${stdlibFiles.length}`);

    // Read a standard library class
    if (stdlibFiles.length > 0) {
      const firstClass = stdlibFiles[0];
      console.log(`\nReading ${firstClass}:`);
      const content = this.fs.readFile(`stdlib://${firstClass}`);
      console.log(`Content length: ${content.length} characters`);
      console.log(`First 100 characters: ${content.substring(0, 100)}...`);
    }

    // Compare with ResourceLoader
    console.log('\nComparing with ResourceLoader:');
    const resourceLoaderClasses = this.resourceLoader.getAvailableClasses();
    console.log(`ResourceLoader has ${resourceLoaderClasses.length} classes`);
    console.log(`MultiVolume stdlib has ${stdlibFiles.length} classes`);
  }

  /**
   * Run the complete demonstration
   */
  public async run(): Promise<void> {
    console.log('=== MultiVolumeFileSystem Demonstration ===\n');

    await this.initialize();
    this.demonstrateOperations();
    this.demonstrateVolumeManagement();
    this.demonstrateResourceLoaderIntegration();

    console.log('\n=== Demonstration Complete ===');
  }

  /**
   * Get the file system instance for external use
   */
  public getFileSystem(): MultiVolumeFileSystem {
    return this.fs;
  }
}

// Example usage
if (require.main === module) {
  const example = new MultiVolumeExample();
  example.run().catch(console.error);
}
